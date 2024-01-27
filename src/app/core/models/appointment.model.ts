export interface AppointmentCollectionModel {
  [key: string]: AppointmentModel[];
}

export interface AppointmentModel {
  firstName: string;
  lastName: string;
  phone: string;
  patientId: string;
  cabinetNumber: string;
  date: Date;
  description: string;
}

export class AppointmentCollection implements AppointmentCollectionModel {
  [key: string]: AppointmentModel[];

  constructor(initialData: AppointmentCollectionModel = {}) {
    Object.assign(this, initialData);
  }
}

export class Appointment implements AppointmentModel {
  firstName = '';
  lastName = '';
  phone = '';
  patientId = '';
  cabinetNumber = '';
  date = new Date();
  description = '';

  constructor(appointment: Partial<AppointmentModel> = {}) {
    /* Firebase Database works with specific string formatting for date values. We'll convert them to type Date. */
    if (appointment.date) {
      appointment.date = new Date(appointment.date);
    }

    Object.assign(this, appointment);
  }
}
