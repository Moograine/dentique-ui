import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Calendar } from 'primeng/calendar';
import { LocationService } from '../../../core/services/location.service';
import { PatientService } from '../../../core/services/patient.service';
import { ToothService } from '../../../core/services/tooth.service';
import { PatientModel, Patient, PatientDetails, PatientXRayFileModel, PatientXRayFile } from '../../../core/models/patient.model';
import { Tooth, ToothModel, ToothNotationModel } from '../../../core/models/tooth.model';
import { Dropdown } from 'primeng/dropdown';
import { Router } from '@angular/router';
import { CountryCode, CountryCodeModel, CountyModel } from '../../../core/models/location.model';
import { nameValidators, phoneValidators } from '../../../core/validators/validator';
import { DoctorService } from '../../../core/services/doctor.service';
import { MessageService } from 'primeng/api';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FileUpload } from 'primeng/fileupload';
import { Galleria } from 'primeng/galleria';
import { concatMap, forkJoin, Observable } from 'rxjs';
import { formatDate } from '@angular/common';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment, AppointmentCollectionModel2, AppointmentModel } from '../../../core/models/appointment.model';

const PINValidationRegex =
  /\b[1-9]?\d{0,2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|[1-3][0-9]|4[0-6]|51|52)\d{0,4}\b/;

@Component({
  selector: 'app-patient-manager',
  templateUrl: './patient-manager.component.html',
  styleUrls: ['./patient-manager.component.scss'],
  providers: [MessageService]
})

