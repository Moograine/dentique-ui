import { Component, Input } from '@angular/core';
import { Patient, PatientModel } from '../../../../../../core/models/patient.model';

@Component({
  selector: 'app-receipt-viewer',
  templateUrl: './receipt-viewer.component.html',
  styleUrls: ['./receipt-viewer.component.scss']
})
export class ReceiptViewerComponent {
  @Input() patient: PatientModel = new Patient();
  @Input() receiptType: 'regular' | 'antibiotics' = 'regular';
  today = new Date();
}
