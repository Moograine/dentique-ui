import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../environments/environment';
import { CountyModel } from '../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private countiesURL = 'assets/files/counties.json';

  constructor(private http: HttpClient) { }

  getCounties(): Observable<string[]> {
    return <Observable<string[]>>this.http.get(`${Environment.defaultApi}/counties.json`);
  }
}
