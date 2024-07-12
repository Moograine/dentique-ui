import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Calendar } from 'primeng/calendar';
import { LocationService } from '../../../core/services/location.service';
import { PatientService } from '../../../core/services/patient.service';
import { ToothService } from '../../../core/services/tooth.service';
import {
  Patient,
  PatientCollectionModel,
  PatientDetails,
  PatientModel,
  PatientXRayFile,
  PatientXRayFileModel
} from '../../../core/models/patient.model';
import { Notation, Tooth, ToothModel, ToothNotationModel, ToothStatus } from '../../../core/models/tooth.model';
import { Dropdown } from 'primeng/dropdown';
import { Router } from '@angular/router';
import { CountryCode, CountryCodeModel, CountryCodeSubjectModel, CountyModel } from '../../../core/models/location.model';
import { nameValidators, phoneValidators } from '../../../core/validators/validator';
import { DoctorService } from '../../../core/services/doctor.service';
import { MessageService } from 'primeng/api';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FileUpload } from 'primeng/fileupload';
import { Galleria } from 'primeng/galleria';
import { concatMap, EMPTY, filter, finalize, forkJoin, Observable, switchMap, take, takeWhile } from 'rxjs';
import { formatDate } from '@angular/common';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment, AppointmentCollectionModel, AppointmentModel, } from '../../../core/models/appointment.model';
import { TranslateService } from '@ngx-translate/core';

const PINValidationRegex =
  /\b[1-9]?\d{0,2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|[1-3][0-9]|4[0-6]|51|52)\d{0,4}\b/;

@Component({
  selector: 'app-patient-manager',
  templateUrl: './patient-manager.component.html',
  styleUrls: ['./patient-manager.component.scss'],
  providers: [MessageService]
})

export class PatientManagerComponent implements OnInit, OnDestroy {
  @ViewChild('galleria') galleria?: Galleria;
  @ViewChild('birthdateInput') birthdateInput?: Calendar;
  @ViewChild('ageInput') ageInput?: ElementRef;
  @ViewChild('sexInput') sexInput?: ElementRef;
  activeComponent = true;

  patientFormGroup = this.formBuilder.group({
    firstName: ['', nameValidators],
    lastName: ['', nameValidators],
    PIN: [''],
    birthdate: [new Date(0)],
    age: [''],
    phone: ['', phoneValidators],
    email: [''],
    sex: [''],
    county: [{ name: '' }],
    town: [''],
    address: ['']
  });
  patient: PatientModel = new Patient();
  patientToothChart: ToothModel[] = [];
  counties: CountyModel[] = [];
  countryCodes: CountryCodeModel[] = [];
  selectedCountryCode: CountryCodeModel = new CountryCode();
  toothNotation: ToothNotationModel[] = [];
  toothToShowIndex = 0;
  showToothDialog = false;
  forceShowToothDialog = false;
  showXRayGallery = false;
  showUploadXRayDialog = false;
  showDocumentBuilderDialog = false;
  // TODO add to patient MODEL
  activeXRayIndex: number = 0;
  showPatientDetailsDialog = false;
  patientDetailsType: PatientDetails | '' = '';
  initializeToothViewer = false;
  initializeDocumentBuilder = false
  timeoutForToothDialogAnimation?: number;
  timeoutForDocumentBuilderDialogAnimation?: number;
  notationSystem: Notation = 'FDI'; /* Initially, we'll use the FDI system, because this is the preferred one among romanian doctors. */
  standaloneConfiguration = {
    standalone: true
  }

  /** XRay Related Global Variables */
  isXRayInEditMode = false;
  XRayFileCollection: PatientXRayFileModel[] = [];
  displayedXRaySrc: string = '';

  constructor(private formBuilder: FormBuilder,
              private locationService: LocationService,
              private toothService: ToothService,
              private storage: AngularFireStorage,
              private router: Router,
              private doctorService: DoctorService,
              private messageService: MessageService,
              private appointmentService: AppointmentService,
              private translateService: TranslateService,
              private patientService: PatientService) {
  }

