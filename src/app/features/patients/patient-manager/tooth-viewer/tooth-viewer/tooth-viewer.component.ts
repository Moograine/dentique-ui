import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ToothService } from '../../../../../core/services/tooth.service';
import { PreviousCare, PreviousCareModel, Tooth, ToothModel, ToothNotationModel, ToothStatus } from '../../../../../core/models/tooth.model';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { Calendar } from 'primeng/calendar';

@Component({
  selector: 'app-tooth-viewer',
  templateUrl: './tooth-viewer.component.html',
  styleUrls: ['./tooth-viewer.component.scss'],
  providers: [MessageService]
})
export class ToothViewerComponent implements AfterViewInit {
  @ViewChildren('previousCareLabel') previousCareLabels?: QueryList<ElementRef>;
  @ViewChild('parentContainer') previousCareParentContainer?: ElementRef;
  @ViewChild('treatmentInput') treatmentInput?: ElementRef;
  @ViewChild('dateInput') dateInput?: Calendar;
  @Output() hideToothDialog: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() patientId: number = 0;
  @Input() toothNotation: ToothNotationModel[] = [];
  @Input() patientToothChart: ToothModel[] = []; /* Patient tooth data in the UI, with a constant number (32) of tooth objects. */
  @Input() patientToothData: ToothModel[] = []; /* Patient tooth data directly from the API. */
  @Input() toothIndex: number = 0;
  previousCareToShow: PreviousCareModel = new PreviousCare();
  previousCareBeforeSave: PreviousCareModel = new PreviousCare();
  previousCareToShowIndex = -1;
  isNewPreviousCare = false;
  cancelSave = false;
  showPreviousCareDialog = false;
  isDragging = false;
  private lastTouchTime = 0;
  private doubleTapDelay = 300;

  constructor(private toothService: ToothService, private messageService: MessageService) {
  }

