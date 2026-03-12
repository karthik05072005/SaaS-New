import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from './tenant.schema';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) { }

  async createTenant(clinicName: string, email: string, phone?: string): Promise<TenantDocument> {
    const slug = this.generateSlug(clinicName);
    const tenant = new this.tenantModel({
      name: clinicName,
      slug,
      email,
      phone: phone || '',
      plan: 'FREE',
      settings: {
        workingHours: { start: '09:00', end: '20:00' },
        workingDays: [0, 1, 2, 3, 4, 5],
        appointmentDuration: 30,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
    });
    return tenant.save();
  }

  async findById(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getTenantById(id: string): Promise<TenantDocument> {
    return this.findById(id);
  }

  async findBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ slug } as any).exec();
  }

  async update(id: string, dto: Partial<Tenant>): Promise<TenantDocument> {
    const tenant = await this.tenantModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() +
      '-' +
      Date.now().toString(36)
    );
  }
}
