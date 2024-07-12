import { ServiceTableItem, ServiceTableItemModel } from './services-list.model';

export type DocumentType = 'invoice' | 'receipt' | 'datasheet';
export type ReceiptType = 'regular' | 'antibiotics';

export interface DocumentTypeModel {
  label: DocumentType;
  icon: string;
}

export interface ServiceInvoiceModel {
  service: ServiceTableItemModel;
  date: Date;
  description: string;
  quantity: number;
  toothId: string;
  unregistered: boolean;
}

export class ServiceInvoice implements ServiceInvoiceModel{
  service = new ServiceTableItem();
  date = new Date();
  description = '';
  quantity = 1;
  toothId = '';
  unregistered = false;

  constructor(service: ServiceTableItemModel, date: Date, description: string, toothId: string = '', unregistered: boolean = false) {
    /* Firebase Database works with specific string formatting for date values. We'll convert them to type Date. */
    if (date) {
      this.date = new Date(date);
    }

    this.service = service;
    this.description = description;
    this.toothId = toothId;
    this.unregistered = unregistered;
  }
}
