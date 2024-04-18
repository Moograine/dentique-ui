import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Patient, PatientDetails, PatientModel } from '../../../../core/models/patient.model';

@Component({
  selector: 'app-patient-details',
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss']
})
export class PatientDetailsComponent implements OnInit {
  /* Container DOM element used to focus Input element when editing the allergies, previous surgeries or chronic diseases. */
  @ViewChild('patientDetailsContainer') patientDetailsContainer?: ElementRef;
  @Input() patient: PatientModel = new Patient();
  @Input() patientDetailType: PatientDetails = 'previousSurgeries';
  translations = {
    title: '',
    header: ''
  }
  patientDetails: string[] = [];
  editableItemIndex = -1;

  ngOnInit() {
    console.log(this.patientDetailType);
    this.initializePatientDetails();
    this.initializeTranslations();
  }

  initializePatientDetails(): void {
    this.patientDetails = JSON.parse(JSON.stringify(this.patient[this.patientDetailType]));
  }

  initializeTranslations(): void {
    // TODO implement translations!
    switch (this.patientDetailType) {
      case 'previousSurgeries':
        this.translations = {
          title: 'previous_surgeries',
          header: 'operations'
        }
        break;
      case 'allergies':
        this.translations = {
          title: 'allergies',
          header: 'allergy'
        }
        break;
      case 'chronicDiseases':
        this.translations = {
          title: 'chronic_diseases',
          header: 'disease'
        }
        break;
      case 'familyHealthHistory':
        this.translations = {
          title: 'family_health_history',
          header: 'history'
        }
        break;
    }
  }

  addPatientDetail(container?: ElementRef): void {
    if (container) {
      setTimeout(() => {
        const containerChildren = container.nativeElement.children;
        const input = containerChildren[2].children[containerChildren[2].children.length - 1];
        input.children[0].focus();
      });
    }

    this.editableItemIndex = this.patient[this.patientDetailType].length;
    console.log(this.patientDetailType);
    console.log(this.patient);
    console.log(this.patient[this.patientDetailType]);
    this.patient[this.patientDetailType].push('');
    this.patientDetails.push('');
  }

  resetEditableItemIndex(): void {
    this.editableItemIndex = -1;
  }

  restorePatientDetailToOriginalState(): void {
    for (let index = 0; index < this.patient[this.patientDetailType].length; index++) {
      if (!this.patientDetails[index]) {
        this.patient[this.patientDetailType].splice(index, 1);
        break;
      }
      this.patient[this.patientDetailType][index] = this.patientDetails[index];
    }
  }

  ngForTracker(index: number, item: string) {
    return index
  }

  editPatientDetail(index: number, container?: HTMLDivElement): void {
    if (container) {
      setTimeout(() => {
        const containerChildren = container.children;
        const input = containerChildren[2].children[index];
        (input.children[0] as HTMLInputElement).focus();
      });
    }
    this.restorePatientDetailToOriginalState();
    this.editableItemIndex = index;
  }

  cancelPatientDetailEdit(): void {
    this.restorePatientDetailToOriginalState();
    this.resetEditableItemIndex();
  }

  deletePatientDetail(index: number): void {
    this.patient[this.patientDetailType].splice(index, 1);
    this.patientDetails = JSON.parse(JSON.stringify(this.patient[this.patientDetailType]));
    this.resetEditableItemIndex();
  }

  savePatientDetail(disabled: boolean): void {
    if (disabled) {
      return;
    }

    this.patientDetails = JSON.parse(JSON.stringify(this.patient[this.patientDetailType]));
    this.resetEditableItemIndex();
  }
}
