import { Component, OnDestroy, OnInit } from '@angular/core';
import { InternetConnectionService } from './core/services/internet-connection';
import { PrimeNGConfig } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { LocationService } from './core/services/location.service';
import { CountryCode, CountryCodeModel, CountryCodeSubject } from './core/models/location.model';
import { catchError, filter, take, takeWhile } from 'rxjs';
import { ComponentType, ErrorLog } from './core/models/maintenance.model';
import { MaintenanceService } from './core/services/maintenance.service';
import { ServiceListService } from './core/services/services-list.service';
import { ServiceTableItemModel } from './core/models/services-list.model';
import { PatientService } from './core/services/patient.service';
import { PatientCollectionModel } from './core/models/patient.model';
import { DoctorService } from './core/services/doctor.service';
import { Notation } from './core/models/tooth.model';
import { CurrencyType } from './core/models/settings.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  activeComponent = true;
  isInternetAvailable$ = this.internetConnection.checkInternetConnection();
  defaultLanguage = 'en';

  constructor(private internetConnection: InternetConnectionService,
              private primengConfig: PrimeNGConfig,
              private locationService: LocationService,
              private servicesListService: ServiceListService,
              private patientService: PatientService,
              private doctorService: DoctorService,
              private primeConfig: PrimeNGConfig,
              private maintenanceService: MaintenanceService,
              private translateService: TranslateService) {
  }

  ngOnInit() {
    this.setRippleConfig();
    this.initializeTranslations();
    this.getCountryCodes();
    this.getDentalServices();
    this.initializeNotationSystem();
    this.initializePreferredCurrency();

    /** TODO - Get list of patients in paginated format, as there might be thousands of items **/
    this.getPatientCollection();
  }

  setRippleConfig(): void {
    this.primengConfig.ripple = true;
  }

  /** Function to pre-fetch the list of available services offered by this clinic (availableServices) **/
  getDentalServices(): void {
    this.servicesListService.getAvailableServices().pipe(takeWhile(() => this.activeComponent))
      .subscribe((availableServices: ServiceTableItemModel[]): void => {
        this.servicesListService.updateAvailableServicesSubject(availableServices);
      });
  }

  /** Function to pre-fetch the list of all patients that are accessible by the current user **/
  getPatientCollection(): void {
    this.patientService.getPatientsByPhone('').pipe(takeWhile(() => this.activeComponent))
      .subscribe((patientCollection: PatientCollectionModel): void => {
        this.patientService.populatePatientCollection(patientCollection);
      });
  }

  /** Function to get country codes for displaying the dial code list for every 'phone' field **/
  getCountryCodes(): void {
    this.locationService.getCountryCodes().pipe(take(1)).subscribe((countryCodes: CountryCodeModel[]): void => {
      // TODO implement init on user settings (selectedCountry code should be set based on doctor's preferences)
      // TODO most importantly, research whether it would be better to signal a simple boolean that value was fetched successfully, then assign countryCodes in different components
      const selectedCountryCode = new CountryCode({ ...countryCodes[178] }); /* Default dial code is set to Romania */
      const countryCodeSubjectValue = new CountryCodeSubject(countryCodes, selectedCountryCode);
      this.locationService.countryCodeSubject.next(countryCodeSubjectValue)
    });
  }

  /** Function to initialize language of the application based on current user's settings **/
  initializeTranslations(): void {
    // TODO implement initialization based on user settings
    this.translateService.setDefaultLang(this.defaultLanguage);
    this.translateService.use(this.defaultLanguage);
    this.translateService.get('primeng').pipe(
      take(1),
      catchError(error => {
        const errorLog = new ErrorLog('Error while fetching translations for PrimeNG.', error, ComponentType.app, '55');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    ).subscribe(primengTranslations => this.primeConfig.setTranslation(primengTranslations));
  }

  /** Function to make a request to the database and fetch preferred notation system based on user's settings **/
  initializeNotationSystem(): void {
    this.doctorService.getNotationSystem().pipe(
      filter((notationSystem: Notation) => notationSystem.length > 0), /* Ensure only non-empty values pass through */
      take(1),
      takeWhile(() => this.activeComponent)).subscribe((notationSystem: Notation) => {
      this.doctorService.setNotationSystem(notationSystem);
    });
  }

  /** Function to make a request to the database and fetch preferred currency based on user's settings **/
  initializePreferredCurrency(): void {
    this.doctorService.getPreferredCurrency().pipe(
      filter((currency: CurrencyType) => currency.length > 0), /* Ensure only non-empty values pass through */
      take(1),
      takeWhile(() => this.activeComponent)).subscribe((currency: CurrencyType) => {
      this.doctorService.setPreferredCurrency(currency);
    });
  }

  tryConnection(): void {
    console.log('Reconnecting...');
    // TODO implement retrying
    this.isInternetAvailable$ = this.internetConnection.checkInternetConnection();
  }

  ngOnDestroy() {
    this.activeComponent = false;
  }
}
