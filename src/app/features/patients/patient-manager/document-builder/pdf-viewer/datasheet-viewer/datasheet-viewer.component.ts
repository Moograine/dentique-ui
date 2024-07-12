import { Component, Input } from '@angular/core';
import { Patient, PatientModel } from '../../../../../../core/models/patient.model';

@Component({
  selector: 'app-datasheet-viewer',
  templateUrl: './datasheet-viewer.component.html',
  styleUrls: ['./datasheet-viewer.component.scss']
})
export class DatasheetViewerComponent {
  @Input() patient: PatientModel = new Patient();

  // TODO duplicate
  /** Function which takes a raw phone number from the patient data and converts to a readable phone number with dial code **/
  convertPhoneNumber(phone: string): string {
    if (!phone.length) {
      return '';
    }

    return `+${phone.replace('-', '').slice(2)}`;
  }
}
