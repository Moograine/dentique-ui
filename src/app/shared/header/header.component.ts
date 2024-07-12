import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { hamburgerAnimation } from '../../../assets/animations/animations';
import { CountryCode, CountryCodeModel, CountryCodeSubjectModel } from '../../core/models/location.model';
import { LocationService } from '../../core/services/location.service';
import { PatientCollectionModel, PatientModel } from '../../core/models/patient.model';
import { PatientService } from '../../core/services/patient.service';
import { MessageService } from 'primeng/api';
import { DoctorService } from '../../core/services/doctor.service';
import { SearchOptionModel } from '../../core/models/settings.model';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AppointmentService } from '../../core/services/appointment.service';
import { formatDate } from '@angular/common';
import { forkJoin, takeWhile } from 'rxjs';
import { AppointmentFilter } from '../../core/models/appointment.model';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  animations: [
    hamburgerAnimation
  ],
  providers: [MessageService]
})

export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('phoneInput') phoneInput?: ElementRef;
  @ViewChild('nameInput') nameInput?: ElementRef;
  @ViewChild('searchContainer') searchContainer?: ElementRef;
  @ViewChild('searchResultsWindow') searchResultsWindow?: ElementRef;

  activeComponent = true;
  activePhoneMenu = false;
  countryCodes: CountryCodeModel[] = [];
  selectedCountryCode: CountryCodeModel = new CountryCode();
  phoneNumber = '';
  name = '';
  date = new Date();
  currentRoute: string = '';
  isSmallScreen = false;
  showResetButton = false;
  options = [
    {
      title: 'Appointments',
      path: 'appointments',
      icon: 'pi pi-list'
    },
    {
      title: 'Patient Manager',
      path: 'patient-manager',
      icon: 'pi pi-user-edit'
    },
    {
      title: 'Settings',
      path: 'settings',
      icon: 'pi pi-cog'
    }
  ];
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
  searchResults: PatientCollectionModel = {};
  showSearchResults = false;
  isFullscreen = false;

  constructor(private router: Router,
              private locationService: LocationService,
              private messageService: MessageService,
              private doctorService: DoctorService,
              private patientService: PatientService,
              private appointmentService: AppointmentService,
              private translateService: TranslateService,
              private breakpointObserver: BreakpointObserver) {
  }

  ngOnInit() {
    this.initializeCountryCodes();
    this.setCurrentRoute();
    this.monitorRouter();
    this.monitorResolution();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    if (!this.searchResultsWindow?.nativeElement.contains(event.target) && !this.searchContainer?.nativeElement.contains(event.target)) {
      this.closeSearchResultsWindow();
    }
  }

  /** Function to toggle full screen of the web browser **/
  toggleFullScreen(): void {
    // TODO make it all browser compatible
    this.isFullscreen = !this.isFullscreen;

    if (!this.isFullscreen) {
      document.exitFullscreen().then();
      return;
    }

    document.documentElement.requestFullscreen().then();
  }

  resetSearch(): void {
    this.showResetButton = false;
    this.showSearchResults = false;
    this.searchResults = {};
    this.closeSearchResultsWindow();
    this.name = '';
    this.phoneNumber = '';
    if (this.currentRoute === 'appointments') {
      this.appointmentService.filterAppointmentsByDate(new AppointmentFilter(this.selectedDefaultSearch.option));
    }
  }

  initializeCountryCodes(): void {
    this.locationService.countryCodeFetch().pipe(
      takeWhile(() => this.activeComponent)
    ).subscribe((subjectValue: CountryCodeSubjectModel) => {
      this.countryCodes = subjectValue.list;
      this.selectedCountryCode = subjectValue.selected;
    });
  }

  setDefaultSearch(route: string): void {
    this.defaultSearchOptions = [
      {
        option: 'phone',
        icon: 'pi-phone'
      },
      {
        option: 'name',
        icon: 'pi-user'
      }
    ];

    /* If current route is appointments, the Calendar based search should be displayed in the header. */
    if (route === 'appointments') {
      this.selectedDefaultSearch = {
        option: 'date',
        icon: 'pi-calendar'
      };
      this.defaultSearchOptions.push(this.selectedDefaultSearch);
      return;
    }

    /* If current route isn't appointments, display the default phone based search. */
    this.selectedDefaultSearch = {
      option: 'phone',
      icon: 'pi-phone'
    };
  }

  setCurrentRoute(): void {
    this.currentRoute = this.router.url.slice(1);
    this.setDefaultSearch(this.currentRoute);
  }

  monitorRouter(): void {
    this.router.events.pipe(takeWhile(() => this.activeComponent)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setCurrentRoute();
      }
    });
  }

  monitorResolution(): void {
    this.breakpointObserver.observe('(max-width: 768px)').pipe(takeWhile(() => this.activeComponent)).subscribe(result => {
      this.isSmallScreen = result.matches;
    });
  }

  onSearchOptionChange(searchOption: SearchOptionModel): void {
    this.resetSearch();

    if (searchOption.option === 'phone') {
      setTimeout(() => this.phoneInput?.nativeElement.focus(), 0)
      return;
    }

    if (searchOption.option === 'name') {
      setTimeout(() => this.nameInput?.nativeElement.focus(), 0)
      return;
    }
  }

  handleInputKeyup(event: KeyboardEvent, query: string | Date): void {
    if (event.key.length !== 1 && event.key !== 'Backspace' && event.key !== 'Enter') {
      return;
    }

    this.searchBy(query);
  }

  searchBy(query: string | Date): void {
    if (query === 'phone') {
      if (this.phoneNumber.length < 5) {
        this.searchResults = {};
        this.closeSearchResultsWindow();
        return;
      }

      this.showResetButton = true;
      const phone = this.patientService.generatePatientId(this.selectedCountryCode.dial_code, this.phoneNumber);

      /* Search appointment by phone number */
      if (this.currentRoute === 'appointments') {
        const filter = new AppointmentFilter('phone', phone);
        this.appointmentService.filterAppointmentsByDate(filter);
        return;
      }

      /* Search patient by phone number */
      this.patientService.getPatientsByPhone(phone).pipe(
        takeWhile(() => this.activeComponent)
      ).subscribe((patients: PatientCollectionModel): void => {
        this.displaySearchResultsWindow();
        this.searchResults = patients;
      }, () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('notifications.error'),
          detail: this.translateService.instant('notifications.generic_error')
        });
      });
    }

    if (query === 'name') {
      if (this.name.length < 3) {
        this.searchResults = {};
        this.closeSearchResultsWindow();
        return;
      }

      const name = this.name.replace(/ /g, '')
        .trim()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

      /* Search appointment by name */
      if (this.currentRoute === 'appointments') {
        this.showResetButton = true;
        const filter = new AppointmentFilter('name', name);
        this.appointmentService.filterAppointmentsByDate(filter);
        return;
      }

      /* Search patient by name */
      else {
        /* For now, search by name is implemented up to 3 separate names, where separate means that it's divided with a space */
        this.showResetButton = true;
        const firstNameSearch$ = this.patientService.getPatientsByName(name);
        const lastNameSearch$ = this.patientService.getPatientsByName(name, true);
        forkJoin([firstNameSearch$, lastNameSearch$])
          .pipe(takeWhile(() => this.activeComponent))
          .subscribe(([firstNameResults, lastNameResults]: [PatientCollectionModel, PatientCollectionModel]) => {
            const combinedResults: PatientCollectionModel = {
              ...firstNameResults,
              ...lastNameResults
            };
            this.displaySearchResultsWindow();
            this.searchResults = combinedResults;
          }, () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('notifications.error'),
              detail: this.translateService.instant('notifications.generic_error')
            });
          });

        return;
      }
    }

    if (query === 'date') {
      if (!this.date) {
        return;
      }

      this.showResetButton = true;
      const date = formatDate(this.date, 'YYYY-MM-dd', 'en-US');
      const filter = new AppointmentFilter('date', date);
      this.appointmentService.filterAppointmentsByDate(filter);
    }
  }

  displaySearchResultsWindow(): void {
    this.showSearchResults = true;
  }

  closeSearchResultsWindow(): void {
    this.showSearchResults = false;
  }

  emptySearchResults(searchResults: PatientCollectionModel): boolean {
    return !Object.keys(searchResults).length;
  }

  /** Function which takes a raw phone number from the patient data and converts to a readable phone number with dial code **/
  convertPhoneNumber(phone: string): string {
    if (!phone.length) {
      return '';
    }

    return `+${phone.replace('-', '').slice(2)}`;
  }

  isSearchDisabled(): boolean {
    if (this.selectedDefaultSearch.option === 'phone') {
      return this.phoneNumber.length < 7;
    }

    if (this.selectedDefaultSearch.option === 'name') {
      return this.name.length < 3;
    }

    return !this.date;
  }

  loadPatient(patient: PatientModel): void {
    this.patientService.setActivePatient(patient);
    this.router.navigate(['patient-manager']).then();
    this.resetSearch();
  }

  togglePhoneMenu(): void {
    this.activePhoneMenu = !this.activePhoneMenu;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]).then();
    this.togglePhoneMenu();
  }

  ngOnDestroy() {
    this.activeComponent = false;
  }
}
