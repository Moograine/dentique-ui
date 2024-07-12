import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { Environment } from '../environments/environment';
import { ComponentType, ErrorLog, ErrorLogModel } from '../models/maintenance.model';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  constructor(private http: HttpClient) {
  }

  sendErrorLog(error: ErrorLog): Observable<ErrorLogModel> {
    return <Observable<ErrorLogModel>>this.http.post<ErrorLogModel>(`${Environment.defaultAPI}/errors.json`, error).pipe(
      switchMap(() => throwError(error)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while registering external error log.', error, ComponentType.maintenanceService, '18');
        return throwError(() => errorLog);
      })
    );
  }
}