  ngOnInit() {
    this.initializeCountryCodes();
    this.getCounties();
    this.initializeNotationSystem();
    this.initializeToothChart();
    this.getToothNotationChart();
    this.prefetchToothImages();
    this.monitorActivePatient();

    /** TODO Remove **/

    this.patientService.getPatientById('0040-744871324').subscribe((patient: PatientModel) => {
      this.patientService.setActivePatient(patient);
    });

    /** TODO Remove **/
  }

  /** Key combination Ctrl + Enter to open appointment dialog */
  @HostListener('document:keydown.control.enter', ['$event']) onCtrlEnter() {
    /* Monitor whenever Ctrl + Enter was pressed */
    if (!this.patientFormGroup.valid || this.showXRayGallery || this.showUploadXRayDialog || this.showPatientDetailsDialog || this.showToothDialog) {
      /* Avoid action if form is invalid or any dialog is active */
      return;
    }

    this.savePatient();
  }

  /** Key Esc to close tooth dialog */
  @HostListener('document:keydown.esc', ['$event']) onEsc() {
    /* Monitor whenever Esc was pressed */
    if (!this.showToothDialog) {
      return;
    }

    if (!this.forceShowToothDialog) {
      this.showToothDialog = false;
    }
  }

  initializeCountryCodes(): void {
    this.locationService.countryCodeFetch().pipe(
      takeWhile(() => this.activeComponent)
    ).subscribe((subjectValue: CountryCodeSubjectModel) => {
      this.countryCodes = subjectValue.list;
      this.selectedCountryCode = subjectValue.selected;
    });
  }

  getCounties(): void {
    this.locationService.getCounties().subscribe((counties: string[]): void => {
      this.counties = counties.map((county: string): CountyModel => ({ name: county }));
    });
  }

  /** Function to initialize the notation system based on the doctor's settings **/
  initializeNotationSystem(): void {
    this.doctorService.notationSystemFetch().pipe(
      filter((notationSystem: Notation) => notationSystem.length > 0), /* Ensure only non-empty values pass through */
      take(2), /* First emitted value is the default value, which in this case is a non-empty string, so filter wil let it pass */
      takeWhile(() => this.activeComponent)
    ).subscribe((notation: Notation) => {
      this.notationSystem = notation;
    });
  }

  getToothNotationChart(): void {
    this.toothNotation = this.toothService.getToothNotation(this.notationSystem);
  }

  changeNotationSystem(notationSystem: Notation): void {
    this.notationSystem = notationSystem;
    this.getToothNotationChart();
  }

  monitorActivePatient(): void {
    this.patientService.activePatient.pipe(
      takeWhile(() => this.activeComponent)
    ).subscribe((patient: PatientModel): void => {
      if (patient.phone.length) {
        this.initializePatient(patient);
      }
    })
  }