export class PatientManagerComponent implements OnInit {
  @ViewChild('galleria') galleria?: Galleria;

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
  patientToothData: ToothModel[] = [];
  patientToothChart: ToothModel[] = [];
  counties: CountyModel[] = [];
  countryCodes: CountryCodeModel[] = [];
  selectedCountryCode: CountryCodeModel = new CountryCode();
  toothNotation: ToothNotationModel[] = [];
  toothToShowIndex = 0;
  showToothDialog = false;
  showXRayGallery = false;
  showUploadXRayDialog = false;
  // TODO add to patient MODEL
  activeXRayIndex: number = 0;
  showPatientDetailsDialog = false;
  patientDetailsType: PatientDetails | '' = '';
  initializeToothViewer = false;
  timeoutForToothDialogAnimation?: number;
  notationSystem: 'FDI' | 'UNS' = 'FDI'; /* Initially, we'll use the FDI system, because this is the preferred one among romanian doctors. */
  temporaryPatientId = 0;
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
              private patientService: PatientService) {
  }

  ngOnInit() {
    this.initializeCountryCodes();
    this.getCounties();
    this.initializeNotationSystem();
    this.getToothNotationChart();
    this.getPatients();
    this.monitorActivePatient();
  }


  initializeCountryCodes(): void {
    this.locationService.getCountryCodes().subscribe((countryCodes: CountryCodeModel[]): void => {
      this.countryCodes = countryCodes;
      this.selectedCountryCode = this.locationService.selectedCountryCode;
    })
  }

  getCounties(): void {
    this.locationService.getCounties().subscribe((counties: string[]): void => {
      this.counties = counties.map((county: string): CountyModel => ({ name: county }));
    });
  }

  initializeNotationSystem(): void {
    this.notationSystem = this.doctorService.notationSystem;
  }

  getToothNotationChart(): void {
    this.toothNotation = this.toothService.getToothNotation(this.notationSystem);
  }

  changeNotationSystem(notationSystem: 'FDI' | 'UNS'): void {
    this.notationSystem = notationSystem;
    this.getToothNotationChart();
  }

  getPatients(): void {
    // TODO remove, then remove from ngOnInit
    this.patientService.getPatients().subscribe((patients: PatientModel[]): void => {
      const patient = patients[this.temporaryPatientId];
      this.loadPatientToothData(patient);
    })
  }

  monitorActivePatient(): void {
    this.patientService.activePatient.subscribe((patient: PatientModel): void => {
      if (patient.phone?.length) {
        this.initializePatient(patient);
      }
    })
  }

  initializePatient(patient: PatientModel): void {
    /* Double check before initializing the patient data */
    if (!patient.phone.includes('-')) {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'This patient data is corrupted!' });
      return;
    }

    /* Retrieve patient data from patient service */
    this.patient = patient;

    /* Get patient X-Rays */
    const patientId = this.patient.phone;
    this.getPatientXRays(patientId);
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

    // TODO also add toothChart data here instead of in loadPatientToothData(patientData);
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

  loadPatientToothData(patient: PatientModel): void {
    this.patientToothData = patient.toothChart;
    patient.toothChart = [];

    /* Initialize the patient tooth chart with 32 pieces of teeth. At first, they won't have any data, beside the UNS tooth id */
    for (let index = 1; index <= 16; index++) {
      patient.toothChart.push(new Tooth({ id: index }));
    }
    for (let index = 32; index >= 17; index--) {
      patient.toothChart.push(new Tooth({ id: index }));
    }

    /* Fill the patient tooth chart with existing data from the database. */
    this.patientToothData.forEach(toothWithData => {
      const matchingIndex = patient.toothChart.findIndex(toothWithoutData => toothWithoutData.id === toothWithData.id);
      if (matchingIndex !== -1) {
        patient.toothChart[matchingIndex] = toothWithData;
      }
    })
    this.patientToothChart = patient.toothChart;
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

  calculateBirthday(inputValue: string): void {
    /** Validate birthdate from Romanian personal identification number */
    if (PINValidationRegex.test(inputValue)) {
      // TODO validation issue, try writing 500021214 or more then delete any 0

      if (inputValue.length < 9) {
        // TODO remove after validation issue is fixed

        return;
      }

      /**
       * 1 for males born between 1900 and 1999
       * 2 for female persons born between 1900 and 1999
       * 3 for males born between 1800 and 1899
       * 4 for female persons born between 1800 and 1899
       * 5 for males born between 2000 and 2099
       * 6 for female persons born between 2000 and 2099
       * 7 for male residents
       * 8 for female residents
       */

      // TODO 1: first calculate year and gender from the first character of the inputValue

      // TODO 1. a.: calculate gender ! DONE !

      this.patientFormGroup.controls['sex'].setValue(inputValue.charCodeAt(0) % 2 ? 'Mr.' : 'Ms.');

      // TODO 1. b.: calculate year ! DONE !

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

      // TODO 2: calculate month from inputValue.slice(3, 5) ! DONE !
      // TODO 3: calculate day from inputValue.slice(5, 7) ! DONE !

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
  }

  filterNextInput(input: HTMLInputElement | Calendar): void {
    // TODO if birthdate & age are filled, focus the emailInput
    this.focusNextInput(input);
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

  fillSexInput(): void {

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
    this.XRayFileCollection = [];
    this.activeXRayIndex = 0;
    if (this.galleria) {
      this.galleria.activeIndex = this.activeXRayIndex;
    }

    this.patientService.getPatientXRaysById(patientId).subscribe((imageURLs: string[]): void => {
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
          console.error('Error creating File object:', error);
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
        // TODO translation needed
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Patient X-Rays Uploaded.' });
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
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Can\'t be larger than 5MB.' });
      fileUploader.clear();
      return;
    }

    const fileType = file.type.split('/')[1];
    if (!fileType.includes('png') && !fileType.includes('jpg') && !fileType.includes('jpeg')) {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Only .png or .jpg or .jpeg is accepted!' });
      return;
    }

    const patientXRay = new PatientXRayFile(file, new Date());
    this.activeXRayIndex = this.XRayFileCollection.length;
    this.XRayFileCollection.push(patientXRay);
    // TODO translation needed
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Uploaded.', life: 750 });
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
    // TODO translation needed
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Deleted.', life: 750 });

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

    // TODO bug after deleting all images, then uploading one and deeleting that as well then uploading one
  }

  displayTooth(tooth: ToothNotationModel, toothIndex: number): void {
    if (this.patientToothChart[toothIndex].status === 'missing') {
      return;
    }

    this.showToothDialog = true;

    /* Timeout is used to avoid stacking data processing while dialog animation is still in process. */
    clearTimeout(this.timeoutForToothDialogAnimation);
    this.initializeToothViewer = true;
    this.toothToShowIndex = toothIndex;
  }

  hideTooth(): void {
    this.showToothDialog = false;

    /* Wait for p-dialog close animation */
    this.destroyToothViewer();
  }

  destroyToothViewer(): void {
    this.timeoutForToothDialogAnimation = window.setTimeout(() => this.initializeToothViewer = false, 250);
  }

  navigateToPdfViewer(): void {
    this.router.navigate(['pdf']).then();
  }

  savePatient(): void {
    /* Double-check for existing phone number, which is needed for retrieving the folder path */
    if (!this.patientFormGroup.value.phone || !this.patientFormGroup.value.phone.length || !this.selectedCountryCode.dial_code.length) {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please enter patient details first!' });
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
        chronicDiseases: this.patient.chronicDiseases
      });
    patient.phone = this.patientService.generatePatientId(this.selectedCountryCode.dial_code, patient.phone)

    // TODO when updating a patient's phone number, make sure to delete the existing node based on the previous phone number, and re-save it to a new node
    // TODO also update all appointments on that phone numbr

    console.log(patient);
    const patientId = patient.phone;
    this.patientService.savePatient(patient, patientId).pipe(
      concatMap(() => {
        // TODO translation needed
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Patient Saved.' });
        return this.appointmentService.getAppointmentsByPhone(patient.phone).pipe(
          concatMap((appointmentCollection: AppointmentCollectionModel2) => {
            /* Collect updated appointments into Observables and return them for processing */
            const requestCollection: Observable<AppointmentModel>[] = [];
            Object.keys(appointmentCollection).forEach(key => {
              if (patient.firstName === appointmentCollection[key].firstName && patient.lastName === appointmentCollection[key].lastName) {
                return;
              }

              appointmentCollection[key].firstName = patient.firstName;
              appointmentCollection[key].lastName = patient.lastName;
              const updatedAppointment = new Appointment({ ...appointmentCollection[key] });
              const appointmentId = this.appointmentService.generateAppointmentId(updatedAppointment.date);
              requestCollection.push(this.appointmentService.saveAppointment2(updatedAppointment, appointmentId));
            });
            return forkJoin(requestCollection);
          })
        )
      }),
    ).subscribe(() => {}, () => {
      // TODO translation needed
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Something went wrong.' });
    });
  }
}
