import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Environment } from '../environments/environment';
import { CountryCode, CountryCodeModel } from '../models/location.model';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  countryCodes: CountryCodeModel[] = [];
  selectedCountryCode: CountryCodeModel = new CountryCode();

  constructor(private http: HttpClient) {
  }

  getCounties(): Observable<string[]> {
    return <Observable<string[]>>this.http.get(`${Environment.defaultApi}/counties.json`);
  }

  getCountryCodes(): Observable<CountryCodeModel[]> {
    if (!this.countryCodes.length) {
      return this.http.get<CountryCodeModel[]>(`${Environment.defaultApi}/countries.json`)
        .pipe(
          tap((countryCodes: CountryCodeModel[]): void => {
            this.countryCodes = countryCodes;
            this.selectedCountryCode = new CountryCode( { ...countryCodes[178] });
          })
        );
    } else {
      return of(this.countryCodes);
    }
  }
}
