import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { concatMap, EMPTY, forkJoin, Observable, of, Subject, switchMap, take, takeWhile, tap } from 'rxjs';
import {
  Appointment,
  AppointmentGroup,
  AppointmentGroupModel,
  AppointmentCollectionModel,
  AppointmentFilterModel,
  AppointmentModel,
  ResolveConflictOptions,
  ConflictDetailsModel
} from '../../../core/models/appointment.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Calendar } from 'primeng/calendar';
import { MessageService } from 'primeng/api';
import { LocationService } from '../../../core/services/location.service';
import { CountryCode, CountryCodeModel, CountryCodeSubjectModel } from '../../../core/models/location.model';
import { nameValidators, phoneValidators, required } from '../../../core/validators/validator';
import { PatientService } from '../../../core/services/patient.service';
import { Patient, PatientIdCollectionModel, PatientModel } from '../../../core/models/patient.model';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { formatDate } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';

@Component({
  selector: 'app-appointment-dashboard',
  templateUrl: './appointment-dashboard.component.html',
  styleUrls: ['./appointment-dashboard.component.scss'],
  providers: [MessageService]
})
export class AppointmentDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('appointmentContainer') appointmentContainer?: ElementRef;
  @ViewChild('dateInput') dateInput?: Calendar;
  @ViewChild('timeInput') timeInput?: Calendar;

  activeComponent = true;
  appointments: AppointmentGroupModel = {};
  countryCodes: CountryCodeModel[] = [];
  selectedCountryCode: CountryCodeModel = new CountryCode();
  today = new Date();
  showAppointmentDialog = false;
  showConfirmDialog = false;
  editedAppointmentIndex = -1;
  editedAppointmentKey = '';
  editedAppointmentDate = new Date();
  appointmentFormGroup: FormGroup = this.formBuilder.group({
    firstName: ['', nameValidators],
    lastName: ['', nameValidators],
    date: [new Date(), required],
    phone: ['', phoneValidators],
    description: ['']
  });
  time: Date = new Date();

  /** Boolean variable to control whether the appointment list is displayed or the larger UI Calendar. Appointment list will always be displayed if the
   * screen width is smaller than 1366px or the user is filtering/searching appointments **/
  isLargeScreen = false;

  /** Boolean variable to monitor whether filter/search action is taking place,
   * which influences how the appointment data will be assigned and displayed **/
  isFilterActive = false;

  /** Subject for handling a conflict situation, when saving an appointment
   * and the phone number [therefore the patient] is already registered,
   * but the name in the appointment doesn't match the name registered to the patient */
  appointmentConflictSubject = new Subject<ResolveConflictOptions>();
  showAppointmentConflictDialog = false;
  appointmentConflictDetails?: ConflictDetailsModel;
  standaloneConfiguration = {
    standalone: true
  };

  /** Variables used for the functionality of the calendar **/
  days: string[] = [
    'appointments.days.monday',
    'appointments.days.tuesday',
    'appointments.days.wednesday',
    'appointments.days.thursday',
    'appointments.days.friday',
    'appointments.days.saturday',
    'appointments.days.sunday'
  ];
  calendarBoxes: Record<string, Record<string, any>> = {};
  calendarMonth: Date = new Date();
  disabledRevertWeeks = false; /* TODO Consult doctors whether this is needed */

  constructor(private appointmentService: AppointmentService,
              private patientService: PatientService,
              private formBuilder: FormBuilder,
              private router: Router,
              private locationService: LocationService,
              private translateService: TranslateService,
              private breakpointObserver: BreakpointObserver,
              private messageService: MessageService) {
  }

  ngOnInit() {
    this.initializeAppointmentForm();
    this.initializeCountryCodes();
    this.monitorAppointmentFilter();
    this.monitorResolution();
    this.initializeCalendarBoxes();
  }

  /** Workaround for PrimeNG Dialog (closeOnEscape) bug, when there are multiple active dialogs */
  @HostListener('document:keydown.escape', ['$event']) onEscKeyHandler() {
    /* Monitor whenever the Esc button was pressed */
    if (this.showAppointmentDialog) {
      /* Close the appointment dialog, but only if the conflict dialog is inactive */
      if (!this.showAppointmentConflictDialog) {
        this.showAppointmentDialog = false;
      }

      /* If the conflict dialog is active, close only the conflict dialog */
      if (this.showAppointmentConflictDialog) {
        this.resolveAppointmentConflict('');
      }
    }
  }

  /** Key combination to open appointment dialog with Ctrl + Enter */
  @HostListener('document:keydown.control.enter', ['$event']) onCtrlEnter() {
    /* Monitor whenever Ctrl + Enter was pressed */
    if (this.showAppointmentDialog) {
      /* Avoid action if the appointment dialog is active */
      return;
    }

    this.displayAppointmentDialog();
  }

  /** Key command to confirm deleting appointment and exit confirmation dialog */
  @HostListener('document:keyup.enter', ['$event']) onEnter() {
    /* Execute only if the confirm dialog is displayed */

    if (!this.showConfirmDialog) {
      /* Avoid action if the confirm dialog is absent */
      return;
    }

    this.deleteAppointment();
  }

  /** Function to monitor resolution. By default, the appointment list is displayed, but if resolution is higher than 1366px, then the UI calendar **/
  monitorResolution(): void {
    this.breakpointObserver.observe('(min-width: 1366px)').pipe(takeWhile(() => this.activeComponent)).subscribe(result => {
      this.isLargeScreen = result.matches;
    });
  }

  /** Function to initialize appointment form, for creating/editing an appointment **/
  initializeAppointmentForm(): void {
    this.appointmentFormGroup = this.formBuilder.group({
      firstName: ['', nameValidators],
      lastName: ['', nameValidators],
      date: [new Date(), required],
      phone: ['', phoneValidators],
      description: ['']
    });
  }

  /** Function to initialize the country codes for the phone number dropdown **/
  initializeCountryCodes(): void {
    this.locationService.countryCodeFetch().subscribe((subjectValue: CountryCodeSubjectModel) => {
      this.countryCodes = subjectValue.list;
      this.selectedCountryCode = subjectValue.selected;
    });
  }

  /** Function to initialize the UI calendar. The 'calendarBoxes' object will have the default hour keys in a day, and those keys will contain
   * 7 objects, each, where the keys are the 7 dates of the current week, in 'yyyy-MM-dd' format. These 7 objects will contain arrays of appointments.
   * After initialization [ let's say the current week is 19-25 May 2024, where 19th is a Sunday ], this.calendarBoxes will look like this:
   *
   *   this.calendarBoxes = {
   *      '00': {
   *        '2024-05-19': [],
   *        '2024-05-20': [],
   *        '2024-05-21': [],
   *        '2024-05-22': [],
   *        '2024-05-23': [],
   *        '2024-05-24': [],
   *        '2024-05-25': []
   *      },
   *      ... [ the same for '01', '02', '03', ..., up to '23' ]
   *   }
   *
   * **/
  initializeCalendarBoxes(targetDate?: Date): void {
    const daysInEnglish = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    targetDate = targetDate ? targetDate : new Date();
    let dateOfCalendarMonday = targetDate;
    dateOfCalendarMonday.setDate(targetDate.getDate() - daysInEnglish.indexOf(formatDate(targetDate, 'EEEE', 'en-US')));
    this.calendarMonth = new Date(dateOfCalendarMonday);

    /* This functionality is disabled until there's a confirmation that it's indeed needed */
    /* Backwards pagination should be disabled for the weeks if the previous week is in the past */
    /* const thisWeeksMonday = new Date(); */
    /* thisWeeksMonday.setDate(thisWeeksMonday.getDate() - daysInEnglish.indexOf(formatDate(thisWeeksMonday, 'EEEE', 'en-US'))); */
    /* this.disabledRevertWeeks = thisWeeksMonday >= dateOfCalendarMonday; */ /* Disable paginating to past weeks */

    /* Populate the calendarBoxes variable, which is used for displaying the UI calendar */
    for (let i = 0; i < 24; i++) {
      const calendarBoxKey = i < 10 ? `0${i}` : `${i}`;
      this.calendarBoxes[calendarBoxKey] = {}; /* Initialize calendarBoxes with 24 empty objects, where the keys are represented in hours [00 - 23]*/

      for (let dayIncrement = 0; dayIncrement < 7; dayIncrement++) {
        const currentYear = targetDate.getFullYear();
        const currentMonth = targetDate.getMonth();
        const dateKey = formatDate(new Date(currentYear, currentMonth, dateOfCalendarMonday.getDate() + dayIncrement), 'yyyy-MM-dd', 'en-US');

        /* For each 24 keys, add 7 objects, where the 7 keys represent the days of the current week in 'yyyy-MM-dd' format */
        this.calendarBoxes[calendarBoxKey][dateKey] = [];
      }
    }
  }

  /** Function which takes an appointment collection as an argument, and populates the calendarBoxes object with appointments,
   * based on the date and hour of the appointments. If an appointment is not scheduled for the current week [ Monday to Sunday ],
   * it will not be added to the UI calendar, only when the respective week is displayed **/
  populateCalendarBoxes(appointments: AppointmentCollectionModel): void {
    const datesOfTheWeek = Object.keys(this.calendarBoxes['00']); /* Extract the 7 days of the week, in 'yyyy-MM-dd' format */
    for (let appointmentKey of Object.keys(appointments)) {
      for (let date of datesOfTheWeek) {
        if (appointmentKey.includes(date)) {
          const hour = appointmentKey.substring(11, 13); /* Extract the hour, especially because the structure of the appointmentKey is fixed */
          this.calendarBoxes[hour][date].push(appointments[appointmentKey]); /* Add the appointment to its respective box */

          /* If a calendarBox has more than one appointment, sort these appointments by time */
          if (this.calendarBoxes[hour][date].length > 1) {
            this.calendarBoxes[hour][date].sort((a: AppointmentModel, b: AppointmentModel) => a.date.getTime() - b.date.getTime());
          }
        }
      }
    }
  }

  /** Function to determine whether the given date key is today's date. Returns a boolean **/
  isToday(dateKey: string): boolean {
    const date = new Date(dateKey)
    const today = new Date();
    if (date.getFullYear() !== today.getFullYear()) {
      return false;
    }

    if (date.getMonth() !== today.getMonth()) {
      return false
    }

    return date.getDate() === today.getDate();
  }

  /** Function which takes an argument, and rotates the displayed week either backwards or forwards, by calling the initializeCalendarBoxes() **/
  changeCalendarWeek(step: number): void {
    const currentDisplayedMonday = Object.keys(this.calendarBoxes['00'])[0];
    const targetDate = new Date(currentDisplayedMonday); // TODO we have to save the current active targetDate into a global variable to keep track on multiple date changes, back & forth
    const increment = step * 7;
    targetDate.setDate(targetDate.getDate() + increment);
    this.initializeCalendarBoxes(targetDate);
    const appointmentCollection: AppointmentCollectionModel = {};
    const targetDateStart = new Date(targetDate);
    for (let day = 0; day < 7; day++) {
      targetDate.setDate(targetDateStart.getDate() + day);
      const appointmentKey = formatDate(targetDate, 'yyyy-MM-dd', 'en-US');
      if (this.appointments[appointmentKey]) {
        this.appointments[appointmentKey].forEach((appointment: AppointmentModel) => {
          const appointmentId = this.appointmentService.generateAppointmentId(appointment.date);
          appointmentCollection[appointmentId] = appointment;
        });
      }
    }

    this.populateCalendarBoxes(appointmentCollection);

    // TODO BUG on May 30th, undeletable entries, two of the same
  }

  /** Function which is triggered when the month is changed for the UI calendar. It will invoke the
   * initializeCalendarBoxes()function to re-populate the calendar with the new respective dates for the selected month **/
  changeCalendarMonth(targetMonth: Date): void {
    /* If the month is the same, avoid any action */

    const date = new Date(targetMonth);
    if (date.getMonth() === this.calendarMonth.getMonth() && date.getFullYear() === this.calendarMonth.getFullYear()) {
      return;
    }

    /* TODO consult doctors */
    // /* Make sure past months [ months before today's date] are not selectable */
    // if (date.getMonth() < new Date().getMonth()) {
    //   this.calendarMonth.setMonth(new Date().getMonth());
    //   return;
    // }

    /* Increase days until we find the first Monday in the selected month */
    while (formatDate(date, 'EEEE', 'en-US') !== 'Monday') {
      date.setDate(date.getDate() + 1);
    } // TODO this function should reset the whole system

    /* Get currently displayed week's Monday in 'yyyy-MM-dd' format */
    const calendarMondayKey = Object.keys(this.calendarBoxes['00'])[0];
    const currentMonday = new Date(calendarMondayKey);

    /* Variable to keep track of how many weeks there are between the currently displayed Monday and the first Monday of the newly selected month */
    let step = 0;

    /* Based on whether we're moving backwards or forwards, we'll have to specify the direction in boolean */
    const directionBackwards = currentMonday > date;

    /* Increase/decrease the currently displayed Monday's date by one week, until its month will match the selected month */
    if (directionBackwards) {
      while (currentMonday.getMonth() !== date.getMonth() || currentMonday.getFullYear() !== date.getFullYear()) {
        step--;
        currentMonday.setDate(currentMonday.getDate() - 7);
      }
    } else {
      while (currentMonday.getMonth() !== date.getMonth() || currentMonday.getFullYear() !== date.getFullYear()) {
        step++;
        currentMonday.setDate(currentMonday.getDate() + 7);
      }
    }

    this.changeCalendarWeek(step);
  }

  /** Function to display the appointment dialog with an empty form, and a preloaded date value, based on the box the user has clicked **/
  onCalendarBoxSelect(date: string, hour: string): void {
    this.showAppointmentDialog = true;
    this.appointmentFormGroup.get('date')?.setValue(new Date(date));
    this.time.setHours(parseInt(hour, 10), 0, 0);
    this.timeInput?.writeValue(this.time);
  }

  /** Function which takes an appointment collection object, and returns a boolean value based on whether the object is empty **/
  emptyAppointmentCollection(appointmentCollection: AppointmentGroupModel): boolean {
    return !Object.keys(appointmentCollection).length;
  }

  /** Function to monitor any changes of the appointment filter in the header component,**/
  monitorAppointmentFilter(): void {
    this.appointmentService.appointmentFilter.pipe(
      takeWhile(() => this.activeComponent),
      switchMap((filter: AppointmentFilterModel) => {
        this.appointments = {}; /* TODO Implement a modern loading animation while results are kicked in */
        this.isFilterActive = true;

        /* If the filter's value is an empty string, reset the appointment list */
        if (!filter.value.length) {
          this.isFilterActive = false;
          /* Also serves as initial fetching, on component load */
          return this.appointmentService.getAppointments();
        }

        if (filter.type === 'phone') {
          return this.appointmentService.getAppointmentsByPhone(filter.value);
        }

        if (filter.type === 'name') {
          const combinedNameRequests = [
            this.appointmentService.getAppointmentsByName(filter.value),
            this.appointmentService.getAppointmentsByName(filter.value, true)
          ];
          return forkJoin(combinedNameRequests).pipe(
            switchMap(([firstNameResults, lastNameResults]) => {
              return of({
                ...firstNameResults,
                ...lastNameResults
              });
            })
          );
        }

        return this.appointmentService.getAppointmentsByDate(filter.value);
      })
    ).subscribe((appointments: AppointmentCollectionModel): void => {
      if (appointments) {
        this.appointments = this.getAppointmentsGroupedByDate(appointments);
        if (!this.isFilterActive && this.isLargeScreen) {
          this.initializeCalendarBoxes();
          this.populateCalendarBoxes(appointments);
        }
      } else {
        this.appointments = {};
      }
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function which takes an appointment collection and returns an appointment group model,
   * which is used by the appointment list [this.appointments]. Basically, the result is an
   * object of appointment arrays, where every key represents a date in the format of 'yyyy-MM-dd'.
   * The result will look like this:
   *
   *    this.appointments = {
   *      '2024-05-20': [Appointment, Appointment, Appointment...],
   *      '2024-05-21': [],
   *      '2024-05-22': [Appointment, Appointment],
   *      '2024-05-23': [Appointment...],
   *      ...
   *    }
   *
   * **/
  getAppointmentsGroupedByDate(appointmentCollection: AppointmentCollectionModel): AppointmentGroupModel {
    const appointmentsArray = Object.entries(appointmentCollection);
    const groupedAppointments: AppointmentGroupModel = {};

    appointmentsArray.forEach(([dateTime, appointment]: [string, AppointmentModel]) => {
      const date = dateTime.split('T')[0];
      if (groupedAppointments[date]) {
        groupedAppointments[date].push(appointment);
        groupedAppointments[date].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else {
        groupedAppointments[date] = [appointment];
      }
    });

    return new AppointmentGroup(groupedAppointments);
  }

  navigateToPatient(patientId: string): void {
    if (!patientId.length) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('notifications.not_found'),
        detail: this.translateService.instant('notifications.patient_not_registered')
      });
      return;
    }

    this.patientService.getPatientById(patientId).subscribe((patient: PatientModel): void => {
      if (patient?.phone?.length) {
        this.patientService.setActivePatient(patient);
        this.router.navigate(['patient-manager']).then();
      } else {
        this.messageService.add({
          severity: 'info',
          summary: this.translateService.instant('notifications.not_found'),
          detail: this.translateService.instant('notifications.patient_not_registered')
        });
      }

    }, () => {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('notifications.not_found'),
        detail: this.translateService.instant('notifications.patient_not_registered')
      });
    })
  }

  /** Function to display appointment dialog and set the default editable hour to the current hour + 1 **/
  displayAppointmentDialog(): void {
    this.showAppointmentDialog = true;
    this.time.setHours(new Date().getHours() + 1, 0, 0); /* Set the time to the next hour */
    this.timeInput?.writeValue(this.time);
  }

  /** Function to prepare specific appointment from the UI Calendar for editing and invoke the displayUpdateAppointmentDialog() **/
  updateCalendarBoxAppointment(key: string, appointment: AppointmentModel): void {
    const index = this.appointments[key].indexOf(appointment);
    this.displayUpdateAppointmentDialog(key, index, appointment);
  }

  /** Function to display appointment dialog for editing a specific appointment **/
  displayUpdateAppointmentDialog(key: string, index: number, appointment: AppointmentModel): void {
    this.showAppointmentDialog = true;
    this.editedAppointmentIndex = index;
    this.editedAppointmentKey = key;
    this.editedAppointmentDate = appointment.date;
    this.selectDialCode(appointment.phone.split('-')[0]);
    this.appointmentFormGroup.patchValue({
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      date: appointment.date,
      phone: appointment.phone.split('-')[1],
      description: appointment.description
    });
    this.time = appointment.date;
  }

  /** Function to assign selectedCountryCode based on the currently selected value **/
  selectDialCode(dialCode: string): void {
    if (!dialCode.length) {
      return;
    }

    const translatedCode = `+${dialCode.substring(2)}`;
    for (let countryCode of this.countryCodes) {
      if (countryCode.dial_code === translatedCode) {
        this.selectedCountryCode = countryCode;
        return;
      }
    }
  }

  /** Function which takes a DOM Element and autofocuses it **/
  focusNextInput(input: HTMLInputElement | HTMLTextAreaElement | Calendar): void {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.focus();
      return;
    }

    input.inputfieldViewChild.nativeElement.focus();
  }

  /** Function to close the appointment dialog by assigning a false value to its trigger **/
  closeAppointmentDialog(): void {
    this.showAppointmentDialog = false;
  }

  /** Function to execute a series of operations after closing the appointment dialog. Mainly responsible for resetting the appointment form **/
  onAppointmentDialogClose(): void {
    /* Workaround for a bug, which results in the calendar remaining open while the dialog is closed */
    (this.dateInput && this.timeInput) && (this.dateInput.overlayVisible = this.timeInput.overlayVisible = false);
    this.editedAppointmentIndex = -1;
    this.appointmentFormGroup.reset();
    const newDate = new Date();
    newDate.setHours(8, 0, 0);
    this.appointmentFormGroup.get('date')?.setValue(newDate);
  }

  /** Function to transmit the decision through the appointment conflict Subject **/
  resolveAppointmentConflict(decision: ResolveConflictOptions): void {
    this.showAppointmentConflictDialog = false;
    this.appointmentConflictSubject.next(decision);
  }

  /** Function which takes an appointment as a parameter, and the original appointmentId,
   * and inserts the appointment into the UI calendar [ this.calendarBoxes ], based on the appointment key, calculated from the appointmentId. **/
  insertAndSortInCalendar(appointment: AppointmentModel, appointmentId: string): void {
    /* If the appointment isn't scheduled for the current week, abort the function */
    if (!this.appointmentFitsCalendarBoxes(appointmentId)) {
      return;
    }

    const appointmentHour = appointment.date.getHours();
    const hour = appointmentHour < 10 ? `0${appointmentHour}` : `${appointmentHour}`;
    const key = formatDate(appointment.date, 'yyyy-MM-dd', 'en-US');
    this.calendarBoxes[hour][key].push(appointment);

    /* If a calendarBox has more than one appointment, sort these appointments by time */
    if (this.calendarBoxes[hour][key].length > 1) {
      this.calendarBoxes[hour][key].sort((a: AppointmentModel, b: AppointmentModel) => a.date.getTime() - b.date.getTime());
    }
  }

  /** Function which takes an appointment as a parameter, and the original appointmentId,
   * and inserts the appointment into the appointment list [ this.appointments ], based on the appointment key, calculated from the appointmentId. **/
  insertAndSortInAppointmentList(appointment: AppointmentModel, appointmentId: string): void {
    const appointmentKey = appointmentId.split('T')[0];
    if (this.appointments[appointmentKey]?.length) {
      this.appointments[appointmentKey].push(appointment);
      this.appointments[appointmentKey].sort((currentAppointment: AppointmentModel, nextAppointment: AppointmentModel) =>
        new Date(currentAppointment.date).getTime() - new Date(nextAppointment.date).getTime());
    } else {
      this.appointments[appointmentKey] = [appointment];
    }

    // TODO this should be moved to a separate function, and coordinated better with the .splice functionality, this way it will work correctly
    /* This is just an extra functionality, to indicate which appointment was created/updated */

    this.markAppointment(appointment, appointmentId);
  }

  /** Function to remove appointment from the appointment list **/
  removeItemFromAppointmentList(): void {
    this.appointments[this.editedAppointmentKey].splice(this.editedAppointmentIndex, 1);
  }

  /** Function to remove appointment from the UI calendar **/
  removeItemFromCalendar(): void {
    /* If the appointment isn't scheduled for the current week, abort the function */
    const appointmentDate = this.appointmentService.generateAppointmentId(this.appointments[this.editedAppointmentKey][this.editedAppointmentIndex].date);
    if (!this.appointmentFitsCalendarBoxes(appointmentDate)) {
      return;
    }

    const hour = appointmentDate.substring(11, 13);
    this.calendarBoxes[hour][this.editedAppointmentKey] = this.calendarBoxes[hour][this.editedAppointmentKey]
      .filter((appointmentToDelete: AppointmentModel) =>
        appointmentToDelete !== this.appointments[this.editedAppointmentKey][this.editedAppointmentIndex]
      );
  }

  /** Function to add a scroll animation for the newly added appointment, to indicate the change in the UI appointment list container. **/
  markAppointment(appointment: AppointmentModel, appointmentId: string): void {
    if (!this.appointmentContainer) {
      return;
    }

    /* Key of the appointment group in the appointment list */
    const appointmentKey = appointmentId.split('T')[0];

    /* Index of parent container, in the main appointment container */
    const keyIndex = Object.keys(this.appointments).sort().indexOf(appointmentKey);

    /* Index of element in parent container, plus 1, to skip the initial element, which is the displayed date for the appointment group */
    const appointmentIndex = this.appointments[appointmentKey].indexOf(appointment) + 1;

    /* Make sure new item is rendered in the container before adding the 'blink'
    class which serves as an indicator for the user, which appointment was created */
    setTimeout(() => {
      /* Make sure date and time overlays are closed to avoid faulty scroll behavior */
      (this.dateInput && this.timeInput) && (this.dateInput.overlayVisible = this.timeInput.overlayVisible = false);
      this.appointmentContainer?.nativeElement.children[keyIndex].children[appointmentIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      this.appointmentContainer?.nativeElement.children[keyIndex].children[appointmentIndex].classList.add('blink');
    });
  }

  // TODO insert a takeUntil before the first switchMap to kill the observable chain when it's concluded
  /** Function which takes an **appointment** and an optional boolean value **isEdited** and returns either a processed Observable, which will be used
   * for saving the appointment, or breaks the whole chain, due to certain conditions. It makes a shallow request to get the patient ID list, then
   * calculates [ based on whether the appointment is newly created or edited ] whether any data override is necessary **/
  processedSaveAppointmentRequest(appointment: AppointmentModel, isEdited?: boolean): Observable<AppointmentModel | AppointmentModel[]> {
    return this.patientService.getPatientIdList().pipe(
      switchMap((patientIdList: PatientIdCollectionModel) => {
        const patientId = appointment.phone;
        if (!patientIdList[patientId]) {
          /* If the patient is not registered, register the patient and create the appointment */
          const patient = new Patient({
            firstName: appointment.firstName,
            lastName: appointment.lastName,
            phone: appointment.phone
          });
          (patient.birthdate as Date | null) = null;
          return this.patientService.savePatient(patient, patient.phone).pipe(
            switchMap(() => {
              const appointmentId = this.appointmentService.generateAppointmentId(appointment.date);
              return this.appointmentService.saveAppointment(appointment, appointmentId).pipe(
                tap(() => {
                  if (isEdited) {
                    this.removeItemFromCalendar();
                    this.removeItemFromAppointmentList();
                  }

                  this.insertAndSortInAppointmentList(appointment, appointmentId);
                  this.insertAndSortInCalendar(appointment, appointmentId);
                })
              )
            })
          );
        } else {
          /* Patient is registered by this phone number, so we'll continue with checking if the names are matching */
          return this.patientService.getPatientById(appointment.phone).pipe(
            switchMap((patient: PatientModel) => {
              if (patient.firstName === appointment.firstName && patient.lastName === appointment.lastName) {
                /* If the name entered for the appointment matches the registered patient name, simply save the appointment */
                const appointmentId = this.appointmentService.generateAppointmentId(appointment.date);
                return this.appointmentService.saveAppointment(appointment, appointmentId).pipe(
                  tap(() => {
                    if (isEdited) {
                      this.removeItemFromCalendar();
                      this.removeItemFromAppointmentList();
                    }

                    this.insertAndSortInAppointmentList(appointment, appointmentId);
                    this.insertAndSortInCalendar(appointment, appointmentId);
                  })
                )
              } else {
                /* If there is a conflict in the match, prompt the user to resolve it */
                this.appointmentConflictDetails = {
                  patientFirstName: patient.firstName,
                  patientLastName: patient.lastName
                };
                this.showAppointmentConflictDialog = true;
                return this.appointmentConflictSubject.pipe(
                  takeWhile((choice: ResolveConflictOptions) => this.showAppointmentDialog && choice !== ''),
                  take(1),
                  switchMap((choice: ResolveConflictOptions) => {
                    if (choice === 'overrideAppointment') {
                      /* If the user chooses to override the appointment, update the appointment with the patient's name then save it */
                      appointment.firstName = patient.firstName;
                      appointment.lastName = patient.lastName;
                      const appointmentId = this.appointmentService.generateAppointmentId(appointment.date);
                      return this.appointmentService.saveAppointment(appointment, appointmentId).pipe(
                        tap(() => {
                          if (isEdited) {
                            this.removeItemFromCalendar();
                            this.removeItemFromAppointmentList();
                          }

                          this.insertAndSortInAppointmentList(appointment, appointmentId);
                          this.insertAndSortInCalendar(appointment, appointmentId);
                        })
                      )
                    } else if (choice === 'overridePatient') {
                      /* If the user chooses to override the original patient data, save the patient with the new name,
                      save the appointment and re-trace any appointments by the patientId and update the appointment names */
                      patient.firstName = this.appointmentFormGroup.value.firstName;
                      patient.lastName = this.appointmentFormGroup.value.lastName;
                      patient = new Patient({ ...patient });
                      return this.patientService.savePatient(patient, patient.phone).pipe(
                        concatMap(() => {
                          const appointmentId = this.appointmentService.generateAppointmentId(appointment.date);
                          return this.appointmentService.saveAppointment(appointment, appointmentId).pipe(
                            tap(() => {
                              if (isEdited) {
                                this.removeItemFromCalendar();
                                this.removeItemFromAppointmentList();
                              }

                              this.insertAndSortInAppointmentList(appointment, appointmentId);
                              this.insertAndSortInCalendar(appointment, appointmentId);
                            })
                          )
                        }),
                        concatMap(() => this.appointmentService.getAppointmentsByPhone(appointment.phone).pipe(
                          concatMap((appointmentCollection: AppointmentCollectionModel) => {
                            /* Collect updated appointments into Observables and return them for processing */
                            const requestCollection: Observable<AppointmentModel>[] = [];
                            Object.keys(appointmentCollection).forEach(key => {
                              appointmentCollection[key].firstName = appointment.firstName;
                              appointmentCollection[key].lastName = appointment.lastName;
                              const updatedAppointment = new Appointment({ ...appointmentCollection[key] });
                              const appointmentId = this.appointmentService.generateAppointmentId(updatedAppointment.date);
                              requestCollection.push(this.appointmentService.saveAppointment(updatedAppointment, appointmentId));
                            });
                            return forkJoin(requestCollection).pipe(
                              tap(() => {
                                /* To avoid reloading the whole appointment list, simply iterate through the appointments, and update patient names */
                                const groupedAppointmentKeys = Object.keys(this.appointments);
                                groupedAppointmentKeys.forEach((key: string): void => {
                                  this.appointments[key].forEach((targetAppointment: Appointment): void => {
                                    if (targetAppointment.phone === appointment.phone) {
                                      targetAppointment.firstName = appointment.firstName;
                                      targetAppointment.lastName = appointment.lastName;
                                    }
                                  });
                                });
                              })
                            );
                          })
                        ))
                      )
                    } else {
                      /* User cancels the conflict dialog, so the chain of operations will stop */
                      return EMPTY;
                    }
                  })
                )
              }
            })
          )
        }
      }));
  }

  /** Function which takes an appointment date, and determines whether the appointment should be displayed in the calendar or not.
   * Result is determined by whether the appointment date is present in the calendar date range [ from current week's Monday to Sunday ] **/
  appointmentFitsCalendarBoxes(appointmentId: string): boolean {
    const datesOfTheWeek = Object.keys(this.calendarBoxes['00']);
    const appointmentDate = appointmentId.substring(0, 10); /* Extract the date in a string format of 'yyyy-MM-dd' */
    return datesOfTheWeek.includes(appointmentDate);
  }

  /** Function to save the appointment after all pre-processing operations are done **/
  saveAppointment(): void {
    this.appointmentFormGroup.updateValueAndValidity();
    if (!this.selectedCountryCode.dial_code || !this.appointmentFormGroup.valid || !this.time) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('notifications.invalid'),
        detail: this.translateService.instant('notifications.invalid_form')
      });
      return;
    }

    const appointment = new Appointment({ ...this.appointmentFormGroup.value });
    /* See comment in the updateAppointment() function */
    appointment.date.setHours(this.time.getHours(), this.time.getMinutes(), this.time.getSeconds(), new Date().getMilliseconds());
    appointment.phone = this.patientService.generatePatientId(this.selectedCountryCode.dial_code, appointment.phone);
    this.processedSaveAppointmentRequest(appointment).subscribe(() => {
      this.closeAppointmentDialog();

      this.messageService.add(
        {
          severity: 'success',
          summary: this.translateService.instant('notifications.success'),
          detail: this.translateService.instant('notifications.appointment_created')
        }
      );
    });
  }

  /** Function to update the appointment after all pre-processing operations are done **/
  updateAppointment(): void {
    this.appointmentFormGroup.updateValueAndValidity();
    if (!this.selectedCountryCode.dial_code || !this.appointmentFormGroup.valid || !this.time) {
      this.messageService.add({
        severity: 'info',
        summary: this.translateService.instant('notifications.invalid'),
        detail: this.translateService.instant('notifications.invalid_form')
      });
      return;
    }

    if (!this.editedAppointmentKey.length || this.editedAppointmentIndex < 0) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
      return;
    }

    const appointment = new Appointment({ ...this.appointmentFormGroup.value });
    appointment.phone = this.patientService.generatePatientId(this.selectedCountryCode.dial_code, appointment.phone);

    /* Timepicker value has to be set separately */
    appointment.date.setHours(this.time.getHours(), this.time.getMinutes(), this.time.getSeconds());

    /* Simplest case, the date of the appointment remains the same, so we'll just save the appointment and modify the displayed one */
    if (this.editedAppointmentDate.toISOString() === appointment.date.toISOString()) {
      this.processedSaveAppointmentRequest(appointment, true).subscribe(() => {
        /* Update appointment in the calendarBoxes, if the appointment date is in the range of the UI calendar */

        this.closeAppointmentDialog();
        this.messageService.add(
          {
            severity: 'success',
            summary: this.translateService.instant('notifications.success'),
            detail: this.translateService.instant('notifications.appointment_updated')
          }
        );
      }, (error: HttpErrorResponse) => {
        console.error('Error while updating the appointment, in appointment-dashboard.component.ts, line 414.\n', error);
        this.messageService.add(
          {
            severity: 'error',
            summary: this.translateService.instant('notifications.error'),
            detail: this.translateService.instant('notifications.generic_error')
          }
        );
      });
      /* In case the date was changed, we'll delete the old appointment data from the database, and save a completely new one */
    } else {
      /* Setting random milliseconds will help in generating a more unique id for the appointment */
      appointment.date.setMilliseconds(new Date().getMilliseconds());
      const appointmentId = this.appointmentService.generateAppointmentId(this.editedAppointmentDate);
      this.appointmentService.deleteAppointment(appointmentId).pipe(
        concatMap(() => this.processedSaveAppointmentRequest(appointment, true))
      ).subscribe(() => {
        this.closeAppointmentDialog();
        this.messageService.add(
          {
            severity: 'success',
            summary: this.translateService.instant('notifications.success'),
            detail: this.translateService.instant('notifications.appointment_updated')
          }
        );
      }, (error) => {
        console.error('Error while updating the appointment, in appointment-dashboard.component.ts, line 432.\n', error);
        this.messageService.add(
          {
            severity: 'error',
            summary: this.translateService.instant('notifications.error'),
            detail: this.translateService.instant('notifications.generic_error')
          }
        );
      })
    }
  }

  /** Function to open the confirmation dialog for deleting an appointment **/
  openConfirmDialog(): void {
    if (this.editedAppointmentIndex < 0) {
      return;
    }

    this.showConfirmDialog = true;
  }

  /** Function to assign key and index for the appointment the user wants to delete **/
  processAppointmentToDelete(appointmentKey: string, appointmentIndex: number): void {
    this.editedAppointmentKey = appointmentKey;
    this.editedAppointmentIndex = appointmentIndex;
    this.openConfirmDialog();
  }

  /** Function to close the confirmation dialog for deleting an appointment **/
  closeConfirmDialog(): void {
    this.showConfirmDialog = false;
  }

  /** Function to delete an appointment and also remove it from the UI appointment list & calendarBoxes **/
  deleteAppointment(): void {
    const key = this.editedAppointmentKey;
    const index = this.editedAppointmentIndex;
    this.closeConfirmDialog();

    if (!this.appointments[key] || !this.appointments[key][index]) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
      return;
    }

    const appointmentId = this.appointmentService.generateAppointmentId(this.appointments[key][index].date);
    this.appointmentService.deleteAppointment(appointmentId).subscribe((): void => {
      this.closeAppointmentDialog();

      /* Delete appointment from the calendarBox, if the appointment date fits the UI calendar's range */
      if (this.appointmentFitsCalendarBoxes(appointmentId)) {
        const hour = appointmentId.substring(11, 13);
        this.calendarBoxes[hour][key] = this.calendarBoxes[hour][key].filter(
          (appointmentToDelete: AppointmentModel) => appointmentToDelete !== this.appointments[key][index]
        );
      }

      /* Delete appointment from the appointment list */
      if (this.appointments[key].length === 1) {
        delete this.appointments[key]; /* Delete appointment from appointment list variable */
      } else {
        this.appointments[key].splice(index, 1); /* Delete appointment from appointment list variable */
      }

      /* Reset edited appointment index and display success notification */
      this.editedAppointmentIndex = -1;
      this.messageService.add(
        {
          severity: 'success',
          summary: this.translateService.instant('notifications.success'),
          detail: this.translateService.instant('notifications.appointment_deleted')
        }
      );
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function to trigger and display tooltip in the UI **/
  showTooltip(event: Event, tooltip: HTMLElement): void {
    event.stopPropagation();
    tooltip.focus();
  }

  /** Function to hide tooltip **/
  hideTooltip(event: Event, tooltip: HTMLElement): void {
    tooltip.blur();
  }

  ngOnDestroy() {
    this.activeComponent = false;
  }
}


