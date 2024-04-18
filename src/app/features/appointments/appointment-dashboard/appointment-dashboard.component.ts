import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { catchError, concatMap, EMPTY, forkJoin, Observable, of, Subject, switchMap, take, takeWhile, tap } from 'rxjs';
import { formatDate } from '@angular/common';
import {
  Appointment,
  AppointmentCollection,
  AppointmentCollection2,
  AppointmentCollectionModel,
  AppointmentCollectionModel2,
  AppointmentConflictDetails,
  AppointmentFilterModel,
  AppointmentModel,
  ResolveConflictOptions
} from '../../../core/models/appointment.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Calendar } from 'primeng/calendar';
import { MessageService } from 'primeng/api';
import { LocationService } from '../../../core/services/location.service';
import { CountryCode, CountryCodeModel } from '../../../core/models/location.model';
import { nameValidators, phoneValidators, required } from '../../../core/validators/validator';
import { PatientService } from '../../../core/services/patient.service';
import { Patient, PatientIdCollectionModel, PatientModel } from '../../../core/models/patient.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-appointment-dashboard',
  templateUrl: './appointment-dashboard.component.html',
  styleUrls: ['./appointment-dashboard.component.scss'],
  providers: [MessageService]
})
export class AppointmentDashboardComponent implements OnInit {
  @ViewChild('dateInput') dateInput?: Calendar;
  @ViewChild('timeInput') timeInput?: Calendar;

  appointments: AppointmentCollectionModel = {};
  appointments2: AppointmentCollectionModel2 = {};

  countryCodes: CountryCodeModel[] = [];
  selectedCountryCode: CountryCodeModel = new CountryCode();
  today = new Date();
  showAppointmentDialog = false;
  editedAppointmentIndex = -1;
  editedAppointmentKey = '';
  appointmentFormGroup: FormGroup = this.formBuilder.group({
    firstName: ['', nameValidators],
    lastName: ['', nameValidators],
    date: [new Date(), required],
    phone: ['', phoneValidators],
    description: ['']
  });

  /** Subject for handling a conflict situation, when saving an appointment
   * and the phone number [therefore the patient] is already registered,
   * but the name in the appointment doesn't match the name registered to the patient */
  appointmentConflictSubject = new Subject<ResolveConflictOptions>();
  showAppointmentConflictDialog = false;
  appointmentConflictDetails?: AppointmentConflictDetails;
  standaloneConfiguration = {
    standalone: true
  }

  constructor(private appointmentService: AppointmentService,
              private patientService: PatientService,
              private formBuilder: FormBuilder,
              private router: Router,
              private locationService: LocationService,
              private messageService: MessageService) {
  }

  ngOnInit() {
    this.initializeAppointmentForm();
    this.getAppointments();
    this.getAppointments2();
    this.initializeCountryCodes();
    this.monitorFilterByDate();
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

    this.displayAddAppointmentDialog();
  }

  initializeAppointmentForm(): void {
    this.appointmentFormGroup = this.formBuilder.group({
      firstName: ['', nameValidators],
      lastName: ['', nameValidators],
      date: [new Date(), required],
      phone: ['', phoneValidators],
      description: ['']
    });
  }

  initializeCountryCodes(): void {
    this.locationService.getCountryCodes().subscribe((countryCodes: CountryCodeModel[]): void => {
      this.countryCodes = countryCodes;
      this.selectedCountryCode = this.locationService.selectedCountryCode;
    });
  }

  emptyAppointmentCollection(appointmentCollection: AppointmentCollectionModel): boolean {
    return !Object.keys(appointmentCollection).length;
  }

