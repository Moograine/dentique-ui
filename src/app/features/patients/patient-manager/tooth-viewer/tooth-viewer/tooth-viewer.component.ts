import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ToothService } from '../../../../../core/services/tooth.service';
import {
  PreviousCare,
  PreviousCareModel,
  Tooth,
  ToothModel,
  ToothNotationModel,
  ToothStatus
} from '../../../../../core/models/tooth.model';
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
  @ViewChildren('previousCareLabel') previousCareLabels!: QueryList<ElementRef>;
  @ViewChild('parentContainer') previousCareParentContainer: ElementRef | undefined;
  @ViewChild('treatmentInput') treatmentInput: ElementRef | undefined;
  @Output() hideToothDialog: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() patientId: number = 0;
  @Input() toothNotation: ToothNotationModel[] = [];
  @Input() patientToothChart: ToothModel[] = [];
  @Input() patientToothData: ToothModel[] = [];
  @Input() toothIndex: number = 0;
  previousCareToShow: PreviousCareModel = new PreviousCare();
  previousCareToShowIndex = 0;
  previousCareToShowDate: Date = new Date();
  showPreviousCareDialog = false;
  isDragging = false;
  private lastTouchTime = 0;
  private doubleTapDelay = 300;
  today = new Date();

  constructor(private toothService: ToothService, private messageService: MessageService) {
  }

  ngAfterViewInit() {
    this.displayPreviousCares();
  }

  /** Initializing previous cares, as the user opens a tooth for inspection. **/
  displayPreviousCares(): void {
    this.previousCareLabels.forEach((previousCareLabel: ElementRef, previousCareIndex: number) => {
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
      this.savePreviousCarePosition(positionX, positionY, this.previousCareToShowIndex);
    }

    /* Position the newly added previous care and add color */
    setTimeout(() => {
      this.previousCareLabels.last.nativeElement.style.top = `${positionY}%`;
      this.previousCareLabels.last.nativeElement.style.left = `${positionX}%`;
      this.previousCareLabels.last.nativeElement.style.opacity = 1;
      this.previousCareLabels.last.nativeElement.firstChild.classList.add('border-blue-600');
      this.previousCareLabels.last.nativeElement.lastChild.classList.add('bg-blue-600');
      this.previousCareLabels.last.nativeElement.lastChild.classList.add('border-blue-600');
      this.previousCareLabels.last.nativeElement.lastChild.classList.add('hover:bg-blue-500');
    }, 0);
  }

  /** Returns the index of the current tooth which is displayed, on database level. **/
  calculateToothDataIndex(): number {
    for (let toothIndex = 0; toothIndex < this.patientToothData.length; toothIndex++) {
      /* Please note that index starts from 0, id on the other hand is the actual UNS notation based indexing, which starts from 1. */
      if (this.patientToothData[toothIndex].id === this.patientToothChart[this.toothIndex].id) {
        return toothIndex;
      }
    }

    /* If there's no match, it means that there is no data registered for this tooth yet in the database. */
    return -1;
  }

  closeDialogAndSavePreviousCare(): void {
    this.showPreviousCareDialog = false;
    this.savePreviousCare();
  }

  cancelPreviousCareDialog(): void {
    this.showPreviousCareDialog = false;
  }

  savePreviousCare(): void {
    let toothIndexApi = -1;
    for (let toothIndex = 0; toothIndex < this.patientToothData.length; toothIndex++) {
      /* Please note that index starts from 0, id on the other hand is the actual UNS notation based indexing, which starts from 1. */
      if (this.patientToothData[toothIndex].id === this.patientToothChart[this.toothIndex].id) {
        toothIndexApi = toothIndex;
        this.toothService.savePreviousCare(this.patientId, toothIndexApi, this.previousCareToShowIndex, this.previousCareToShow).subscribe(() => {
          // TODO implement condition which prevents saving without any changes made
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Saved.' });
        });
        break;
      }
    }
  }

  initializeDate(): void {
    this.previousCareToShow.date = new Date(this.previousCareToShow.date);
    if (this.treatmentInput) {
      this.treatmentInput.nativeElement.focus();
    }
    //const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/; /* Default date format used accross the application: 'yyyy-mm-dd' */
    //this.previousCareToShowDate = dateFormatRegex.test(this.previousCareToShow.date) ? new Date(this.previousCareToShow.date) : new Date();
    //this.previousCareToShow.date = this.previousCareToShow.date.length ? this.previousCareToShow.date : (new Date()).toISOString().slice(0, 10);
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
    this.showPreviousCareDialog = !this.isDragging;
    this.isDragging = false;
  }

  closeToothDialog(): void {
    this.hideToothDialog.emit(true);
  }
}
