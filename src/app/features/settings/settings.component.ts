import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DoctorService } from '../../core/services/doctor.service';
import { CurrencyOptionModel, CurrencyType, LanguageModel, SearchOptionModel } from '../../core/models/settings.model';
import { PrimeNGConfig } from 'primeng/api';
import { catchError, filter, switchMap, take, takeWhile } from 'rxjs';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { ComponentType, ErrorLog } from '../../core/models/maintenance.model';
import { Router } from '@angular/router';
import { ServiceListService } from '../../core/services/services-list.service';
import { Notation } from '../../core/models/tooth.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent implements OnInit, OnDestroy {
  activeComponent = true;
  languageOptions: LanguageModel[] = [
    { language: 'English', code: 'en' },
    { language: 'Hungarian', code: 'hu' },
    { language: 'Romanian', code: 'ro' },
    { language: 'German', code: 'de' },
    { language: 'Czech', code: 'cz' },
    { language: 'Spanish', code: 'es' },
    { language: 'Polish', code: 'pl' },
    { language: 'Serbian', code: 'rs' },
    { language: 'Ukrainian', code: 'ua' },
  ];
  selectedLanguage: LanguageModel = {
    language: 'English', code: 'en'
  }
  themeOptions = ['Dark'];
  selectedTheme = 'Dark';
  notationSystemOptions = ['FDI', 'UNS'];
  selectedNotationSystem: Notation = 'FDI'; /* Default notation system in Europe. */
  defaultSearchOptions: SearchOptionModel[] = [
    {
      option: 'phone',
      icon: 'pi-phone'
    },
    {
      option: 'name',
      icon: 'pi-user'
    }
  ];
  selectedDefaultSearch: SearchOptionModel = {
    option: 'phone',
    icon: 'pi-phone'
  };
  currencyOptions: CurrencyType[] = [
    'eur',
    'usd',
    'huf',
    'ron',
    'rsd',
    'uah',
    'czk',
    'pln'
  ];
  selectedCurrencyOption: CurrencyType = 'eur';

  constructor(private translateService: TranslateService,
              private doctorService: DoctorService,
              private primeConfig: PrimeNGConfig,
              private router: Router,
              private servicesListService: ServiceListService,
              private maintenanceService: MaintenanceService) {
  }

  ngOnInit() {
    this.initializeLanguage();
    this.initializeNotationSystem();
    this.initializePreferredCurrency();
  }

  /** Function to initialize the notation system based on the doctor's settings **/
  initializeNotationSystem(): void {
    this.doctorService.notationSystemFetch().pipe(
      filter((notationSystem: Notation) => notationSystem.length > 0), /* Ensure only non-empty values pass through */
      take(2), /* First emitted value is the default value, which in this case is a non-empty string, so filter wil let it pass */
      takeWhile(() => this.activeComponent)
    ).subscribe((notation: Notation) => {
      this.selectedNotationSystem = notation;
    });
  }

  /** Function to initialize the preferred currency based on the doctor's settings **/
  initializePreferredCurrency(): void {
    this.doctorService.currencyFetch().pipe(
      filter((currency: CurrencyType) => currency.length > 0), /* Ensure only non-empty values pass through */
      take(2), /* First emitted value is the default value, which in this case is a non-empty string, so filter wil let it pass */
      takeWhile(() => this.activeComponent)).subscribe((currency: CurrencyType) => {
      this.selectedCurrencyOption = currency;
    });
  }

  /** Function for initializing the application with the default language **/
  initializeLanguage(): void {
    const currentLanguage = this.translateService.currentLang;
    for (let language of this.languageOptions) {
      if (language.code === currentLanguage) {
        this.selectedLanguage = language;
        return;
      }
    }
  }

  /** Function which takes a language argument and translates the application to the given language **/
  changeLanguage(language: LanguageModel): void {
    this.translateService.setDefaultLang(language.code);
    this.translateService.use(language.code);
    this.translateService.get('primeng').pipe(
      take(1),
      catchError(error => {
        const errorLog = new ErrorLog('Error while fetching translations for PrimeNG.', error, ComponentType.settings, '81');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    ).subscribe(primengTranslations => {
      this.primeConfig.setTranslation(primengTranslations);

      /* Make sure the list of available services are translated for the tooth viewer component, when accessed
      after the change of language. Also, the setTimeout is for covering the processing time of the new language set-up */
      setTimeout(() => {
        const availableServices = this.servicesListService.getAvailableServicesSubjectValue();
        const translatedServices = this.servicesListService.mapAvailableServices(availableServices, 'fetch');
        this.servicesListService.updateAvailableServicesSubject(translatedServices);
      });
    });
  }

  /** Function to change the default notation system **/
  changeNotationSystem(notationSystem: Notation): void {
    this.doctorService.setNotationSystem(notationSystem);
  }

  /** Function to change the preferred currency **/
  changePreferredCurrency(currency: CurrencyType): void {
    this.doctorService.setPreferredCurrency(currency);
  }

  /** Function to navigate to the treatment table component **/
  navigateToServicesTable(): void {
    this.router.navigate(['services-table']).then();
  }

  ngOnDestroy() {
    this.activeComponent = false;
  }
}
