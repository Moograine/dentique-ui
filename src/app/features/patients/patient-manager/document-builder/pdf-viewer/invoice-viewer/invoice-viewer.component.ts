import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patient, PatientModel } from '../../../../../../core/models/patient.model';
import { CurrencyType } from '../../../../../../core/models/settings.model';
import { ServiceInvoiceModel } from '../../../../../../core/models/document.model';
import { ToothInvoiceModel } from '../../../../../../core/models/tooth.model';
import { PatientService } from '../../../../../../core/services/patient.service';
import { ToothService } from '../../../../../../core/services/tooth.service';

@Component({
  selector: 'app-invoice-viewer',
  templateUrl: './invoice-viewer.component.html',
  styleUrls: ['./invoice-viewer.component.scss']
})
export class InvoiceViewerComponent implements OnInit {
  @Input() patient: PatientModel = new Patient();
  @Input() currency: CurrencyType = 'eur'; // TODO think of a better way
  @Input() summary: ServiceInvoiceModel[] = [];
  @Input() showToothIllustration: boolean = true; // TODO implement possibility to show or hide tooth illustration
  today: Date = new Date();
  invoiceNo: number = 7426491;
  totalPrice: number = 0;
  // TODO in SCSS make sure min height is changed, because in full screen mode, it seems weird
  toothInvoiceListTop: ToothInvoiceModel[] = [];
  toothInvoiceListBottom: ToothInvoiceModel[] = [];

  constructor(private toothService: ToothService) {
  }

  ngOnInit() {
    this.displayToothDots();
    this.calculateTotalPrice();
  }

  /** Function to position red dots on the tooth illustration, where a service was applied on the respective tooth **/
  displayToothDots(): void {
    console.log(this.summary);
    // TODO any tooth with an id < 17 is to be added to the this.toothInvoiceListTop, else to the this.toothInvoiceListBottom

    const toothIdCollection: { [key: string]: boolean } = {};
    this.summary.forEach(invoice => {
      toothIdCollection[invoice.toothId] = true;
    });

    Object.keys(toothIdCollection).forEach(key => {
      if (!key.length) {
        return;
      }

      Number(key) < 17 ?
        this.toothInvoiceListTop.push(this.toothService.toothMarks[key]) : this.toothInvoiceListBottom.push(this.toothService.toothMarks[key]);
    });


    // const changedTooth = this.toothService.toothChartForPDF[30];
    // console.log(changedTooth);
    //
    // this.toothInvoiceListBottom.push(changedTooth);
  }

  /** Function to calculate the total price of services rendered on the selected date **/
  calculateTotalPrice(): void {
    let price = 0;
    this.summary.forEach(invoice => {
      price += invoice.service.price;
    });

    this.totalPrice = price;
  }

  // TODO duplicate, there are many
  /** Function which takes a raw phone number from the patient data and converts to a readable phone number with dial code **/
  convertPhoneNumber(phone: string): string {
    if (!phone.length) {
      return '';
    }

    return `+${phone.replace('-', '').slice(2)}`;
  }
}
