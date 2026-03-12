import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient, PatientSchema } from './patient.schema';
import { ClinicalNote, ClinicalNoteSchema } from './clinical-note.schema';
import {
  PatientDocument,
  PatientDocumentSchema,
} from './patient-document.schema';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: ClinicalNote.name, schema: ClinicalNoteSchema },
      { name: PatientDocument.name, schema: PatientDocumentSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
