import { Component, OnInit } from '@angular/core';
import { of, switchMap, tap } from 'rxjs';
import { formatDate } from '@angular/common';
import { Appointment, AppointmentCollectionModel, AppointmentModel } from '../../../core/models/appointment.model';
import { AppointmentService } from '../../../core/services/appointment.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Calendar } from 'primeng/calendar';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-appointment-dashboard',
  templateUrl: './appointment-dashboard.component.html',
  styleUrls: ['./appointment-dashboard.component.scss'],
  providers: [MessageService]
})
export class AppointmentDashboardComponent implements OnInit {
  appointments: AppointmentCollectionModel = {};
  today = new Date();
  showAppointmentDialog = false;
  editedAppointmentIndex = -1;
  editedAppointmentKey = '';
  appointmentFormGroup: FormGroup = this.formBuilder.group({
    firstName: [''],
    lastName: [''],
    date: [new Date()],
    phone: [''],
    description: ['']
  })

  constructor(private appointmentService: AppointmentService, private formBuilder: FormBuilder, private messageService: MessageService) {
  }

  ngOnInit() {
    this.getAppointments();
  }

  getAppointments(): void {
    this.appointmentService.getAppointments().subscribe((appointments: AppointmentCollectionModel) => {
      this.appointments = appointments;
    })
  }

  navigateToPatient(patientId: string): void {
    console.log('You navigated to patient with ID ', patientId, '.');
  }

  displayAddAppointmentDialog(): void {
    this.showAppointmentDialog = true;
  }

  displayUpdateAppointmentDialog(key: string, index: number, appointment: AppointmentModel): void {
    this.showAppointmentDialog = true;
    this.editedAppointmentIndex = index;
    this.editedAppointmentKey = key;
    this.appointmentFormGroup.patchValue({
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      date: appointment.date,
      phone: appointment.phone,
      description: appointment.description
    })
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

  onDialogClose(): void {
    this.editedAppointmentIndex = -1;
    this.editedAppointmentKey = '';
    this.appointmentFormGroup.reset();
    this.appointmentFormGroup.get('date')?.setValue(new Date());
  }

  saveAppointment(): void {
    const appointment = new Appointment({ ...this.appointmentFormGroup.value });
    const key = formatDate(appointment.date, 'YYYY-MM-dd', 'en-US');

    of(this.appointments)
      .pipe(
        switchMap((allAppointments: AppointmentCollectionModel) => {
          const appointmentsByDate: AppointmentModel[] = (allAppointments && allAppointments[key]) ? allAppointments[key] : [];
          appointmentsByDate.push(appointment);
          return this.appointmentService.saveAppointment(appointmentsByDate, key);
        }),
        switchMap(() => this.appointmentService.getAppointments()),
        tap((updatedAppointments: AppointmentCollectionModel) => {
          this.appointments = updatedAppointments;
          this.closeAppointmentDialog();
          this.appointmentFormGroup.reset();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment Created' });
        })
      ).subscribe();
  }

  updateAppointment(): void {
    if (!this.editedAppointmentKey.length || this.editedAppointmentIndex < 0) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something Went Wrong' });
      return;
    }

    const appointment = new Appointment({ ...this.appointmentFormGroup.value });

    /* Check if the date of the appointment changed. */
    const newKey = formatDate(appointment.date, 'YYYY-MM-dd', 'en-US');
    const isDateModified = this.editedAppointmentKey !== newKey;

    /* If the date of the appointment is the same [ time doesn't matter in this case ], simply update the existing appointment. */
    if (!isDateModified) {
      this.appointmentService.updateAppointment(appointment, this.editedAppointmentKey, this.editedAppointmentIndex).subscribe(() => {
        this.getAppointments();
        this.closeAppointmentDialog();
        this.appointmentFormGroup.reset();
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
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment Changed' });
        })
      ).subscribe();
  }

  deleteAppointment(key: string, index: number): void {
    if (!this.appointments[key]) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something Went Wrong' });
      return;
    }

    const appointmentsByDate: AppointmentModel[] = [...this.appointments[key]];
    appointmentsByDate.splice(index, 1);
    this.appointmentService.saveAppointment(appointmentsByDate, key).subscribe(() => {
      this.getAppointments();
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Appointment Canceled' });
    })
  }
}
