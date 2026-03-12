import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Patient, PatientDocument } from './patient.schema';
import { ClinicalNote, ClinicalNoteDocument } from './clinical-note.schema';
import {
  PatientDocument as PatientDoc,
  PatientDocumentDoc,
} from './patient-document.schema';
import {
  CreatePatientDto,
  UpdatePatientDto,
  AddClinicalNoteDto,
  AddDocumentDto,
} from './dto/patient.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  Appointment,
  AppointmentDocument,
} from '../appointments/appointment.schema';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    @InjectModel(ClinicalNote.name)
    private clinicalNoteModel: Model<ClinicalNoteDocument>,
    @InjectModel(PatientDoc.name)
    private patientDocModel: Model<PatientDocumentDoc>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
  ) {}

  // ─── Patient ID Generation ─────────────────────────────────────────────────
  /**
   * Auto-generates unique patient ID per tenant in format:
   * TenantPrefix-YYYY-NNNN (e.g. CLN-2024-0001)
   */
  private async generatePatientId(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.patientModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
    } as any);
    const seq = String(count + 1).padStart(4, '0');
    return `CLN-${year}-${seq}`;
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  async create(
    tenantId: string,
    userId: string,
    dto: CreatePatientDto,
  ): Promise<PatientDocument> {
    const patientId = await this.generatePatientId(tenantId);
    const patient = new this.patientModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      patientId,
      firstVisit: new Date(),
      createdBy: new Types.ObjectId(userId),
    });
    return patient.save();
  }

  async findAll(tenantId: string, pagination: PaginationDto, search?: string) {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (search) {
      // Search by name, phone, or patientId
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
      ];
    }

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.patientModel
        .find(query as any)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.patientModel.countDocuments(query as any),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string): Promise<PatientDocument> {
    const patient = await this.patientModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    } as any);
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  // Find patient by ID only (for use in other services)
  async findById(id: string): Promise<PatientDocument | null> {
    return this.patientModel.findById(id).exec();
  }

  // Search patients for autocomplete (returns limited fields)
  async searchPatients(tenantId: string, query: string): Promise<PatientDocument[]> {
    const searchQuery = {
      tenantId: new Types.ObjectId(tenantId),
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { patientId: { $regex: query, $options: 'i' } },
      ],
    };

    return this.patientModel
      .find(searchQuery as any)
      .select('_id name phone patientId lastVisit')
      .limit(10)
      .exec();
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientDocument> {
    const patient = await this.patientModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      } as any,
      { $set: dto },
      { new: true },
    );
    if (!patient) throw new NotFoundException('Patient not found');
    return patient as unknown as PatientDocument;
  }

  // ─── History & Appointments ─────────────────────────────────────────────────
  async getHistory(tenantId: string, patientId: string) {
    const patient = await this.findOne(tenantId, patientId);
    const notes = await this.clinicalNoteModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        patientId: new Types.ObjectId(patientId),
      } as any)
      .populate('doctorId', 'name email')
      .populate('appointmentId')
      .sort({ createdAt: -1 });

    return { patient, notes };
  }

  async getAppointments(
    tenantId: string,
    patientId: string,
    pagination: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      patientId: new Types.ObjectId(patientId),
    };
    const [data, total] = await Promise.all([
      this.appointmentModel
        .find(query as any)
        .populate('doctorId', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      this.appointmentModel.countDocuments(query as any),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Clinical Notes ─────────────────────────────────────────────────────────
  async addNote(
    tenantId: string,
    patientId: string,
    userId: string,
    dto: AddClinicalNoteDto,
  ): Promise<ClinicalNoteDocument> {
    await this.findOne(tenantId, patientId); // ensure patient exists in tenant

    const note = new this.clinicalNoteModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      patientId: new Types.ObjectId(patientId),
      doctorId: new Types.ObjectId(dto.doctorId),
      ...(dto.appointmentId && {
        appointmentId: new Types.ObjectId(dto.appointmentId),
      }),
    });

    const saved = await note.save();

    // Update patient's lastVisit and totalVisits
    await this.patientModel.updateOne(
      { _id: new Types.ObjectId(patientId) } as any,
      { $set: { lastVisit: new Date() }, $inc: { totalVisits: 1 } },
    );

    return saved;
  }

  async getNotes(
    tenantId: string,
    patientId: string,
    pagination: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      patientId: new Types.ObjectId(patientId),
    };

    const [data, total] = await Promise.all([
      this.clinicalNoteModel
        .find(query as any)
        .populate('doctorId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.clinicalNoteModel.countDocuments(query as any),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateNote(
    tenantId: string,
    patientId: string,
    noteId: string,
    dto: Partial<AddClinicalNoteDto>,
  ): Promise<ClinicalNoteDocument> {
    const note = await this.clinicalNoteModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(noteId),
        tenantId: new Types.ObjectId(tenantId),
        patientId: new Types.ObjectId(patientId),
      } as any,
      { $set: dto },
      { new: true },
    );
    if (!note) throw new NotFoundException('Clinical note not found');
    return note as unknown as ClinicalNoteDocument;
  }

  // ─── Documents ─────────────────────────────────────────────────────────────
  async addDocument(
    tenantId: string,
    patientId: string,
    userId: string,
    dto: AddDocumentDto,
  ): Promise<PatientDocumentDoc> {
    await this.findOne(tenantId, patientId);

    const doc = new this.patientDocModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      patientId: new Types.ObjectId(patientId),
      uploadedBy: new Types.ObjectId(userId),
      ...(dto.appointmentId && {
        appointmentId: new Types.ObjectId(dto.appointmentId),
      }),
    });
    return doc.save();
  }

  async getDocuments(tenantId: string, patientId: string) {
    return this.patientDocModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        patientId: new Types.ObjectId(patientId),
      } as any)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
  }
}
