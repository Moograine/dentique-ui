import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, Observable } from 'rxjs';
import { Environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class InternetConnectionService {
  constructor(private http: HttpClient) {}

  checkInternetConnection(): Observable<boolean> {
    return <Observable<boolean>>this.http.get(`${Environment.defaultApi}/patients.json`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
