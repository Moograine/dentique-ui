import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Environment } from '../environments/environment';
import { Appointment, AppointmentCollection, AppointmentCollectionModel, AppointmentModel } from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})

export class AppointmentService {
  constructor(private http: HttpClient) {
  }

  getAppointments(): Observable<AppointmentCollectionModel> {
    return <Observable<AppointmentCollectionModel>>this.http.get<AppointmentCollectionModel>(`${Environment.defaultApi}/appointments.json`)
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

  saveAppointment(appointmentCollection: AppointmentModel[], key: string): Observable<AppointmentModel> {
    return <Observable<AppointmentModel>>this.http.put(`${Environment.defaultApi}/appointments/${key}.json`, appointmentCollection);
  }

  updateAppointment(appointment: AppointmentModel, key: string, appointmentId: number): Observable<AppointmentModel> {
    return <Observable<AppointmentModel>>this.http.put(`${Environment.defaultApi}/appointments/${key}/${appointmentId}.json`, appointment);
  }
}
