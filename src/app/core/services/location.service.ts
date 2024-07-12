import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable } from 'rxjs';
import { Environment } from '../environments/environment';
import { CountryCodeModel, CountryCodeSubject, CountryCodeSubjectModel } from '../models/location.model';
import { MaintenanceService } from './maintenance.service';
import { ComponentType, ErrorLog, ErrorLogModel } from '../models/maintenance.model';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  countryCodeSubject: BehaviorSubject<CountryCodeSubjectModel> = new BehaviorSubject<CountryCodeSubjectModel>(new CountryCodeSubject());

  constructor(private http: HttpClient, private maintenanceService: MaintenanceService) {
  }

  countryCodeFetch(): Observable<CountryCodeSubjectModel> {
    return <Observable<CountryCodeSubjectModel>>this.countryCodeSubject.pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while listening to the countryCodeSubject changes', error, ComponentType.location, '21');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  getCounties(): Observable<string[]> {
    return <Observable<string[]>>this.http.get<string[]>(`${Environment.defaultAPI}/counties.json`).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching the list of counties', error, ComponentType.location, '30');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  getCountryCodes(): Observable<CountryCodeModel[]> {
    return <Observable<CountryCodeModel[]>>this.http.get<CountryCodeModel[]>(`${Environment.defaultAPI}/countries.json`).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching the list of country codes', error, ComponentType.location, '39');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }
}