  monitorFilterByDate(): void {
    // TODO if new system is implemented, then monitorFilterByDate shall be renamed monitorAppointmentFilter
    this.appointmentService.appointmentFilter.pipe(
      switchMap((filter: AppointmentFilterModel) => {
        /* If the filter's value is an empty string, reset the appointment list */
        if (!filter.value.length) {
          return this.appointmentService.getAppointments2();
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

        return this.appointmentService.getAppointmentsByDate2(filter.value);
      })
    ).subscribe((appointments: AppointmentCollectionModel2): void => {
      if (appointments) {
        this.appointments = this.getAppointmentsGroupedByDate(appointments);
      } else {
        this.appointments = {};
      }
    }, () => {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something Went Wrong' });
    });

    // this.appointmentService.appointmentFilter.pipe(
    //   switchMap((date: string) =>
    //     date.length ? this.appointmentService.getAppointmentsByDate2(date) : this.appointmentService.getAppointments2()
    //   )
    // ).subscribe((appointments: AppointmentCollectionModel2): void => {
    //   if (appointments) {
    //     this.appointments = this.getAppointmentsGroupedByDate(appointments);
    //   } else {
    //     this.appointments = {};
    //   }
    // });
  }

  getAppointments(): void {
    this.appointmentService.getAppointments2().subscribe((appointments: AppointmentCollectionModel2) => {
      this.appointments = this.getAppointmentsGroupedByDate(appointments);
      console.log(this.appointments);
    });
  }

  getAppointments2(): void {
    this.appointmentService.getAppointments2().subscribe((appointments: AppointmentCollectionModel2) => {
      this.appointments2 = appointments;
    });
  }

  // TODO rename AppointmentCollectionModel2 to the same but without the number '2' and also rename the original AppointmentCollectionModel to AppointmentGroupModel[]
  getAppointmentsGroupedByDate(appointmentCollection: AppointmentCollectionModel2): AppointmentCollectionModel {
    const appointmentsArray = Object.entries(appointmentCollection);
    const groupedAppointments: AppointmentCollectionModel = {};

    appointmentsArray.forEach(([dateTime, appointment]: [string, AppointmentModel]) => {
      const date = dateTime.split('T')[0];
      if (groupedAppointments[date]) {
        groupedAppointments[date].push(appointment);
        groupedAppointments[date].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else {
        groupedAppointments[date] = [appointment];
      }
    });

    return new AppointmentCollection(groupedAppointments);
  }


  navigateToPatient(patientId: string): void {
    if (!patientId.length) {
      // TODO translation needed
      this.messageService.add({ severity: 'info', summary: 'Not found', detail: 'Patient not registered' });
      return;
    }

    this.patientService.getPatientById(patientId).subscribe((patient: PatientModel): void => {
      this.patientService.setActivePatient(patient);
      this.router.navigate(['patient-manager']).then();
    }, () => {
      // TODO translation needed
      this.messageService.add({ severity: 'info', summary: 'Not found', detail: 'Patient not registered' });
    })
  }

  displayAddAppointmentDialog(): void {
    this.showAppointmentDialog = true;
  }

  displayUpdateAppointmentDialog(key: string, index: number, appointment: AppointmentModel): void {
    // TODO implement check for modifying existing patient name under already registered phone number
    this.showAppointmentDialog = true;
    this.editedAppointmentIndex = index;
    this.editedAppointmentKey = key;
    this.selectDialCode(appointment.phone.split('-')[0]);
    this.appointmentFormGroup.patchValue({
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      date: appointment.date,
      phone: appointment.phone.split('-')[1],
      description: appointment.description
    })
  }

  displayUpdateAppointmentDialog2(key: string, appointment: AppointmentModel): void {
    // TODO implement check for modifying existing patient name under already registered phone number
    this.showAppointmentDialog = true;
    this.editedAppointmentKey = key;
    this.selectDialCode(appointment.phone.split('-')[0]);
    this.appointmentFormGroup.patchValue({
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      date: appointment.date,
      phone: appointment.phone.split('-')[1],
      description: appointment.description
    })
  }

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

  focusNextInput(input: HTMLInputElement | HTMLTextAreaElement | Calendar): void {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.focus();
      return;
    }

    input.inputfieldViewChild.nativeElement.focus();
  }

  closeAppointmentDialog(): void {
    this.showAppointmentDialog = false;
  }

  onAppointmentDialogClose(): void {
    /* Avoid bug, which results in the calendar remaining open while the dialog is closed */
    (this.dateInput && this.timeInput) && (this.dateInput.overlayVisible = this.timeInput.overlayVisible = false);
    this.editedAppointmentIndex = -1;
    this.editedAppointmentKey = '';
    this.appointmentFormGroup.reset();
    this.appointmentFormGroup.get('date')?.setValue(new Date());
  }

  updateTime(event: Date, timeInput: Calendar): void {
    timeInput.writeValue(event);
  }

  resolveAppointmentConflict(decision: ResolveConflictOptions): void {
    this.showAppointmentConflictDialog = false;
    this.appointmentConflictSubject.next(decision);
  }

  requestSaveAppointmentObservable(appointment: AppointmentModel): Observable<AppointmentModel> {
    const appointmentId = this.appointmentService.generateAppointmentId(appointment.date);
    return this.appointmentService.saveAppointment2(appointment, appointmentId).pipe(
      tap(() => {
        const appointmentKey = appointmentId.split('T')[0];
        if (this.appointments[appointmentKey]?.length) {
          this.appointments[appointmentKey].push(appointment);
          this.appointments[appointmentKey].sort((currentAppointment: AppointmentModel, nextAppointment: AppointmentModel) =>
            new Date(currentAppointment.date).getTime() - new Date(nextAppointment.date).getTime());
        } else {
          this.appointments[appointmentKey] = [appointment];
        }
      })
    );
  }

  saveAppointment(): void {
    this.appointmentFormGroup.updateValueAndValidity();
    if (!this.selectedCountryCode.dial_code || !this.appointmentFormGroup.valid) {
      // TODO translation needed
      this.messageService.add({ severity: 'info', summary: 'Invalid', detail: 'The form is invalid' });
      return;
    }

    const appointment = new Appointment({ ...this.appointmentFormGroup.value });
    appointment.phone = this.patientService.generatePatientId(this.selectedCountryCode.dial_code, appointment.phone);


    this.patientService.getPatientIdList().pipe(
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
            switchMap(() => this.requestSaveAppointmentObservable(appointment))
          );
        } else {
          /* Patient is registered by this phone number, so we'll continue with checking if the names are matching */
          return this.patientService.getPatientById(appointment.phone).pipe(
            switchMap((patient: PatientModel) => {
              if (patient.firstName === appointment.firstName && patient.lastName === appointment.lastName) {
                /* If the name entered for the appointment matches the registered patient name, save the appointment */
                return this.requestSaveAppointmentObservable(appointment);
              } else {
                /* If there is a conflict in the match, prompt the user to resolve it */
                this.appointmentConflictDetails = {
                  patientFirstName: patient.firstName,
                  patientLastName: patient.lastName
                };
                this.showAppointmentConflictDialog = true;
                return this.appointmentConflictSubject.pipe(
                  takeWhile((choice: string) => this.showAppointmentDialog && choice !== ''),
                  take(1),
                  switchMap((choice: string) => {
                    if (choice === 'overrideAppointment') {
                      /* If the user chooses to override the appointment, update the appointment with the patient's name */
                      appointment.firstName = patient.firstName;
                      appointment.lastName = patient.lastName;
                      return this.requestSaveAppointmentObservable(appointment);
                    } else if (choice === 'overridePatient') {
                      /* If the user chooses to override the original patient data, save the patient with the new name,
                      save the appointment and re-trace any appointments by the patientId and update the appointment names */
                      patient.firstName = this.appointmentFormGroup.value.firstName;
                      patient.lastName = this.appointmentFormGroup.value.lastName;
                      patient = new Patient({ ...patient });
                      return this.patientService.savePatient(patient, patient.phone).pipe(
                        concatMap(() => this.requestSaveAppointmentObservable(appointment)),
                        concatMap(() => this.appointmentService.getAppointmentsByPhone(appointment.phone).pipe(
                          concatMap((appointmentCollection: AppointmentCollectionModel2) => {
                            /* Collect updated appointments into Observables and return them for processing */
                            const requestCollection: Observable<AppointmentModel>[] = [];
                            Object.keys(appointmentCollection).forEach(key => {
                              appointmentCollection[key].firstName = appointment.firstName;
                              appointmentCollection[key].lastName = appointment.lastName;
                              const updatedAppointment = new Appointment({ ...appointmentCollection[key] });
                              const appointmentId = this.appointmentService.generateAppointmentId(updatedAppointment.date);
                              requestCollection.push(this.appointmentService.saveAppointment2(updatedAppointment, appointmentId));
                            });
                            return forkJoin(requestCollection);
                          })
                        )),
                        concatMap(() => this.appointmentService.getAppointments2().pipe(
                          tap((appointments: AppointmentCollection2) => {
                            this.appointments = this.getAppointmentsGroupedByDate(appointments);
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
      }),
      catchError(() => {
        // TODO translation needed
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something Went Wrong' });
        return EMPTY;
      })).subscribe(() => {
      this.closeAppointmentDialog();
      this.appointmentFormGroup.reset();
      // TODO translation needed
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment Created' });
    });
  }

  updateAppointment(): void {
    if (!this.editedAppointmentKey.length || this.editedAppointmentIndex < 0) {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something Went Wrong' });
      return;
    }

    const appointment = new Appointment({ ...this.appointmentFormGroup.value });
    appointment.phone = this.patientService.generatePatientId(this.selectedCountryCode.dial_code, appointment.phone);

    /* Check if the date of the appointment changed. */
    const newKey = formatDate(appointment.date, 'YYYY-MM-dd', 'en-US');
    const isDateModified = this.editedAppointmentKey !== newKey;

    /* If the date of the appointment is the same [ time doesn't matter in this case ], simply update the existing appointment. */
    if (!isDateModified) {
      this.appointmentService.updateAppointment(appointment, this.editedAppointmentKey, this.editedAppointmentIndex).subscribe(() => {
        this.getAppointments();
        this.closeAppointmentDialog();
        this.appointmentFormGroup.reset();
        // TODO translation needed
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment Updated' });
      })

      return;
    }

    /* If the date of the appointment is changed, the appointment has to be moved entirely from its current date node into the updated one. */
    of(this.appointments)
      .pipe(
        switchMap(() => {
          /* Array of appointments for the original date node. */
          const appointmentsToRemoveFrom: AppointmentModel[] = [...this.appointments[this.editedAppointmentKey]];
          appointmentsToRemoveFrom.splice(this.editedAppointmentIndex, 1);
          return this.appointmentService.saveAppointment(appointmentsToRemoveFrom, this.editedAppointmentKey);
        }),
        switchMap(() => {
          /* Array of appointments for the new date node. */
          const appointmentsToAddTo: AppointmentModel[] = (this.appointments && this.appointments[newKey]) ? [...this.appointments[newKey]] : [];
          appointmentsToAddTo.push(appointment);
          return this.appointmentService.saveAppointment(appointmentsToAddTo, newKey);
        }),
        switchMap(() => this.appointmentService.getAppointments()),
        tap((updatedAppointments: AppointmentCollectionModel) => {
          this.appointments = updatedAppointments;
          this.closeAppointmentDialog();
          this.appointmentFormGroup.reset();
          // TODO translation needed
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment Changed' });
        })
      ).subscribe();
  }

  deleteAppointment(key: string, index: number): void {
    if (!this.appointments[key] || !this.appointments[key][index]) {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something Went Wrong' });
      return;
    }

    const appointmentId = this.appointmentService.generateAppointmentId(this.appointments[key][index].date);
    this.appointmentService.deleteAppointment2(appointmentId).subscribe((): void => {
      this.appointments[key].splice(index, 1);
      // TODO translation needed
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment Canceled' });
    }, () => {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something Went Wrong' });
    });
  }

  showTooltip(event: Event, tooltip: HTMLElement): void {
    event.stopPropagation();
    tooltip.focus();
  }

  hideTooltip(event: Event, tooltip: HTMLElement): void {
    tooltip.blur();
  }
}


