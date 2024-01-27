import { ToothModel } from './tooth.model';

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

  constructor(patientData: Partial<PatientModel> = {}) {
    /* Firebase Database works with specific string formatting for date values. We'll convert them to type Date. */
    if (patientData.birthdate) {
      patientData.birthdate = new Date(patientData.birthdate);
    }

    Object.assign(this, patientData);
  }
}

export interface CountyModel {
  name: string;
}


