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
  treatment: string;
  description: string;
  date: Date;
  positionX: number;
  positionY: number;
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
  treatment = '';
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

/**
 * It could be useful to make a dropdown-style treatment list, which could help in the representation of previous cares in the tooth image
 *
 * Dental treatment list:
 *
   * Bridges
   * Crowns
   * Fillings
   * Root Canal Treatment
   * Scale and Polish
   * Braces (Orthodontic Treatment)
   * Wisdom Tooth Removal
   * Dental Implants
   * Dentures or False Teeth
   * Broken or Knocked Out Tooth
   * Teeth Whitening
   * Dental Veneers
 *
 */
