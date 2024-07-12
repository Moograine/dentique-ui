import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { ToothService } from '../../../../../core/services/tooth.service';
import {
  PreviousCare,
  PreviousCareModel,
  Tooth,
  ToothModel,
  ToothNotation,
  ToothNotationModel,
  ToothStatus
} from '../../../../../core/models/tooth.model';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { MenuItem, MessageService } from 'primeng/api';
import { Calendar } from 'primeng/calendar';
import { TranslateService } from '@ngx-translate/core';
import { Menu } from 'primeng/menu';
import { ServiceListService } from '../../../../../core/services/services-list.service';
import { filter, take, takeWhile } from 'rxjs';
import { ServiceTableItem, ServiceTableItemModel } from '../../../../../core/models/services-list.model';

@Component({
  selector: 'app-tooth-viewer',
  templateUrl: './tooth-viewer.component.html',
  styleUrls: ['./tooth-viewer.component.scss'],
  providers: [MessageService]
})
export class ToothViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('previousCareLabel') previousCareLabels?: QueryList<ElementRef>;
  @ViewChild('parentContainer') previousCareParentContainer?: ElementRef;
  @ViewChild('treatmentInput') treatmentInput?: ElementRef;
  @ViewChild('dateInput') dateInput?: Calendar;
  @Output() hideToothDialog: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() forceToothDialog: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() notation: ToothNotationModel = new ToothNotation();
  @Input() tooth: ToothModel = new Tooth(); /* Patient tooth data in the UI, with a constant number (32) of tooth objects. */
  activeComponent = true;
  availableServices: ServiceTableItemModel[] = [];
  toothStatusOptions: MenuItem[] = [
    {
      label: this.translateService.instant('patient_manager.tooth_status'),
      items: [
        {
          label: this.translateService.instant('patient_manager.intact'),
          icon: 'pi pi-check',
          command: () => this.changeToothStatus(ToothStatus.Intact)
        },
        {
          label: this.translateService.instant('patient_manager.implant'),
          icon: 'pi pi-filter-fill',
          command: () => this.changeToothStatus(ToothStatus.Implant)
        },
        {
          label: this.translateService.instant('patient_manager.missing'),
          icon: 'pi pi-times-circle',
          command: () => this.changeToothStatus(ToothStatus.Missing)
        }
      ]
    }
  ];
  previousCareToShow: PreviousCareModel = new PreviousCare();
  previousCareToShowIndex = -1;
  selectedAvailableService: ServiceTableItemModel = new ServiceTableItem();
  isNewPreviousCare = false;
  showPreviousCareDialog = false;
  showMissingServiceWarning = false;
  isAvailableServiceMissing = false;
  isDragging = false;
  private lastTouchTime = 0;
  private doubleTapDelay = 300;

  constructor(private toothService: ToothService,
              private messageService: MessageService,
              private servicesListService: ServiceListService,
              private translateService: TranslateService) {
  }

  ngOnInit() {
    this.initializeServices();
  }

  ngAfterViewInit() {
    this.displayPreviousCares();
  }

  /** Function to change status of the tooth **/
  changeToothStatus(status: ToothStatus): void {
    this.tooth.status = status;
  }

  /** Initializing previous cares, as the user opens a tooth for inspection. **/
  displayPreviousCares(): void {
    this.previousCareLabels?.forEach((previousCareLabel: ElementRef, previousCareIndex: number) => {
      // TODO implement a playful way to display different colors for different labels
      /* Different color combinations for previous care labels. */
      const labelStyles = [
        {
          first: 'border-indigo-800',
          last: 'border-indigo-800 bg-indigo-800 hover:bg-indigo-700'
        },
        {
          first: 'border-indigo-600',
          last: 'border-indigo-600 bg-indigo-600 hover:bg-indigo-500'
        },
        {
          first: 'border-red-700',
          last: 'border-red-700 bg-red-700 hover:bg-red-600'
        },
        {
          first: 'border-blue-800',
          last: 'border-blue-800 bg-blue-800 hover:bg-blue-700'
        },
        {
          first: 'border-blue-700',
          last: 'border-blue-700 bg-blue-700 hover:bg-blue-600'
        },
        {
          first: 'border-cyan-800',
          last: 'border-cyan-800 bg-cyan-800 hover:bg-cyan-700'
        }
      ]

      const previousCares = this.tooth.previousCares;

      if (previousCares[previousCareIndex]) {
        const nativeElement = previousCareLabel.nativeElement;
        nativeElement.style.left = `${previousCares[previousCareIndex].positionX}%`;
        nativeElement.style.top = `${previousCares[previousCareIndex].positionY}%`;
        setTimeout(() => {
          nativeElement.style.opacity = 1
        }, 125 * (previousCareIndex + 1));

        /* Currently, there are 6 sets of label styles. If there are more than 6 previous cares, from then on, every label will have the same set of style. */
        const labelStylesIndex = previousCareIndex < labelStyles.length ? previousCareIndex : 1;
        nativeElement.firstChild.classList.add(labelStyles[labelStylesIndex].first);
        nativeElement.lastChild.classList.add(...labelStyles[labelStylesIndex].last.split(' '));
      }
    });
  }

  /** Function to initialize list of available services offered by this clinic **/
  initializeServices(): void {
    this.servicesListService.availableServiceFetch().pipe(
      filter((availableServices: ServiceTableItemModel[]) => availableServices.length > 0), /* Ensure only non-empty values pass through */
      take(1),
      takeWhile(() => this.activeComponent)).subscribe((availableServices: ServiceTableItemModel[]): void => {
      this.availableServices = this.servicesListService.cloneAvailableServices(availableServices);
    }, () => {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.generic_error')
      });
    });
  }

  /** Displays menu for choosing status of the tooth **/
  toggleStatusMenu(statusMenu: Menu, event: MouseEvent): void {
    statusMenu.toggle(event);
  }

  /** Helper for function addPreviousCare(), in case the user is using a touchscreen. **/
  onTouchStart(event: TouchEvent): void {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTouchTime;
    if (tapLength < this.doubleTapDelay && tapLength > 0) {
      this.addPreviousCare(event);
      event.preventDefault();
    }
    this.lastTouchTime = currentTime;
  }

  /** This bad boy calculates the X and Y screen percentages relative to the parent container. Arguments are given in pixels. **/
  calculateTopLeftPercentage(itemPositionX: number, itemPositionY: number, parent: ElementRef): { positionX: number, positionY: number } {
    const parentRect = parent.nativeElement.getBoundingClientRect();
    const positionX = (itemPositionX - parentRect.left) / parentRect.width * 100;
    const positionY = (itemPositionY - parentRect.top) / parentRect.height * 100;
    return { positionX, positionY };
  }

  /** Function to add previous care to the selected tooth. Also initializes screen coordinates in percentage. **/
  addPreviousCare(event: MouseEvent | TouchEvent): void {
    let positionX = 50; /* Default position value in case of unprecedented event type */
    let positionY = 50; /* Default position value in case of unprecedented event type */
    this.isNewPreviousCare = true;

    if (this.previousCareParentContainer) {
      const { clientX, clientY } = event.type === 'dblclick' ? (event as MouseEvent) : (event as TouchEvent).touches[0];
      const coordinatesInPercentage = this.calculateTopLeftPercentage(clientX, clientY, this.previousCareParentContainer);
      positionX = coordinatesInPercentage.positionX || 50;
      positionY = coordinatesInPercentage.positionY - 6.5 || 50; /* 6.5% is relatively the height of the label div in the screen */
    }

    let availableService: ServiceTableItemModel = new ServiceTableItem();
    if (this.availableServices[0]?.label?.length) {
      availableService = this.availableServices[0];
    }

    const previousCare: PreviousCareModel = new PreviousCare({ service: availableService });
    previousCare.positionX = positionX;
    previousCare.positionY = positionY;
    this.showPreviousCareDialog = true;
    this.tooth.previousCares.push(previousCare);
    this.previousCareToShowIndex = this.tooth.previousCares.length - 1;
    this.previousCareToShow = this.tooth.previousCares[this.previousCareToShowIndex];

    /* Position the newly added previous care and add color */
    setTimeout(() => {
      if (this.previousCareLabels) {
        this.previousCareLabels.last.nativeElement.style.top = `${positionY}%`;
        this.previousCareLabels.last.nativeElement.style.left = `${positionX}%`;
        this.previousCareLabels.last.nativeElement.style.opacity = 1;
        this.previousCareLabels.last.nativeElement.firstChild.classList.add('border-blue-600');
        this.previousCareLabels.last.nativeElement.lastChild.classList.add('bg-blue-600');
        this.previousCareLabels.last.nativeElement.lastChild.classList.add('border-blue-600');
        this.previousCareLabels.last.nativeElement.lastChild.classList.add('hover:bg-blue-500');
      }
    }, 0);
  }

  /** Function to close previous care dialog **/
  closePreviousCareDialog(): void {
    this.showPreviousCareDialog = false;
  }

  /** Function to handle component behavior after closing the
   * previous care dialog, and reset the list of available services **/
  onPreviousCareDialogClose(): void {
    /* Avoid bug, which results in the calendar remaining open while the dialog is closed */
    this.dateInput && (this.dateInput.overlayVisible = false);
    this.isNewPreviousCare = false;
    this.forceToothDialog.emit(false);

    /* Reset the list of available services, in case an item was added, due to a service being absent */
    if (this.isAvailableServiceMissing) {
      this.availableServices.pop();
      this.showMissingServiceWarning = false;
      this.isAvailableServiceMissing = false;
    }

    this.removeAnyInvalidPreviousCare();
  }

  /** Function to check whether a tooth has any invalid previous care after closing the Previous Care Dialog, and in case there is, remove it **/
  removeAnyInvalidPreviousCare(): void {
    if (!this.tooth.previousCares[this.previousCareToShowIndex]?.service?.label?.length) {
      this.tooth.previousCares.splice(this.previousCareToShowIndex, 1);
    }
  }

  /** Function to remove previous care item and close the dialog **/
  deletePreviousCare(): void {
    this.closePreviousCareDialog();
    this.tooth.previousCares.splice(this.previousCareToShowIndex, 1);
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('notifications.success'),
      detail: this.translateService.instant('notifications.previous_care_deleted')
    });
  }

  /** Function to handle autofocusing input **/
  focusNextInput(input: HTMLInputElement | HTMLTextAreaElement | Calendar): void {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.focus();
      return;
    }

    input.inputfieldViewChild.nativeElement.focus();
  }

  /** Function to handle component behavior after dragging previous care label, and calculate new label position in container **/
  dragEndedPreviousCare(event: CdkDragEnd, previousCareIndex: number): void {
    this.isDragging = true;
    if (this.previousCareParentContainer) {
      const previousCareRect = event.source.element.nativeElement.getBoundingClientRect();
      const coordinatesInPercentage = this.calculateTopLeftPercentage(previousCareRect.left, previousCareRect.top, this.previousCareParentContainer);
      let positionX = coordinatesInPercentage.positionX || 50; /* Make sure they are valid percentages */
      let positionY = coordinatesInPercentage.positionY || 50; /* Make sure they are valid percentages */
      this.tooth.previousCares[previousCareIndex].positionX = positionX;
      this.tooth.previousCares[previousCareIndex].positionY = positionY;
    }
  }

  /** Function to assign a new service to previous care **/
  assignServiceToPreviousCare(previousCare: PreviousCareModel, service: ServiceTableItemModel): void {
    previousCare.service = new ServiceTableItem(
      service.id,
      service.label,
      undefined,
      service.price,
      service.custom
    );
  }

  /** Function to change selected available service **/
  changeSelectedAvailableService(availableService: ServiceTableItemModel): void {
    if (!availableService) {
      return;
    }

    if (this.isAvailableServiceMissing) {
      this.showMissingServiceWarning = availableService === this.availableServices[this.availableServices.length - 1];
    }

    this.assignServiceToPreviousCare(this.previousCareToShow, availableService);
  }

  /** Function to process the offered service of the currently displayed previous care.
   * There could be services which are no longer saved in the clinic's database, so, to respect the
   * relation between the PrimeNG Dropdown [options] and [(ngModel)], it's imperative that the value of [(ngModel)]
   * is part of the listed [options]. This function checks if the previous care's service is part of the availableServices array,
   * which is the [options] for the Dropdown component. In case the fetched service isn't included in the [options], it will be temporarily added. **/
  processDisplayedAvailableService(previousCare: PreviousCareModel): void {
    this.previousCareToShow = previousCare;
    for (let service of this.availableServices) {
      if (service.label === previousCare.service.label) {
        this.assignServiceToPreviousCare(previousCare, service);
        this.selectedAvailableService = service;
        return;
      }
    }

    this.showMissingServiceWarning = true;
    this.isAvailableServiceMissing = true;
    const searchLabel = previousCare.service.custom ? previousCare.service.label :
      this.translateService.instant('services_list.' + previousCare.service.label);
    const missingServiceTableItem = new ServiceTableItem(
      previousCare.service.id,
      previousCare.service.label,
      searchLabel,
      previousCare.service.price,
      previousCare.service.custom,
      false
    );
    this.availableServices.push(missingServiceTableItem);
    this.selectedAvailableService = missingServiceTableItem;
    this.assignServiceToPreviousCare(previousCare, missingServiceTableItem);
  }

  /** Function to display previous care dialog, and assign displayed previous care. **/
  displayPreviousCareDialog(previousCareIndex: number): void {
    this.previousCareToShowIndex = previousCareIndex;
    this.processDisplayedAvailableService(this.tooth.previousCares[previousCareIndex]);
    this.showPreviousCareDialog = !this.isDragging;
    this.isDragging = false;
  }

  /** Function to emit a signal to the parent component, that this component is finished and can be destroyed **/
  closeToothDialog(): void {
    this.hideToothDialog.emit(true);
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

  /** Function to set 'activeComponent' to false when the component is destroyed, to make sure every subscription is destroyed **/
  ngOnDestroy() {
    this.activeComponent = false;
  }
}
