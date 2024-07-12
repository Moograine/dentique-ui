import { ServiceTableItem, ServiceTableItemModel } from './services-list.model';

export type Notation = 'FDI' | 'UNS';

export enum ToothStatus {
  Intact = 'intact',
  Missing = 'missing',
  Implant = 'implant',
}

export interface ToothModel {
  id: number;
  status: ToothStatus,
  previousCares: PreviousCareModel[];
}

export interface DetailedToothNotationModel {
  labelFDI: string;
  labelUNS: string;
  image: string;
}

export interface ToothNotationModel {
  label: string;
  image: string;
}

export interface PreviousCareModel {
  service: ServiceTableItemModel;
  description: string;
  date: Date;
  positionX: number;
  positionY: number;
}

export interface ToothInvoiceModel { // TODO rename!
  labelFDI: string;
  labelUNS: string;
  top: number;
  left: number;
}

export interface ToothMarkModel {
  [key: string]: ToothInvoiceModel;
}

export class Tooth implements ToothModel {
  id = -1;
  status = ToothStatus.Intact;
  previousCares = [];

  constructor(tooth: Partial<ToothModel> = {}) {
    Object.assign(this, tooth);
  }
}

export class ToothNotation implements ToothNotationModel {
  constructor(public label: string = '', public image: string = '') {}
}

export class PreviousCare implements PreviousCareModel {
  service = new ServiceTableItem();
  description = '';
  date = new Date();
  positionX = 50;
  positionY = 50;

  constructor(previousCare: Partial<PreviousCareModel> = {}) {
    /* Firebase Database works with specific string formatting for date values. We'll convert them to type Date. */
    if (previousCare.date) {
      previousCare.date = new Date(previousCare.date);
    }

    Object.assign(this, previousCare);
  }
}