  initializePatient(patient: PatientModel): void {
    /* Double check before initializing the patient data */
    if (!patient.phone.includes('-')) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.patient_corrupted')
      });
      return;
    }

    /* Retrieve patient data from patient service */
    this.patient = patient;
    this.loadPatientToothData(patient);

    /* Get patient X-Rays */
    const patientId = this.patient.phone;
    this.getPatientXRays(patientId); // TODO restore
    /* Populate phone input and automatically select country dial code */
    const phoneWithCode = this.patient.phone?.split('-');
    this.selectDialCode(phoneWithCode[0]);

    /* Populate patient form group */
    this.patientFormGroup.patchValue({
      firstName: this.patient.firstName,
      lastName: this.patient.lastName,
      PIN: this.patient.PIN,
      birthdate: new Date(this.patient.birthdate),
      age: this.patient.age,
      phone: phoneWithCode[1],
      email: this.patient.email,
      sex: this.patient.sex,
      county: { name: this.patient.county },
      town: this.patient.town,
      address: this.patient.address
    });
  }

  selectDialCode(dialCode: string): void {
    if (!dialCode.length) {
      return;
    }

    // TODO no need for a calculation like this. After filter based navigation, you can simply insert the dial code used in the header search.
    const translatedCode = `+${dialCode.substring(2)}`;
    for (let countryCode of this.countryCodes) {
      if (countryCode.dial_code === translatedCode) {
        this.selectedCountryCode = countryCode;
        return;
      }
    }
  }

  /** Function to populate patientToothChart with Tooth() objects **/
  initializeToothChart(): void {
    /* Initialize the patient tooth chart with 32 pieces of teeth. At first, they won't have any data, besides the UNS tooth id */
    this.patientToothChart = [];
    for (let index = 1; index <= 16; index++) {
      this.patientToothChart.push(new Tooth({ id: index }));
    }
    for (let index = 32; index >= 17; index--) {
      this.patientToothChart.push(new Tooth({ id: index }));
    }
  }

  /** Function to prefetch tooth images, for smoother image loading **/
  prefetchToothImages(): void {
    this.toothService.imagePathCollection.forEach(path => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = 'assets/images/tooth/' + path;
      document.head.appendChild(link);
    });
  }

  loadPatientToothData(patient: PatientModel): void {
    this.initializeToothChart();

    /* Fill the patient tooth chart with existing data from the database. */
    patient.toothChart.forEach(toothWithData => {
      const matchingIndex = this.patientToothChart.findIndex(toothWithoutData => toothWithoutData.id === toothWithData.id);
      if (matchingIndex !== -1) {
        this.patientToothChart[matchingIndex] = toothWithData;
      }
    });
  }

  relevantToothData(): ToothModel[] {
    const toothData: ToothModel[] = [];
    this.patientToothChart.forEach(tooth => {
      if (tooth.status !== ToothStatus.Intact || tooth.previousCares?.length) {
        toothData.push(tooth);
      }
    });

    return toothData;
  }

  focusPreviousInput(inputValue: string, input: HTMLInputElement | HTMLTextAreaElement) {
    // TODO implement this functionality. Currently working with a small behavior issue,
    // TODO try to insert this ' (keyup.backspace)="focusPreviousInput(lastNameInput.value, firstNameInput)" '
    // TODO into the #lastNameInput, in the HTML file

    if (inputValue.length) {
      return;
    }

    input.focus();
  }

  focusNextInput(input: HTMLInputElement | HTMLTextAreaElement | Calendar | Dropdown): void {
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.focus();
      return;
    }

    if (input instanceof Calendar) {
      input.inputfieldViewChild.nativeElement.focus();
      return;
    }

    input.show();
  }

  /** Calculates which input should be focused after pressing Enter while editing the input for the Personal Identification Number */
  filterNextInput(currentInput: 'PIN' | 'email', nextInput: HTMLInputElement | Calendar | Dropdown): void {
    // TODO if birthdate & age are filled, focus the emailInput

    if (currentInput === 'email') {
      if (this.patientFormGroup.value.sex?.length) {
        this.focusNextInput(nextInput);
        return;
      }

      if (this.sexInput) {
        this.focusNextInput(this.sexInput.nativeElement);
      }

      return;
    }

    if (this.patientFormGroup.value.birthdate) {
      if (this.patientFormGroup.value.age?.length) {
        this.focusNextInput(nextInput);
        return;
      }

      if (this.ageInput) {
        this.focusNextInput(this.ageInput.nativeElement);
      }

      return;
    }

    if (this.birthdateInput) {
      this.focusNextInput(this.birthdateInput);
    }
  }

  processPIN(inputValue: string): void {
    if (PINValidationRegex.test(inputValue)) {
      // TODO validation issue, try writing 500021214 or more then delete any 0

      if (inputValue.length < 9) {
        // TODO remove after validation issue is fixed
        return;
      }

      this.fillSexInput(inputValue.charCodeAt(0) % 2 ? 'Mr.' : 'Ms.');
      this.fillBirthdateInput(inputValue);
    }
  }

  fillBirthdateInput(inputValue: string): void {
    let year = '';
    switch (inputValue[0]) {
      case '1' || '2':
        year += '19' + inputValue[1] + inputValue[2];
        break;
      case '3' || '4':
        year += '18' + inputValue[1] + inputValue[2];
        break;
      default:
        year = '20' + inputValue[1] + inputValue[2];
    }

    const month = inputValue[3] + inputValue[4];
    const day = inputValue[5] + inputValue[6];
    const birthdate = new Date(`${year}-${month}-${day}`);
    const currentDate = new Date();

    /* Check if birthdate is valid and not a future date */
    if (currentDate.getFullYear() - birthdate.getFullYear() < 0) {
      return;
    }

    if (currentDate.getFullYear() - birthdate.getFullYear() === 0) {
      const currentMonth = currentDate.getMonth();
      const birthMonth = birthdate.getMonth();

      if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDate.getDate() < birthdate.getDate())) {
        return;
      }
    }

    this.patientFormGroup.controls['birthdate'].setValue(new Date(birthdate));
    this.fillAgeInput(birthdate);
  }

  fillAgeInput(birthdate: Date): void {
    // TODO handle date as string when working with database

    const currentDate = new Date();
    let age = currentDate.getFullYear() - birthdate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const birthMonth = birthdate.getMonth();

    // If the current month is before the birth month or if it's the same month but the birthday is later
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDate.getDate() < birthdate.getDate())) {
      age--;
    }
    this.patientFormGroup.controls['age'].setValue(`${age}`);
  }

  fillSexInput(sex: 'Ms.' | 'Mr.'): void {
    this.patientFormGroup.controls['sex'].setValue(sex);
  }

  displayPatientDetailsDialog(type: PatientDetails): void {
    this.patientDetailsType = type;
    this.showPatientDetailsDialog = true;
  }

  onPatientDetailsDialogHide(): void {
    //this.previousSurgeries = JSON.parse(JSON.stringify(this.patient.previousSurgeries));
    // TODO previousSurgery
    //console.log(this.patient[this.patientDetailsType as PatientDetails]);
    this.patientDetailsType = '';
  }


  getPatientXRays(patientId: string): void {
    // TODO loads even after saving patient
    this.XRayFileCollection = [];
    this.activeXRayIndex = 0;
    if (this.galleria) {
      this.galleria.activeIndex = this.activeXRayIndex;
    }

    this.patientService.getPatientXRaysById(patientId).pipe(take(1)).subscribe((imageURLs: string[]): void => {
      if (!imageURLs?.length) {
        return;
      }

      for (let path of imageURLs) {
        /* Prefetching the URL, to load the images prematurely */
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = path;
        document.head.appendChild(link);

        /* Extracting the filename from the URL */
        const fileNameWithExtension = path.substring(path.lastIndexOf('%2F') + 3);
        const fileNameWithFormat = fileNameWithExtension.substring(0, fileNameWithExtension.lastIndexOf('?'));
        const fileName = fileNameWithFormat.split('.')[0];
        this.getFileFromUrl(path, fileName).then(file => {
          const date = new Date(fileName.split('_')[0]);
          this.XRayFileCollection.push(new PatientXRayFile(file, date));
          if (this.XRayFileCollection.length === imageURLs.length) {
            this.XRayFileCollection = this.sortFilesAlphabetically(this.XRayFileCollection);
            this.convertFileToBase64(this.XRayFileCollection[0].file).then((fileInBase64: string) => {
              this.displayedXRaySrc = fileInBase64;
            })
          }
        }).catch(error => {
          console.error('Error while creating File object:', error);
        });
      }
    });
  }

  /* Returns an X-Ray collection, sorted by date */
  sortFilesAlphabetically(XRayFiles: PatientXRayFileModel[]): PatientXRayFileModel[] {
    const sortedFiles = [...XRayFiles];
    sortedFiles.sort((currentXRayFile: PatientXRayFileModel, nextXRayFile: PatientXRayFileModel) => {
      if (currentXRayFile.file.name < nextXRayFile.file.name) {
        return -1;
      }
      if (currentXRayFile.file.name > nextXRayFile.file.name) {
        return 1;
      }
      return 0;
    });

    return sortedFiles;
  }

  async getFileFromUrl(url: string, fileName: string): Promise<File> {
    const response = await fetch(url);
    const data = await response.blob();
    const type = data.type || 'image/jpeg';
    return new File([data], fileName, {
      type: type,
    });
  }


  displayXRayGallery(): void {
    if (!this.patientFormGroup.valid) {
      return;
    }

    if (!this.XRayFileCollection.length) {
      this.showUploadXRayDialog = true
      return;
    }

    this.showXRayGallery = true;
  }


  savePatientXRays(): void {
    // TODO remove this and paste code directly inside this.savePatient()
    const patientId = this.patient.phone

    this.patientService.deletePatientXRays(patientId)
      .pipe(concatMap(() => this.patientService.uploadPatientXRays(this.XRayFileCollection, patientId)))
      .subscribe(() => {
        // TODO think of a better way to indicate save
        // TODO one method would be to use a loader animation IN case patientXRay array has a length > 0
        // TODO translation needed
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('notifications.success'),
          detail: 'Patient X-Rays Uploaded.'
        });
      });
  }

  onGalleriaItemChange(index: number): void {
    const file = this.XRayFileCollection[index].file;
    this.convertFileToBase64(file).then((fileInBase64: string) => {
      this.displayedXRaySrc = fileInBase64;
    })
  }

  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const fileInBase64: string = reader.result as string;
        resolve(fileInBase64);
      };
      reader.onerror = () => {
        reject(new Error('Error while converting File to base64'));
      };
      reader.readAsDataURL(file);
    });
  }

  /** Receives the array of X-Ray data objects, containing X-Ray image files and their date information.*/
  generateXRayFileName(XRayFiles: PatientXRayFileModel[], date: Date, fileIndex: number): string {
    const dateAsFileName = formatDate(date, 'YYYY-MM-dd', 'en-US');
    const filteredFiles = XRayFiles.filter((fileObject: PatientXRayFileModel, previousFileIndex: number) =>
      fileObject.date.toDateString() === date.toDateString() && previousFileIndex < fileIndex);
    return `${dateAsFileName}_${filteredFiles.length}`;
  }

  onXRayDateChange(date: Date): void {
    /* Force value update before continuing data manipulation */
    this.XRayFileCollection[this.activeXRayIndex].date = date;
    const currentXRay = this.XRayFileCollection[this.activeXRayIndex];
    this.updateXRayCollection();
    for (let index = 0; index < this.XRayFileCollection.length; index++) {
      if (this.XRayFileCollection[index] === currentXRay) {
        this.activeXRayIndex = index;
        if (this.galleria) {
          this.galleria.activeIndex = this.activeXRayIndex;
        }

        return;
      }
    }
  }

  updateXRayCollection(): void {
    for (let index = 0; index < this.XRayFileCollection.length; index++) {
      let file = this.XRayFileCollection[index].file;
      const fileName = this.generateXRayFileName(this.XRayFileCollection, this.XRayFileCollection[index].date, index)
      this.XRayFileCollection[index].file = new File([file], fileName, { type: file.type });
    }

    /* Make sure the file collection remains alphabetically sorted */
    this.XRayFileCollection = this.sortFilesAlphabetically(this.XRayFileCollection);

    for (let i = 0; i < this.XRayFileCollection.length; i++) {
      //console.log(this.XRayFileCollection[i].file.name);
    }
  }

  onPatientXRayUpload(event: { files: File[] }, fileUploader: FileUpload): void {
    console.log(this.XRayFileCollection);


    this.showUploadXRayDialog = false;
    const fileName = this.generateXRayFileName(
      this.XRayFileCollection,
      new Date(),
      this.XRayFileCollection.length + 1
    );
    const file: File = new File(
      [event.files[0]],
      fileName,
      { type: event.files[0].type }
    );
    if (file.size > 5000000) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.larger_than_5MB')
      });
      fileUploader.clear();
      return;
    }

    const fileType = file.type.split('/')[1];
    if (!fileType.includes('png') && !fileType.includes('jpg') && !fileType.includes('jpeg')) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.accepted_file_formats')
      });
      return;
    }

    const patientXRay = new PatientXRayFile(file, new Date());
    this.activeXRayIndex = this.XRayFileCollection.length;
    this.XRayFileCollection.push(patientXRay);
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('notifications.success'),
      detail: this.translateService.instant('notifications.uploaded'),
      life: 750
    });
    if (this.galleria) {
      this.galleria.activeIndex = this.activeXRayIndex;
    }

    this.displayXRayGallery();
    this.onGalleriaItemChange(this.activeXRayIndex);
    fileUploader.clear();
  }

  enableXRayEditMode(): void {
    this.isXRayInEditMode = true;
  }

  disableXRayEditMode(): void {
    this.isXRayInEditMode = false;
  }

  deletePatientXRay(): void {
    if (this.XRayFileCollection.length === 1) {
      this.showXRayGallery = false;
      this.showUploadXRayDialog = true;
    }

    /* Remove X-Ray object */
    this.XRayFileCollection.splice(this.activeXRayIndex, 1);
    this.messageService.add({
      severity: 'success',
      summary: this.translateService.instant('notifications.success'),
      detail: this.translateService.instant('notifications.deleted'),
      life: 750
    });

    /* Reorganize X-Ray collection based on dates */
    this.updateXRayCollection();
    this.activeXRayIndex = 0;
    if (this.galleria) {
      this.galleria.activeIndex = 0;
    }

    if (!this.XRayFileCollection.length) {
      return;
    }

    this.XRayFileCollection.length ? this.onGalleriaItemChange(this.activeXRayIndex) : this.displayedXRaySrc = '';
  }

  displayTooth(tooth: ToothNotationModel, toothIndex: number): void {
    /* Make sure previous tooth component is closed properly and destroyed before opening another one */
    if (this.initializeToothViewer) {
      return;
    }

    this.showToothDialog = true;

    /* Timeout is used to avoid stacking data processing while dialog animation is still in process. */
    clearTimeout(this.timeoutForToothDialogAnimation);
    this.initializeToothViewer = true;
    this.toothToShowIndex = toothIndex;
  }

  forceToothDialog(isForced: boolean): void {
    this.forceShowToothDialog = isForced;
  }

  /** Function to hide the tooth dialog then destroy the tooth viewer component **/
  hideTooth(): void {
    this.showToothDialog = false;

    /* Wait for p-dialog close animation */
    this.destroyToothViewer();
  }

  destroyToothViewer(): void {
    this.timeoutForToothDialogAnimation = window.setTimeout(() => this.initializeToothViewer = false, 250);
  }

  displayDocumentBuilderDialog(): void {
    /* Make sure previous document builder component is closed properly and destroyed before opening another one */
    if (this.initializeDocumentBuilder) {
      return;
    }

    this.showDocumentBuilderDialog = true;

    /* Timeout is used to avoid stacking data processing while dialog animation is still in process */
    clearTimeout(this.timeoutForDocumentBuilderDialogAnimation);
    this.initializeDocumentBuilder = true;
  }

  closeDocumentBuilderDialog(): void {
    this.showDocumentBuilderDialog = false;

    /* Wait for p-dialog close animation */
    this.destroyDocumentBuilderDialog();
  }

  destroyDocumentBuilderDialog(): void {
    this.timeoutForDocumentBuilderDialogAnimation = window.setTimeout(() => this.initializeDocumentBuilder = false, 250);
  }

  resetPatient(): void {
    const patient = new Patient();
    this.patientService.setActivePatient(patient);
    this.patient = patient;
    this.patientFormGroup.reset();
    this.initializeToothChart();
  }

  /** Returns an array of observables, which are responsible for updating the appointments based on the patient data, one by one */
  updatableAppointments(appointmentCollection: AppointmentCollectionModel, patient: PatientModel): Observable<AppointmentModel>[] {
    const requestCollection: Observable<AppointmentModel>[] = [];
    Object.keys(appointmentCollection).forEach(key => {
      const namesMatch = patient.firstName === appointmentCollection[key].firstName && patient.lastName === appointmentCollection[key].lastName;
      const phonesMatch = patient.phone === appointmentCollection[key].phone;
      if (namesMatch && phonesMatch) {
        return;
      }

      appointmentCollection[key].firstName = patient.firstName;
      appointmentCollection[key].lastName = patient.lastName;
      appointmentCollection[key].phone = patient.phone;
      const updatedAppointment = new Appointment({ ...appointmentCollection[key] });
      const appointmentId = this.appointmentService.generateAppointmentId(updatedAppointment.date);
      requestCollection.push(this.appointmentService.saveAppointment(updatedAppointment, appointmentId));
    });

    return requestCollection;
  }

  savePatient(): void {
    /* Double-check for existing phone number, which is needed for retrieving the folder path */
    if (!this.patientFormGroup.value.phone || !this.patientFormGroup.value.phone.length || !this.selectedCountryCode.dial_code.length) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('notifications.error'),
        detail: this.translateService.instant('notifications.patient_invalid_form')
      });
      return;
    }

    const patientFormValues = this.patientFormGroup.value as Partial<PatientModel>;
    patientFormValues.county = this.patientFormGroup.value.county?.name || '';
    const patient = new Patient(
      {
        ...patientFormValues,
        allergies: this.patient.allergies,
        previousSurgeries: this.patient.previousSurgeries,
        familyHealthHistory: this.patient.familyHealthHistory,
        chronicDiseases: this.patient.chronicDiseases,
        toothChart: this.relevantToothData()
      });

    console.log(patient);
    //return;
    patient.phone = this.patientService.generatePatientId(this.selectedCountryCode.dial_code, patient.phone);

    /** There are 6 separate cases to handle when saving a patient. 4 cases for editing an existing patient, and 2 cases for registering a new patient:
     * Save after editing an existing patient:
     *  1. Phone number wasn't modified, nor the name of the patient:
     *        - Save the patient
     *  2. Phone number wasn't modified, but the name was modified:
     *        - Save the patient
     *        - Update appointments with modified name, based on patient's phone number
     *  3. Phone number was modified, but the number is already registered to another patient
     *        - Abort the chain of operations and notify the user
     *  4. Phone number was modified, and it's not used by any other patient:
     *        - Save the patient
     *        - Update appointments with modified phone number [and name if necessary] based on patient's phone number before the modification
     *        - Delete the patient node which was registered to the old phone number, which was currently modified
     * Save after creating a new patient:
     *  5. Phone number is already registered to another patient
     *        - Abort the chain of operations and notify the user
     *  6. Phone number is not used by any other patient:
     *        - Save the patient
     * */
    let activeSubscription = true;
    this.patientService.activePatient.pipe(
      take(1),
      takeWhile(() => activeSubscription),
      switchMap((activePatient: PatientModel) => {
        const patientId = patient.phone;

        /* Check if we're editing an existing patient of registering a new one, based on whether a valid patient data is loaded in the activePatient */
        if (activePatient.phone.length) {
          /** Editing an existing patient */

          /* Check if phone number was changed, and if it was, re-create the whole patient node in the database, and delete the old */
          if (patient.phone === activePatient.phone) {

            /* Check if the patient's name was modified */
            if (patient.firstName === activePatient.firstName && patient.lastName === activePatient.lastName) {
              /** 1. Phone number wasn't modified, nor the name of the patient */

              /* If the registered patient's name wasn't modified, simply proceed and save the patient */
              return this.patientService.savePatient(patient, patientId);
            } else {
              /** 2. Phone number wasn't modified, but the name was modified */

              /* If patient's name was modified, save the patient, and update the displayed name for every appointment associated with the patient */
              return this.patientService.savePatient(patient, patientId).pipe(
                concatMap(() => this.appointmentService.getAppointmentsByPhone(patient.phone).pipe(
                  concatMap((appointmentCollection: AppointmentCollectionModel) => {
                    const requestCollection = this.updatableAppointments(appointmentCollection, patient);
                    return forkJoin(requestCollection);
                  })
                ))
              );
            }
          } else {
            return this.patientService.getPatientsByPhone(patient.phone).pipe(
              switchMap((patientCollection: PatientCollectionModel) => {
                const keyCollection = Object.keys(patientCollection);
                const isPhoneRegistered = keyCollection.length;
                if (isPhoneRegistered) {
                  /** 3. Phone number was modified, and it's already registered */

                  const registeredPatientName = `${patientCollection[keyCollection[0]].firstName} ${patientCollection[keyCollection[0]].lastName}`;
                  this.messageService.add({
                    severity: 'info',
                    summary: this.translateService.instant('notifications.cannot_save'),
                    detail: `${this.translateService.instant('notifications.patient_already_registered')} ${registeredPatientName}`,
                    life: 4000
                  });

                  return EMPTY;
                } else {
                  /** 4. Phone number was modified, and it's not used by any other patient */
                    // TODO !!! make sure to migrate the X Rays as well !!!

                  const oldPatientId = activePatient.phone;
                  /* If this phone number isn't taken, save the edited patient, update every
                  appointment based on the previous phone number, and delete the old patient node */
                  return this.patientService.savePatient(patient, patientId).pipe(
                    concatMap(() => this.appointmentService.getAppointmentsByPhone(oldPatientId).pipe(
                      concatMap((appointmentCollection: AppointmentCollectionModel) => {
                        const requestCollection = this.updatableAppointments(appointmentCollection, patient);
                        return forkJoin(requestCollection).pipe(
                          concatMap(() => this.patientService.deletePatient(oldPatientId))
                        );
                      })
                    ))
                  );
                }
              })
            );
          }
        } else {
          /** Registering a new patient */

          /* Check if any other patient was already registered by this phone number */
          return this.patientService.getPatientsByPhone(patient.phone).pipe(
            switchMap((patientCollection: PatientCollectionModel) => {
              const keyCollection = Object.keys(patientCollection);
              const isPhoneRegistered = keyCollection.length;
              if (isPhoneRegistered) {
                /** 5. Phone number is already registered to another patient */

                const registeredPatientName = `${patientCollection[keyCollection[0]].firstName} ${patientCollection[keyCollection[0]].lastName}`;
                this.messageService.add({
                  severity: 'info',
                  summary: this.translateService.instant('notifications.cannot_save'),
                  detail: `${this.translateService.instant('notifications.patient_already_registered')} ${registeredPatientName}`,
                  life: 4000
                });

                return EMPTY;
              } else {
                /** 6. Phone number is not registered yet */

                /* If this phone number isn't taken, simply proceed, and register the new patient */
                return this.patientService.savePatient(patient, patientId);
              }
            })
          );
        }
      }),
      finalize(() => {
        activeSubscription = false
      })
    ).subscribe(() => {
      /* Update the activePatient, which is used for monitoring currently loaded patient */
      this.patientService.setActivePatient(patient);
      this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('notifications.success'),
        detail: this.translateService.instant('notifications.patient_saved')
      });
    });
  }

  ngOnDestroy() {
    this.activeComponent = false;
  }
}
