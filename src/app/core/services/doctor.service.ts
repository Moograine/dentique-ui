import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class DoctorService {
  notationSystem: 'FDI' | 'UNS' = 'FDI';

  constructor(private http: HttpClient) {
  }

  /** Preferred notation system for the current doctor. */
  getNotationSystem(): Observable<string> {
    return <Observable<string>>this.http.get(`${Environment.defaultApi}/doctor`);
  }
}
