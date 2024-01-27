import { Component, ElementRef, OnInit, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Calendar } from 'primeng/calendar';
import { LocationService } from '../../../core/services/location.service';
import { PatientService } from '../../../core/services/patient.service';
import { ToothService } from '../../../core/services/tooth.service';
import { PatientModel, Patient, CountyModel } from '../../../core/models/patient.model';
import { Tooth, ToothModel, ToothNotationModel } from '../../../core/models/tooth.model';
import { Dropdown } from 'primeng/dropdown';
import { Router } from '@angular/router';

const PINValidationRegex =
  /\b[1-9]?\d{0,2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|[1-3][0-9]|4[0-6]|51|52)\d{0,4}\b/;

@Component({
  selector: 'app-patient-manager',
  templateUrl: './patient-manager.component.html',
  styleUrls: ['./patient-manager.component.scss']
})

export class PatientManagerComponent implements OnInit {
  @ViewChildren('previousCareLabel') previousCareLabels!: QueryList<ElementRef>;
  @ViewChild('parentContainer') previousCareParentContainer: ElementRef | undefined;
  @ViewChild('firstNameInput') firstNameInput: ElementRef | undefined;
  @ViewChild('lastNameInput') lastNameInput: ElementRef | undefined;
  @ViewChild('birthdateInput') birthdateInput: ElementRef | undefined;
  @ViewChild('PINInput') PINInput!: Calendar;
  @ViewChild('phoneInput') phoneInput: ElementRef | undefined;
  @ViewChild('emailInput') emailInput: ElementRef | undefined;
  @ViewChild('countyInput') countyInput!: Dropdown;

  patientFormGroup = this.formBuilder.group({
    firstName: [''],
    lastName: [''],
    PIN: [''],
    birthdate: [new Date(0)],
    age: [''],
    phone: [''],
    email: [''],
    sex: [''],
    county: [{ name: '' }],
    town: [''],
    address: [''],
    allergies: [['']],
    previousSurgeries: [['']],
    chronicDiseases: [['']],
    familyHealthHistory: [['']],
  });
  patient: PatientModel = new Patient();
  patientToothData: ToothModel[] = [];
  patientToothChart: ToothModel[] = [];
  counties: CountyModel[] = [];
  toothNotation: ToothNotationModel[] = [];
  toothToShowIndex = 0;
  showToothDialog = false;
  initializeToothViewer = false;
  timeoutForToothDialogAnimation?: number;
  notationSystem: 'FDI' | 'UNS' = 'FDI'; /* Initially, we'll use the FDI system, because this is the preferred one among romanian doctors. */
  temporaryPatientId = 0;

  constructor(private formBuilder: FormBuilder,
              private locationService: LocationService,
              private toothService: ToothService,
              private router: Router,
              private patientService: PatientService) {
  }

  ngOnInit() {
    this.getCounties();
    this.getToothNotationChart();
    this.getPatients();
  }

  getCounties(): void {
    this.locationService.getCounties().subscribe((counties: string[]): void => {
      this.counties = counties.map((county: string): CountyModel => ({ name: county }));
    });
  }

  getToothNotationChart(): void {
    this.toothNotation = this.toothService.getToothNotation(this.notationSystem);
  }

  changeNotationSystem(notationSystem: 'FDI' | 'UNS'): void {
    this.notationSystem = notationSystem;
    this.getToothNotationChart();
  }

  getPatients(): void {
    this.patientService.getPatients().subscribe((patients: PatientModel[]): void => {
      this.patient = patients[this.temporaryPatientId];
      this.loadPatient(this.patient);
    })
  }

  initializePatient(): void {
    const patient: PatientModel = this.patientService.activePatient = this.patient;
    this.patientFormGroup.patchValue({
      firstName: patient.firstName,
      lastName: patient.lastName,
      PIN: patient.PIN,
      birthdate: new Date(patient.birthdate),
      age: patient.age,
      phone: patient.phone,
      email: patient.email,
      sex: patient.sex,
      county: { name: patient.county },
      town: patient.town,
      address: patient.address,
      allergies: patient.allergies,
      previousSurgeries: patient.previousSurgeries,
      chronicDiseases: patient.chronicDiseases,
      familyHealthHistory: patient.familyHealthHistory,
    });
  }

  loadPatient(patient: PatientModel): void {

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

  fillBirthdateInput(): void {

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

  displayTooth(tooth: ToothNotationModel, toothIndex: number): void {
    if (this.patientToothChart[toothIndex].status === 'missing') {
      return;
    }
    this.showToothDialog = true;

    // TODO fix this issue when suddenly opening a tooth after closing
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
    this.timeoutForToothDialogAnimation = setTimeout(() => this.initializeToothViewer = false, 250);
  }

  navigateToPdfViewer(): void {
    this.router.navigate(['pdf']);
  }

  savePatient(): void {
    // TODO behavior issue on keydown Enter, savePatient() is triggerred

    console.log('miai');
    const patientFormValues = this.patientFormGroup.value as Partial<PatientModel>;
    patientFormValues.county = this.patientFormGroup.value.county?.name || '';


    const patientData = new Patient({ ...patientFormValues });

    console.log(patientData);
    //this.patientService.savePatient(this.patientFormGroup.value);
  }
}
