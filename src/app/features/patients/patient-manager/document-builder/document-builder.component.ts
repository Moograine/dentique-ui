import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Patient, PatientModel } from '../../../../core/models/patient.model';
import { PreviousCareModel, ToothModel } from '../../../../core/models/tooth.model';
import { ServiceListService } from '../../../../core/services/services-list.service';
import { ServiceInvoice, ServiceInvoiceModel, DocumentTypeModel, ReceiptType } from '../../../../core/models/document.model';
import { ServiceTableItemModel } from '../../../../core/models/services-list.model';
import { TranslateService } from '@ngx-translate/core';
import { filter, take, takeWhile } from 'rxjs';
import { DoctorService } from '../../../../core/services/doctor.service';
import { CurrencyType } from '../../../../core/models/settings.model';


@Component({
  selector: 'app-document-builder',
  templateUrl: './document-builder.component.html',
  styleUrls: ['./document-builder.component.scss']
})
export class DocumentBuilderComponent implements OnInit, OnDestroy {
  @Input() patient: PatientModel = new Patient();
  @Output() hideDocumentBuilder: EventEmitter<boolean> = new EventEmitter<boolean>();
  activeComponent = true;
  availableServices: ServiceTableItemModel[] = [];
  documentTypes: DocumentTypeModel[] = [
    {
      label: 'invoice',
      icon: 'pi-euro'
    },
    {
      label: 'receipt',
      icon: 'pi-receipt'
    },
    {
      label: 'datasheet',
      icon: 'pi-book'
    }
  ];
  selectedDocumentType: DocumentTypeModel = {
    label: 'invoice',
    icon: 'pi-file'
  };
  currency: CurrencyType = 'eur'; // TODO think of a better way to initialize currency, as this happens in too many places
  invoiceDate = new Date();
  invoiceList: ServiceInvoiceModel[] = [];
  receiptTypes: ReceiptType[] = ['regular', 'antibiotics'];
  selectedReceiptType: ReceiptType = 'regular';
  receiptList = [];
  showAddInvoiceDialog = false;
  showInvoiceDialog = false;
  initializeInvoiceDialog = false;
  timeoutForInvoiceDialogAnimation?: number;
  showReceiptDialog = false;
  showDatasheetDialog = false;

  constructor(private servicesListService: ServiceListService, private translateService: TranslateService, private doctorService: DoctorService) {
  }

  ngOnInit() {
    this.initializeServices();
    this.initializePreferredCurrency();
    this.summarizeTreatments(new Date());
  }

  /** Function to initialize list of available services offered by this clinic **/
  initializeServices(): void {
    this.servicesListService.availableServiceFetch().pipe(
      filter((availableServices: ServiceTableItemModel[]) => availableServices.length > 0), /* Ensure only non-empty values pass through */
      take(1),
      takeWhile(() => this.activeComponent)).subscribe((availableServices: ServiceTableItemModel[]): void => {
      this.availableServices = this.servicesListService.cloneAvailableServices(availableServices);
    });
  }

  generateInvoice(previousCare: PreviousCareModel, toothId: string): ServiceInvoice {
    for (const service of this.availableServices) {
      if (service.label === previousCare.service.label) {
        return new ServiceInvoice(service, previousCare.date, previousCare.description, toothId, false);
      }
    }

    return new ServiceInvoice(previousCare.service, previousCare.date, previousCare.description, toothId, true);
  }

  /** Function to summarize treatments on the selected date **/
  summarizeTreatments(date: Date): void {
    // TODO create a new model for the invoicing, then map here, locally, in the app, all the services done on the particular dates
    if (!this.patient.toothChart?.length || !date) {
      return;
    }

    // TODO if you must do a quantity, then do it right, and calculate duplicates!

    this.patient.toothChart.forEach((tooth: ToothModel): void => {
      tooth.previousCares.forEach((previousCare: PreviousCareModel): void => {
        const datesMatch =
          date.getFullYear() === previousCare.date.getFullYear() &&
          date.getMonth() === previousCare.date.getMonth() &&
          date.getDate() === previousCare.date.getDate();
        if (datesMatch) {
          this.invoiceList.push(this.generateInvoice(previousCare, `${tooth.id}`));
        }
      });
    });
  }

  /** Function to initialize the preferred currency based on the doctor's settings **/
  initializePreferredCurrency(): void {
    this.doctorService.currencyFetch().pipe(
      filter((currency: CurrencyType) => currency.length > 0), /* Ensure only non-empty values pass through */
      take(2), /* First emitted value is the default value, which in this case is a non-empty string, so filter wil let it pass */
      takeWhile(() => this.activeComponent)).subscribe((currency: CurrencyType) => {
      this.currency = currency;
    });
  }

  /** Function to display dialog where the user can add additional invoice items to the list **/
  displayAddInvoiceDialog(): void {
    this.showAddInvoiceDialog = true;
  }

  /** Function to display dialog where the user can add additional invoice items to the list **/
  closeAddInvoiceDialog(): void {
    this.showAddInvoiceDialog = false;
  }

  /** Function to add an invoice item to the list of displayed invoices **/
  addInvoiceItem(service: ServiceTableItemModel): void {
    if (!service) {
      return;
    }

    this.invoiceList.push(new ServiceInvoice(service, this.invoiceDate, ''));
    this.closeAddInvoiceDialog();
  }

  /** Function to remove an invoice from to the list of displayed invoices **/
  deleteInvoiceItem(index: number): void {
    this.invoiceList.splice(index, 1);
  }

  /** Function which determines whether the PDF Viewer can be opened, based on whether there is any data to be displayed in the PDF **/
  isContentValid(): boolean {
    return !(this.selectedDocumentType.label === 'invoice' && this.invoiceList.length < 1);
  }

  closeDocumentBuilderDialog(): void {
    this.hideDocumentBuilder.emit(true);
  }

  displayPDF(): void {
    switch (this.selectedDocumentType.label) {
      case 'invoice':
        this.displayInvoiceDialog();
        break;
      case 'receipt':
        this.displayReceiptDialog();
        break;
      case 'datasheet':
        this.displayDatasheetDialog();
        break;
      default:
        this.displayDatasheetDialog();
    }
  }

  displayInvoiceDialog(): void {
    if (this.initializeInvoiceDialog) {
      return;
    }

    this.showInvoiceDialog = true;

    /* Timeout is used to avoid stacking data processing while dialog animation is still in process */
    clearTimeout(this.timeoutForInvoiceDialogAnimation);
    this.initializeInvoiceDialog = true;
  }

  closeInvoiceDialog(): void {
    this.showInvoiceDialog = false;
  }

  destroyInvoiceDialog(): void {
    this.timeoutForInvoiceDialogAnimation = window.setTimeout(() => this.initializeInvoiceDialog = false, 250);
  }

  displayReceiptDialog(): void {
    this.showReceiptDialog = true;
  }

  closeReceiptDialog(): void {
    this.showReceiptDialog = false;
  }

  displayDatasheetDialog(): void {
    this.showDatasheetDialog = true;
  }

  closeDatasheetDialog(): void {
    this.showDatasheetDialog = false;
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
