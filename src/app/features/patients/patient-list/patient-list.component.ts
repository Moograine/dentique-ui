import { Component, OnDestroy, OnInit } from '@angular/core';
import { PatientCollectionModel, PatientModel } from '../../../core/models/patient.model';
import { PatientService } from '../../../core/services/patient.service';
import { filter, take, takeWhile } from 'rxjs';
import { MessageService } from 'primeng/api';
import { MaintenanceService } from '../../../core/services/maintenance.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss'],
  providers: [MessageService]
})
export class PatientListComponent implements OnInit, OnDestroy {
  patientCollection: PatientCollectionModel = {};
  activeComponent = true;

  constructor(private patientService: PatientService,
              private messageService: MessageService,
              private translateService: TranslateService,
              private router: Router,
              private maintenanceService: MaintenanceService) {
  }

  ngOnInit() {
    this.initializePatientCollection();
  }

  /** Function to populate patientCollection with every accessible patient **/
  initializePatientCollection(): void {
    this.patientService.patientCollectionFetch().pipe(
      /* Ensure only non-empty values pass through */
      filter((patientCollection: PatientCollectionModel) => !this.emptyPatientCollection(patientCollection)),
      take(1),
      takeWhile(() => this.activeComponent)
    ).subscribe((patientCollection: PatientCollectionModel): void => {
      this.patientCollection = patientCollection;
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Function which takes an appointment collection object, and returns a boolean value based on whether the object is empty **/
  emptyPatientCollection(patientCollection: PatientCollectionModel): boolean {
    return !Object.keys(patientCollection).length;
  }

  // TODO duplicate
  /** Function which takes a raw phone number from the patient data and converts to a readable phone number with dial code **/
  convertPhoneNumber(phone: string): string {
    if (!phone.length) {
      return '';
    }

    return `+${phone.replace('-', '').slice(2)}`;
  }

  /** Function to navigate to the Patient Manager, and load the selected patient, if there's any **/
  navigateToPatientManager(patient?: PatientModel): void {
    if (patient) {
      this.patientService.setActivePatient(patient);
    }

    this.router.navigate(['patient-manager']).then();
  }

  ngOnDestroy() {
    this.activeComponent = false;
  }
}
