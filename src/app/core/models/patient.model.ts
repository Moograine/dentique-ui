import { ToothModel } from './tooth.model';

export interface PatientIdCollectionModel {
  [key: string]: boolean;
}

export interface PatientCollectionModel {
  [key: string]: PatientModel
}

export interface PatientModel {
  firstName: string;
  lastName: string;
  phone: string;
  PIN: string;
  birthdate: Date;
  age: string;
  sex: string;
  email: string;
  county: string;
  town: string;
  address: string;
  allergies: string[];
  previousSurgeries: string[];
  chronicDiseases: string[];
  familyHealthHistory: string[];
  toothChart: ToothModel[];
  searchKeyName: string;
  searchKeyNameReversed: string;
}

export type PatientDetails = 'previousSurgeries' | 'allergies' | 'familyHealthHistory' | 'chronicDiseases';

export interface PatientXRayFileModel {
  file: File,
  date: Date
}

export class PatientXRayFile implements PatientXRayFileModel {
  file: File = new File([''], '');
  date: Date = new Date();

  constructor(file: File, date: Date) {
    this.file = file;
    this.date = date;
  }
}

export class Patient implements PatientModel {
  firstName = '';
  lastName = '';
  phone = '';
  PIN = '';
  birthdate = new Date();
  age = '';
  sex = '';
  email = '';
  county = '';
  town = '';
  address = '';
  allergies = [];
  previousSurgeries = [];
  chronicDiseases = [];
  familyHealthHistory = [];
  toothChart: ToothModel[] = [];
  searchKeyName = '';
  searchKeyNameReversed = '';

  constructor(patientData: Partial<PatientModel> = {}) {
    /* Firebase Database works with specific string formatting for date values. We'll convert them to type Date */
    if (patientData.birthdate) {
      patientData.birthdate = new Date(patientData.birthdate);
    }

    Object.assign(this, patientData);

    /* Save patient first and last names in composite variables, for a better search engine */
    if (patientData.firstName?.length && patientData.lastName?.length) {
      const firstName = patientData.firstName
        .replace(/ /g, '')
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      const lastName = patientData.lastName
        .replace(/ /g, '')
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      this.searchKeyName = firstName + lastName;
      this.searchKeyNameReversed = lastName + firstName;
    }
  }
}


