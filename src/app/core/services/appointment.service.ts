import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Environment } from '../environments/environment';
import {
  Appointment,
  AppointmentCollection, AppointmentCollection2,
  AppointmentCollectionModel,
  AppointmentCollectionModel2, AppointmentFilter, AppointmentFilterModel,
  AppointmentModel
} from '../models/appointment.model';
import { formatDate } from '@angular/common';

@Injectable({
  providedIn: 'root'
})

export class AppointmentService {
  appointmentFilter: BehaviorSubject<AppointmentFilterModel> = new BehaviorSubject<AppointmentFilterModel>(new AppointmentFilter());

  constructor(private http: HttpClient) {
  }

  /** Returns a string, or an appointmentId which will represent the object key in the appointment database.
   *  Converts the date of the appointment to ISOString format, then replaces invalid path characters ':' and '.' to '_' and 'M'. */
  generateAppointmentId(date: Date): string {
    if (!date) {
      date = new Date();
    }

    return date.toISOString().replace(/[:.]/g, match => match === ':' ? '_' : 'M');
  }

  getAppointments(): Observable<AppointmentCollectionModel> {
    /* Get all appointments starting from today */

    const today = formatDate(new Date(), 'yyyy-MM-dd', 'en-us');

    return <Observable<AppointmentCollectionModel>>this.http.get<AppointmentCollectionModel>(`${Environment.defaultApi}/appointments.json?orderBy="$key"&startAt="${today}"`)
      .pipe(
        map((appointments: AppointmentCollectionModel) => {
          if (!appointments) {
            return null;
          }

          const mappedAppointments = new AppointmentCollection({ ...appointments });
          for (let [key, value] of Object.entries(appointments)) {
            for (let index = 0; index < value.length; index++) {
              value[index] = new Appointment(value[index]);
            }

            mappedAppointments[key] = value;
          }
          return mappedAppointments;
        })
      );
  }

  getAppointments2(): Observable<AppointmentCollectionModel2> {
    /* Get all appointments starting from today */
    // TODO change to const
    let today = formatDate(new Date(), 'yyyy-MM-dd', 'en-us');
    today = '2000-02-12';

    return <Observable<AppointmentCollectionModel2>>this.http.get<AppointmentCollectionModel2>(`${Environment.defaultApi}/appointments2.json?orderBy="$key"&startAt="${today}"`)
      .pipe(
        map((appointments: AppointmentCollectionModel2) => {
          if (!appointments) {
            return null;
          }

          const mappedAppointments = new AppointmentCollection2({ ...appointments });
          for (let [key, value] of Object.entries(mappedAppointments)) {
            mappedAppointments[key] = new Appointment(value);
          }

          return mappedAppointments;

        })
      );
  }

  filterAppointmentsByDate(filter: AppointmentFilterModel): void {
    this.appointmentFilter.next(filter);
  }

  getAppointmentsByDate2(date: string): Observable<AppointmentCollectionModel2> {
    return <Observable<AppointmentCollectionModel2>>this.http
      .get(`${Environment.defaultApi}/appointments2.json?orderBy="date"&startAt="${date}"&endAt="${date}\uf8ff"`);
  }

  getAppointmentsByDate(date: string): Observable<Appointment[]> {
    return <Observable<Appointment[]>>this.http.get(`${Environment.defaultApi}/appointments2/${date}.json`);
  }

  getAppointmentsByPhone(phone: string): Observable<AppointmentCollectionModel2> {
    return <Observable<AppointmentCollectionModel2>>this.http
      .get(`${Environment.defaultApi}/appointments2.json?orderBy="phone"&startAt="${phone}"&endAt="${phone}\uf8ff"`);
  }

  getAppointmentsByName(name: string, reversed: boolean = false): Observable<AppointmentCollectionModel2> {
    const queryAttribute = 'searchKeyName' + (reversed ? 'Reversed' : '');
    return this.http.get<AppointmentCollectionModel2>(
      `${Environment.defaultApi}/appointments2.json?orderBy="${queryAttribute}"&startAt="${name}"&endAt="${name}\uf8ff"`);
  }

  deleteAppointment2(appointmentId: string): Observable<AppointmentModel> {
    return <Observable<AppointmentModel>>this.http.delete(`${Environment.defaultApi}/appointments2/${appointmentId}.json`);
  }

  saveAppointment(appointmentCollection: AppointmentModel[], key: string): Observable<AppointmentModel> {
    return <Observable<AppointmentModel>>this.http.put(`${Environment.defaultApi}/appointments/${key}.json`, appointmentCollection);
  }

  saveAppointment2(appointment: AppointmentModel, appointmentId: string): Observable<AppointmentModel> {
    return <Observable<AppointmentModel>>this.http.put(`${Environment.defaultApi}/appointments2/${appointmentId}.json`, appointment);
  }

  updateAppointment(appointment: AppointmentModel, key: string, appointmentId: number): Observable<AppointmentModel> {
    return <Observable<AppointmentModel>>this.http.put(`${Environment.defaultApi}/appointments/${key}/${appointmentId}.json`, appointment);
  }
}
