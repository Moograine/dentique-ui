import { SearchType } from './settings.model';

export type ResolveConflictOptions = '' | 'overrideAppointment' | 'overridePatient';

export interface ConflictDetailsModel {
  patientFirstName: string;
  patientLastName: string;
}

export interface AppointmentFilterModel {
  type: SearchType;
  value: string;
}

export interface AppointmentGroupModel {
  [key: string]: AppointmentModel[];
}

export interface AppointmentCollectionModel {
  [key: string]: AppointmentModel;
}

export class AppointmentCollection implements AppointmentCollectionModel {
  [key: string]: AppointmentModel;

  constructor(initialData: AppointmentCollectionModel = {}) {
    Object.assign(this, initialData);
  }
}

export interface AppointmentModel {
  firstName: string;
  lastName: string;
  phone: string;
  cabinetNumber: string;
  doctor: string;
  date: Date;
  description: string;
  searchKeyName: string;
  searchKeyNameReversed: string;
}

export class AppointmentFilter implements AppointmentFilterModel {
  type: SearchType = 'phone';
  value: string = '';

  constructor(type: SearchType = 'phone', value: string = '') {
    this.type = type;
    this.value = value;
  }
}

export class AppointmentGroup implements AppointmentGroupModel {
  [key: string]: AppointmentModel[];

  constructor(initialData: AppointmentGroupModel = {}) {
    Object.assign(this, initialData);
  }
}

export class Appointment implements AppointmentModel {
  firstName = '';
  lastName = '';
  phone = '';
  cabinetNumber = '';
  doctor = '';
  date = new Date();
  description = '';
  searchKeyName = '';
  searchKeyNameReversed = '';

  constructor(appointment: Partial<AppointmentModel> = {}) {
    /* Firebase Database works with specific string formatting for date values. We'll convert them to type Date. */
    if (appointment.date) {
      appointment.date = new Date(appointment.date);
    }

    Object.assign(this, appointment);

    /* Save patient first and last names in composite variables, for a better search engine */
    if (appointment.firstName?.length && appointment.lastName?.length) {
      const firstName = appointment.firstName
        .replace(/ /g, '')
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      const lastName = appointment.lastName
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
