import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
} from './appointment.schema';
import { DoctorLeave, DoctorLeaveDocument } from './doctor-leave.schema';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  UpdateStatusDto,
  CreateDoctorLeaveDto,
} from './dto/appointment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EmailService } from '../notifications/email.service';
import { PatientsService } from '../patients/patients.service';
import { UsersService } from '../users/users.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(DoctorLeave.name)
    private doctorLeaveModel: Model<DoctorLeaveDocument>,
    private emailService: EmailService,
    private patientsService: PatientsService,
    private usersService: UsersService,
    private tenantService: TenantService,
  ) { }

  // ─── Slot Generation ───────────────────────────────────────────────────────
  /**
   * Returns available time slots for a given doctor on a given date.
   * Slots are generated based on tenant's working hours and filtered
   * against already-booked appointments and doctor leave.
   */
  async getAvailableSlots(
    tenantId: string,
    doctorId: string,
    dateStr: string,
    slotDuration = 30,
  ): Promise<string[]> {
    const date = new Date(dateStr);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Check if doctor is on leave
    const onLeave = await this.doctorLeaveModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      doctorId: new Types.ObjectId(doctorId),
      date: { $gte: dayStart, $lte: dayEnd },
    } as any);
    if (onLeave) return [];

    // Get booked slots for this doctor on this date
    const bookedAppointments = await this.appointmentModel.find({
      tenantId: new Types.ObjectId(tenantId),
      doctorId: new Types.ObjectId(doctorId),
      date: { $gte: dayStart, $lte: dayEnd },
      status: {
        $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      },
    } as any);

    const bookedSlots = new Set(bookedAppointments.map((a) => a.startTime));

    // Generate all slots from 09:00 to 20:00
    const allSlots: string[] = [];
    let hour = 9;
    let minute = 0;
    while (hour < 20) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      allSlots.push(timeStr);
      minute += slotDuration;
      if (minute >= 60) {
        hour += Math.floor(minute / 60);
        minute = minute % 60;
      }
    }

    return allSlots.filter((slot) => !bookedSlots.has(slot));
  }

  // ─── Token Management ───────────────────────────────────────────────────────
  /**
   * Assigns the next sequential token number for a doctor on a given date.
   * Tokens reset daily and are unique per doctor per day.
   */
  private async getNextToken(
    tenantId: string,
    doctorId: string,
    date: Date,
  ): Promise<number> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const lastAppointment = await this.appointmentModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        doctorId: new Types.ObjectId(doctorId),
        date: { $gte: dayStart, $lte: dayEnd },
        tokenNumber: { $exists: true },
      } as any)
      .sort({ tokenNumber: -1 });

    return lastAppointment?.tokenNumber ? lastAppointment.tokenNumber + 1 : 1;
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  async create(
    tenantId: string,
    userId: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const date = new Date(dto.date);

    // Conflict Prevention: check for overlapping appointments
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const conflict = await this.appointmentModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      doctorId: new Types.ObjectId(dto.doctorId),
      date: { $gte: dayStart, $lte: dayEnd },
      startTime: dto.startTime,
      status: {
        $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      },
    } as any);

    if (conflict) {
      throw new ConflictException(
        `Doctor already has an appointment at ${dto.startTime} on this date.`,
      );
    }

    const tokenNumber = await this.getNextToken(tenantId, dto.doctorId, date);

    const appointment = new this.appointmentModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      patientId: new Types.ObjectId(dto.patientId),
      doctorId: new Types.ObjectId(dto.doctorId),
      date,
      tokenNumber,
      createdBy: new Types.ObjectId(userId),
    });

    const savedAppointment = await appointment.save();

    // Send confirmation email to patient
    try {
      await this.sendAppointmentConfirmationEmail(tenantId, savedAppointment);
    } catch (emailError) {
      this.logger.error(`Failed to send confirmation email: ${emailError.message}`);
    }

    return savedAppointment;
  }

  private async sendAppointmentConfirmationEmail(
    tenantId: string,
    appointment: AppointmentDocument,
  ): Promise<void> {
    // Get patient details
    const patient = await this.patientsService.findById(
      appointment.patientId.toString(),
    );
    if (!patient || !patient.email) {
      this.logger.warn(`Patient not found or no email for appointment ${appointment._id}`);
      return;
    }

    // Get doctor details
    const doctor = await this.usersService.findById(
      appointment.doctorId.toString(),
    );
    if (!doctor) {
      this.logger.warn(`Doctor not found for appointment ${appointment._id}`);
      return;
    }

    // Get tenant/clinic details
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      this.logger.warn(`Tenant not found for appointment ${appointment._id}`);
      return;
    }

    // Format date
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Format time
    const [hours, minutes] = appointment.startTime.split(':');
    const startDate = new Date();
    startDate.setHours(parseInt(hours), parseInt(minutes));
    const formattedTime = startDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.emailService.sendAppointmentConfirmation({
      patientName: patient.name,
      patientEmail: patient.email,
      doctorName: doctor.name,
      clinicName: tenant.name,
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
      appointmentType: appointment.type || 'Consultation',
      chiefComplaint: appointment.chiefComplaint,
      tokenNumber: appointment.tokenNumber,
      clinicAddress: tenant.address ? `${tenant.address.street}, ${tenant.address.city}` : undefined,
      clinicPhone: tenant.phone,
    });
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    filters: {
      date?: string;
      doctorId?: string;
      status?: string;
      patientId?: string;
    },
  ) {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filters.date) {
      const day = new Date(filters.date);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    if (filters.doctorId) query.doctorId = new Types.ObjectId(filters.doctorId);
    if (filters.status) query.status = filters.status;
    if (filters.patientId)
      query.patientId = new Types.ObjectId(filters.patientId);

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.appointmentModel
        .find(query as any)
        .populate('patientId', 'name phone patientId')
        .populate('doctorId', 'name email role')
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limit),
      this.appointmentModel.countDocuments(query as any),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAppointmentsForDateRange(
    tenantId: string | null,
    startDateStr: string,
    endDateStr: string,
  ): Promise<AppointmentDocument[]> {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const query: Record<string, unknown> = {
      date: { $gte: startDate, $lte: endDate },
    };

    // Only filter by tenantId if provided
    if (tenantId) {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    return this.appointmentModel
      .find(query as any)
      .populate('patientId', 'name phone email patientId')
      .populate('doctorId', 'name doctorProfile')
      .exec();
  }

  async findOne(tenantId: string, id: string): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      } as any)
      .populate('patientId', 'name phone patientId')
      .populate('doctorId', 'name email role doctorProfile')
      .populate('createdBy', 'name email');

    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      } as any,
      { $set: dto },
      { new: true },
    );
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment as unknown as AppointmentDocument;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateStatusDto,
  ): Promise<AppointmentDocument> {
    const update: Record<string, unknown> = { status: dto.status };
    if (dto.cancelledReason) update.cancelledReason = dto.cancelledReason;

    const appointment = await this.appointmentModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      } as any,
      { $set: update },
      { new: true },
    );
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment as unknown as AppointmentDocument;
  }

  async cancel(
    tenantId: string,
    id: string,
    reason?: string,
  ): Promise<AppointmentDocument> {
    const appointment = await this.appointmentModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      } as any,
      {
        $set: { status: AppointmentStatus.CANCELLED, cancelledReason: reason },
      },
      { new: true },
    );
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment as unknown as AppointmentDocument;
  }

  async getTodayAppointments(tenantId: string) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const appointments = await this.appointmentModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        date: { $gte: dayStart, $lte: dayEnd },
      } as any)
      .populate('patientId', 'name phone patientId')
      .populate('doctorId', 'name email')
      .sort({ doctorId: 1, startTime: 1 });

    // Group by doctor
    const grouped: Record<string, AppointmentDocument[]> = {};
    for (const appt of appointments) {
      const doctorId = appt.doctorId.toString();
      if (!grouped[doctorId]) grouped[doctorId] = [];
      grouped[doctorId].push(appt);
    }
    return grouped;
  }

  // ─── Doctor Leave ──────────────────────────────────────────────────────────
  async createDoctorLeave(
    tenantId: string,
    dto: CreateDoctorLeaveDto,
  ): Promise<DoctorLeaveDocument> {
    const date = new Date(dto.date);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await this.doctorLeaveModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      doctorId: new Types.ObjectId(dto.doctorId),
      date: { $gte: dayStart, $lte: dayEnd },
    } as any);
    if (existing)
      throw new ConflictException(
        'Leave already exists for this doctor on this date',
      );

    const leave = new this.doctorLeaveModel({
      tenantId: new Types.ObjectId(tenantId),
      doctorId: new Types.ObjectId(dto.doctorId),
      date,
      reason: dto.reason,
    });
    return leave.save();
  }

  async getDoctorLeaves(tenantId: string, doctorId?: string) {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
    };
    if (doctorId) query.doctorId = new Types.ObjectId(doctorId);
    return this.doctorLeaveModel
      .find(query as any)
      .populate('doctorId', 'name email')
      .sort({ date: 1 });
  }

  async deleteDoctorLeave(tenantId: string, id: string): Promise<void> {
    const result = await this.doctorLeaveModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    } as any);
    if (!result) throw new NotFoundException('Doctor leave not found');
  }
}
