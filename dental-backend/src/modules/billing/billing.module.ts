import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PdfService } from './pdf.service';
import { Invoice, InvoiceSchema } from './invoice.schema';
import { Procedure, ProcedureSchema } from './procedure.schema';
import { AdvancePayment, AdvancePaymentSchema } from './advance-payment.schema';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Procedure.name, schema: ProcedureSchema },
      { name: AdvancePayment.name, schema: AdvancePaymentSchema },
    ]),
    StorageModule,
    NotificationsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, PdfService],
  exports: [BillingService],
})
export class BillingModule {}
