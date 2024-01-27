import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Patient, PatientModel } from '../models/patient.model';
import { Environment } from '../environments/environment';
import { PreviousCare, Tooth } from '../models/tooth.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  activePatient: PatientModel = new Patient();

  constructor(private http: HttpClient) {
  }

  getPatients(): Observable<PatientModel[]> {
    return this.http.get<PatientModel[]>(`${Environment.defaultApi}/patients.json`)
      .pipe(
        map((data: PatientModel[]) => data
          .map(patient => new Patient({
            ...patient,
            toothChart: patient.toothChart.map(tooth => new Tooth({
              ...tooth,
              previousCares: tooth?.previousCares?.map(previousCare => new PreviousCare(previousCare)) || []
            }))
          })))
      );
  }

  savePatient(patientData: any): Observable<any> {
    // TODO change observable & patientData type
    return this.http.put(`url`, patientData);
  }
}
