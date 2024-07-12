import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, tap, throwError } from 'rxjs';
import { Environment } from '../environments/environment';
import {
  Appointment, AppointmentCollection,
  AppointmentCollectionModel, AppointmentFilter, AppointmentFilterModel,
  AppointmentModel
} from '../models/appointment.model';
import { formatDate } from '@angular/common';
import { ComponentType, ErrorLog, ErrorLogModel } from '../models/maintenance.model';

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

    const ISODateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
    return ISODateTime.replace(/[:.]/g, match => match === ':' ? '_' : 'M');

    //return date.toISOString().replace(/[:.]/g, match => match === ':' ? '_' : 'M');
  }

  /** Our Firebase Realtime Database stores every date in UTC format, so the price of having consistent dates
   * displayed in the UI and also saved in the database, is making sure we do a convertDate operation
   * before any save operation and also after any fetch operation. To understand the issue better,
   * here's a practical example, which was a previous problem before this implementation:
   * The user enters the application from Romania, and creates an Appointment for 2024, April 25, 8:00 in the morning.
   * As the data is saved, Firebase will convert this date to UTC format, and it will look like this: '2024-04-25T05:00:00M000Z',
   * where the hour of the appointment is actually 5:00 in the morning. To make sure the data is consistent across the application and the database,
   * these conversions were implemented, as a counter-measure. To continue with this example, where the difference is 3 hours,
   * before saving an appointment, the date will be converted to the same date, but 3 hours later,
   * so when Firebase receives the date and saves it 3 hours earlier [due to the UTC format], the saved date will be the actualized date.
   * For the fetching operation, we do the opposite: as soon as the date is fetched in UTC format from Firebase, we'll convert it to local time.
   * Thank you for reading my novel */
  convertDate(date: Date, operation: 'fetch' | 'save'): Date {
    /* When fetching any date from our Firebase Realtime Database, the date is formatted in UTC,
    so using a new Date() operation is not enough on its own to get a correct local date. */
    if (operation === 'fetch') {
      return new Date(new Date(date).getTime() + (new Date().getTimezoneOffset() * 60000));
    }

    return new Date(new Date(date).getTime() - (new Date().getTimezoneOffset() * 60000));
  }

  mapAppointments(appointments: AppointmentCollectionModel): AppointmentCollection {
    if (!appointments) {
      return {};
    }

    const mappedAppointments = new AppointmentCollection({ ...appointments });
    for (let [key, value] of Object.entries(mappedAppointments)) {
      value.date = this.convertDate(value.date, 'fetch');
      mappedAppointments[key] = new Appointment(value);
    }

    return mappedAppointments;
  }

  getAppointments(): Observable<AppointmentCollectionModel> {
    /* Get all appointments starting from today */
    // TODO change to const
    let today = formatDate(new Date(), 'yyyy-MM-dd', 'en-us');
    today = '2000-02-12';

    return <Observable<AppointmentCollectionModel>>this.http.get<AppointmentCollectionModel>(
      `${Environment.defaultAPI}/appointments.json?orderBy="$key"&startAt="${today}"`
    ).pipe(
      map((appointments: AppointmentCollectionModel) => this.mapAppointments(appointments)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching appointments.', error, ComponentType.appointmentService, '57');
        return throwError(() => errorLog);
      })
    );
  }

  filterAppointmentsByDate(filter: AppointmentFilterModel): void {
    this.appointmentFilter.next(filter);
  }

  getAppointmentsByDate(date: string): Observable<AppointmentCollectionModel> {
    return <Observable<AppointmentCollectionModel>>this.http.get<AppointmentCollectionModel>(
      `${Environment.defaultAPI}/appointments.json?orderBy="date"&startAt="${date}"&endAt="${date}\uf8ff"`
    ).pipe(
      map((appointments: AppointmentCollectionModel) => this.mapAppointments(appointments)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while filtering appointments by date.', error, ComponentType.appointmentService, '72');
        return throwError(() => errorLog);
      })
    );
  }

  getAppointmentsByPhone(phone: string): Observable<AppointmentCollectionModel> {
    return <Observable<AppointmentCollectionModel>>this.http.get<AppointmentCollectionModel>(
      `${Environment.defaultAPI}/appointments.json?orderBy="phone"&startAt="${phone}"&endAt="${phone}\uf8ff"`
    ).pipe(
      map((appointments: AppointmentCollectionModel) => this.mapAppointments(appointments)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while filtering appointments by phone.', error, ComponentType.appointmentService, '83');
        return throwError(() => errorLog);
      })
    );
  }

  getAppointmentsByName(name: string, reversed: boolean = false): Observable<AppointmentCollectionModel> {
    const queryAttribute = 'searchKeyName' + (reversed ? 'Reversed' : '');
    return <Observable<AppointmentCollectionModel>>this.http.get<AppointmentCollectionModel>(
      `${Environment.defaultAPI}/appointments.json?orderBy="${queryAttribute}"&startAt="${name}"&endAt="${name}\uf8ff"`
    ).pipe(
      map((appointments: AppointmentCollectionModel) => this.mapAppointments(appointments)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while filtering appointments by name.', error, ComponentType.appointmentService, '95');
        return throwError(() => errorLog);
      })
    );
  }

  deleteAppointment(appointmentId: string): Observable<AppointmentModel> {
    return <Observable<AppointmentModel>>this.http.delete<AppointmentModel>(`${Environment.defaultAPI}/appointments/${appointmentId}.json`).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while deleting appointment.', error, ComponentType.appointmentService, '104');
        return throwError(() => errorLog);
      })
    );
  }

  saveAppointment(appointment: Appointment, appointmentId: string): Observable<AppointmentModel> {
    const processedAppointment = new Appointment(appointment);
    processedAppointment.date = this.convertDate(appointment.date, 'save');
    return <Observable<AppointmentModel>>this.http.put<AppointmentModel>(
      `${Environment.defaultAPI}/appointments/${appointmentId}.json`, processedAppointment
    ).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while saving appointment.', error, ComponentType.appointmentService, '115');
        return throwError(() => errorLog);
      })
    );
  }
}