  ngAfterViewInit() {
    this.displayPreviousCares();
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

      const previousCares = this.patientToothChart[this.toothIndex].previousCares;

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

    const previousCare: PreviousCareModel = new PreviousCare();
    previousCare.positionX = positionX;
    previousCare.positionY = positionY;
    this.showPreviousCareDialog = true;
    this.patientToothChart[this.toothIndex].previousCares.push(previousCare);
    this.previousCareToShowIndex = this.patientToothChart[this.toothIndex].previousCares.length - 1;
    this.previousCareToShow = this.patientToothChart[this.toothIndex].previousCares[this.previousCareToShowIndex];

    const toothIndexApi = this.calculateToothDataIndex();
    console.log(toothIndexApi);

    if (toothIndexApi < 0) {
      /* There is no registered data on this tooth [ by its ID ] so we'll record it in the database, with the previous care. */
      const tooth: ToothModel = {
        id: this.patientToothChart[this.toothIndex].id,
        status: ToothStatus.Intact,
        previousCares: [previousCare]
      }
      this.patientToothData.push(new Tooth({ ...tooth }));
      this.toothService.saveTooth(this.patientId, this.patientToothData.length - 1, tooth).subscribe();
    } else {
      /* This tooth exists in the database [ by its ID ] so we'll save the previous care directly for the already existing tooth. */
      this.patientToothData[toothIndexApi].previousCares.push(previousCare);
      this.savePreviousCarePosition(positionX, positionY, this.previousCareToShowIndex);
    }

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

  /** Returns the index of the current tooth which is displayed, on database level. **/
  calculateToothDataIndex(): number {
    // TODO it's possibly a good idea to optimize this or any similar calculations by SENDING the already pre-caluclated API index from the Patient-Manager
    for (let toothIndex = 0; toothIndex < this.patientToothData.length; toothIndex++) {
      /*
         Please note that the tooth index system is different on UI and API side.
         To avoid redundant data in the database, tooth data is registered in the database only if:
            1. Tooth is missing
            2. Tooth is replaced with implantation
            3. Tooth had any previous cares
         However, on the UI side, there is a constant 32 tooth items which are displayed.
      */
      if (this.patientToothData[toothIndex].id === this.patientToothChart[this.toothIndex].id) {
        return toothIndex;
      }
    }

    /* If there's no match, it means that there is no data registered for this tooth yet in the database. */
    return -1;
  }

  closePreviousCareDialog(): void {
    this.showPreviousCareDialog = false;
  }

  onDialogClose(): void {
    /* Avoid bug, which results in the calendar remaining open while the dialog is closed */
    this.dateInput && (this.dateInput.overlayVisible = false);
    if (!this.cancelSave) {
      this.savePreviousCare();
    }
    this.cancelSave = false;
  }

  isPreviousCareModified(): boolean {
    return JSON.stringify(this.previousCareBeforeSave) !== JSON.stringify(this.previousCareToShow);
  }

  deletePreviousCare(): void {
    this.cancelSave = true;
    this.closePreviousCareDialog();
    const toothIndexApi = this.calculateToothDataIndex();
    this.patientToothData[toothIndexApi].previousCares.splice(this.previousCareToShowIndex, 1);
    this.patientToothChart[this.toothIndex].previousCares = [ ...this.patientToothData[toothIndexApi].previousCares ];

    if (!this.patientToothData[toothIndexApi].previousCares.length && this.patientToothData[toothIndexApi].status === ToothStatus.Intact) {
      this.patientToothData.splice(toothIndexApi, 1);
      this.toothService.savePatientToothChart(this.patientId, this.patientToothData).subscribe(() => {
        // TODO translation needed
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Previous treatment deleted.' });
      });
      return;
    }

    const tooth: ToothModel = {
      id: this.patientToothData[toothIndexApi].id,
      status: this.patientToothData[toothIndexApi].status,
      previousCares: this.patientToothData[toothIndexApi].previousCares
    }
    this.toothService.saveTooth(this.patientId, toothIndexApi, tooth).subscribe(() => {
      // TODO translation needed
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Previous treatment deleted.' });
    });
  }

  savePreviousCare(): void {
    if (!this.isPreviousCareModified()) {
      this.isNewPreviousCare = false;
      return;
    }

    /* Similar to calculateToothDataIndex() */
    let toothIndexApi = -1;
    for (let toothIndex = 0; toothIndex < this.patientToothData.length; toothIndex++) {
      if (this.patientToothData[toothIndex].id === this.patientToothChart[this.toothIndex].id) {
        toothIndexApi = toothIndex;
        this.toothService.savePreviousCare(this.patientId, toothIndexApi, this.previousCareToShowIndex, this.previousCareToShow).subscribe(() => {
          this.isNewPreviousCare = false;
          // TODO translation needed
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Saved.' });
        });
        break;
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

  dragEndedPreviousCare(event: CdkDragEnd, previousCareIndex: number): void {
    this.isDragging = true;
    if (this.previousCareParentContainer) {
      const previousCareRect = event.source.element.nativeElement.getBoundingClientRect();
      const coordinatesInPercentage = this.calculateTopLeftPercentage(previousCareRect.left, previousCareRect.top, this.previousCareParentContainer);
      let positionX = coordinatesInPercentage.positionX || 50; /* Make sure they are valid percentages */
      let positionY = coordinatesInPercentage.positionY || 50; /* Make sure they are valid percentages */
      this.savePreviousCarePosition(positionX, positionY, previousCareIndex);
    }
  }

  savePreviousCarePosition(positionX: number, positionY: number, previousCareIndex: number): void {
    this.patientToothChart[this.toothIndex].previousCares[previousCareIndex].positionX = positionX;
    this.patientToothChart[this.toothIndex].previousCares[previousCareIndex].positionY = positionY;
    const previousCare = { ...this.patientToothChart[this.toothIndex].previousCares[previousCareIndex] };
    const toothIndexApi = this.calculateToothDataIndex();
    this.toothService.savePreviousCare(this.patientId, toothIndexApi, previousCareIndex, previousCare).subscribe();
  }

  displayPreviousCareDialog(previousCareIndex: number): void {
    this.previousCareToShowIndex = previousCareIndex;
    this.previousCareToShow = this.patientToothChart[this.toothIndex].previousCares[previousCareIndex];
    this.previousCareBeforeSave = new PreviousCare({ ...this.previousCareToShow });
    this.showPreviousCareDialog = !this.isDragging;
    this.isDragging = false;
  }

  closeToothDialog(): void {
    this.hideToothDialog.emit(true);
  }
}
