import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Environment } from '../environments/environment';
import { ComponentType, ErrorLog, ErrorLogModel } from '../models/maintenance.model';
import { MaintenanceService } from './maintenance.service';
import { CurrencyType } from '../models/settings.model';
import { Notation } from '../models/tooth.model';
import { ServiceTableItemModel } from '../models/services-list.model';

@Injectable({
  providedIn: 'root'
})

export class DoctorService {
  notationSystemSubject: BehaviorSubject<Notation> = new BehaviorSubject<Notation>('FDI')
  currencySubject: BehaviorSubject<CurrencyType> = new BehaviorSubject<CurrencyType>('eur');

  constructor(private http: HttpClient, private maintenanceService: MaintenanceService) {
  }

  /** Preferred notation system for the current doctor */
  getNotationSystem(): Observable<Notation> {
    return <Observable<Notation>>this.http.get<Notation>(`${Environment.defaultAPI}/doctor/notationSystem.json`).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching notation system used by doctor.', error, ComponentType.doctorService, '24');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Function to assign notation system to notation system subject when data is fetched successfully **/
  setNotationSystem(notationSystem: Notation): void {
    this.notationSystemSubject.next(notationSystem);
  }

  /** Function to assign preferred currency to currency subject when data is fetched successfully **/
  setPreferredCurrency(currency: CurrencyType): void {
    this.currencySubject.next(currency);
  }

  /** Function which returns an Observable based on the notationSystemSubject */
  notationSystemFetch(): Observable<Notation> {
    return <Observable<Notation>>this.notationSystemSubject.pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while listening to the AllServicesSubject changes', error, ComponentType.doctorService, '48');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Function which returns an Observable based on the currencySubject */
  currencyFetch(): Observable<CurrencyType> {
    return <Observable<CurrencyType>>this.currencySubject.pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while listening to the AllServicesSubject changes', error, ComponentType.doctorService, '58');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Preferred currency for invoicing */
  getPreferredCurrency(): Observable<CurrencyType> {
    return <Observable<CurrencyType>>this.http.get<CurrencyType>(`${Environment.defaultAPI}/doctor/currency.json`).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching preferred currency.', error, ComponentType.doctorService, '34');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }
}
