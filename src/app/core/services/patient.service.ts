import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  from,
  last,
  map,
  mergeMap,
  Observable, of,
  switchMap,
} from 'rxjs';
import { Patient, PatientCollectionModel, PatientIdCollectionModel, PatientModel, PatientXRayFileModel } from '../models/patient.model';
import { Environment } from '../environments/environment';
import { PreviousCare, PreviousCareModel, Tooth, ToothModel } from '../models/tooth.model';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ListResult, Reference } from '@angular/fire/compat/storage/interfaces';
import { ComponentType, ErrorLog, ErrorLogModel } from '../models/maintenance.model';
import { MaintenanceService } from './maintenance.service';
import { ServiceListService } from './services-list.service';
import { ServiceTableItem, ServiceTableItemModel } from '../models/services-list.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  activePatient: BehaviorSubject<PatientModel> = new BehaviorSubject<PatientModel>(new Patient());
  patientCollectionSubject: BehaviorSubject<PatientCollectionModel> = new BehaviorSubject<PatientCollectionModel>({});

  constructor(private http: HttpClient,
              private storage: AngularFireStorage,
              private servicesListService: ServiceListService,
              private maintenanceService: MaintenanceService) {
  }

  setActivePatient(patient: PatientModel): void {
    this.activePatient.next(patient);
  }

  /** Function to populate patientCollectionSubject **/
  populatePatientCollection(patientCollection: PatientCollectionModel): void {
    this.patientCollectionSubject.next(patientCollection);
  }

  /** Function which returns an Observable based on the patientCollectionSubject */
  patientCollectionFetch(): Observable<PatientCollectionModel> {
    return <Observable<PatientCollectionModel>>this.patientCollectionSubject.pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while listening to the patientCollectionSubject changes', error, ComponentType.patientService, '50');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Returns the database-ready format of the patient's phone number, which is used as patientId */
  generatePatientId(dialCode: string, phoneNumber: string): string {
    // TODO temporarily, which can easily be permanently as well, to register a patient you NEED only name, last name, and phone number.
    //  these 3 patient data is sufficient to register a patient in the database. Consequently, when you book a patient, which requires a name,
    //  last name, and phone number, you automatically register a patient

    // TODO phone number will be the patientID, but for security reasons it will encrypted. The encryption will take place on the FRONTEND temporarily.
    //  and the API path will be the encrypted phone number. An idea for encryption: a phone number example [ + is equal to 00 internationally]:
    //  004753350553 -> based on ASCII code lower-case letters (97-122) -> xudgexxuaeem where the structure is: xu dge xxu aee m  ---> where
    //  '00 475 335 055 3' is the same in terms of structure as 'xu dge xxu aee m'. Logic:
    //  00 --> last 2 digits of the phone number are 53, so letters as ascii code: 122 (end of lower-case letters) - 5 and 122 - 3 ---> xu
    //  475 --> 97 (start of lower-case letters) + 4, 97 + 7, 97 + 5 ---> dge
    //  335 ---> 122 (end of lower-case letters) - 3, 122 - 3, 122 -5 ---> xxu
    //  055 ---> 97 (start of lower-case letters) + 0, 97 + 5, 97 + 5 ---> aee
    //  3 ---> formula: 10 + last digit --> 13, and add that to 97, which is 97 + 13 --> ascii 110 --> letter 'm'

    // TODO ---> a great feature idea for practical use: when a new client arrives, instead of asking "were you booked?", or "were you ever registered here?", or
    //  "were you ever here before?", the receptionist [ or anyone who manages the application ] could ask simply for the person's name.
    //  CONCLUSION: when the patient's name is entered in the patient SEARCH field, either a result will appear, or a label with:
    //  "No patient by this name            [button] |+| Register patient   ---> navigate to patient-manager with the search field value inserted.

    // TODO REMEMBER: there can easily be a patient with a phone number that's from another country: GET THAT COVERED with your encryption method.
    //  so go with other methods

    return '00' + dialCode.substring(1) + '-' + phoneNumber;
  }

  getPatientIdList(): Observable<PatientIdCollectionModel> {
    return <Observable<PatientIdCollectionModel>>this.http.get<PatientIdCollectionModel>(
      `${Environment.defaultAPI}/patients.json?shallow=true`
    ).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching the list of patient IDs.', error, ComponentType.patientService, '68');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  getPatientById(patientId: string): Observable<PatientModel> {
    return <Observable<PatientModel>>this.http.get<PatientModel>(`${Environment.defaultAPI}/patients/${patientId}.json`).pipe(
      map(patient => this.mapPatient(patient)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching patient by ID.', error, ComponentType.patientService, '84');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  mapPatientCollection(response: PatientCollectionModel): PatientCollectionModel {
    const patientCollection: PatientCollectionModel = {};
    for (const key in response) {
      if (response.hasOwnProperty(key)) {
        const patient = response[key];
        patientCollection[key] = this.mapPatient(patient);
      }
    }
    return patientCollection;
  }

  mapPatient(patient: PatientModel): Patient {
    return new Patient({
      ...patient,
      birthdate: this.convertDate(patient.birthdate, 'fetch'),
      toothChart: patient.toothChart?.map(tooth => new Tooth({
        ...tooth,
        previousCares: tooth?.previousCares?.map(previousCare => new PreviousCare({
          ...previousCare,
          service: new ServiceTableItem(
            previousCare?.service.id,
            previousCare?.service.label,
            undefined,
            previousCare?.service.price,
            previousCare?.service.custom
          ),
          date: this.convertDate(previousCare?.date, 'fetch')
        })) || []
      })) || []
    });
  }

  /** See description in appointment.service.ts */
  convertDate(date: Date, operation: 'fetch' | 'save'): Date {
    if (operation === 'fetch') {
      return new Date(new Date(date).getTime() + (new Date().getTimezoneOffset() * 60000));
    }

    return new Date(new Date(date).getTime() - (new Date().getTimezoneOffset() * 60000));
  }

  getPatientsByPhone(phone: string): Observable<PatientCollectionModel> {
    return <Observable<PatientCollectionModel>>this.http.get<PatientCollectionModel>(
      `${Environment.defaultAPI}/patients.json?orderBy="phone"&startAt="${phone}"&endAt="${phone}\uf8ff"`
    ).pipe(
      map((patientCollection: PatientCollectionModel) => this.mapPatientCollection(patientCollection)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching patient by phone.', error, ComponentType.patientService, '113');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  getPatientsByName(name: string, reversed: boolean = false): Observable<PatientCollectionModel> {
    const queryAttribute = 'searchKeyName' + (reversed ? 'Reversed' : '');
    return <Observable<PatientCollectionModel>>this.http.get<PatientCollectionModel>(
      `${Environment.defaultAPI}/patients.json?orderBy="${queryAttribute}"&startAt="${name}"&endAt="${name}\uf8ff"`
    ).pipe(
      map((patientCollection: PatientCollectionModel) => this.mapPatientCollection(patientCollection)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while fetching patient by name.', error, ComponentType.patientService, '126');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  /** Function to prepare patient data to be saved in the database **/
  processPatient(processedPatient: PatientModel): void {
    processedPatient.birthdate = this.convertDate(processedPatient.birthdate, 'save');
    processedPatient.toothChart?.forEach((tooth: ToothModel): void => {
      tooth.previousCares.forEach((previousCare: PreviousCareModel): void => {
        previousCare.service = new ServiceTableItem(
          previousCare.service.id,
          previousCare.service.label,
          undefined,
          previousCare.service.price,
          previousCare.service.custom
        );
        previousCare.date = this.convertDate(previousCare.date, 'save');
      });
    });
  }

  /**
   * Function to save patient information to the database
   *
   * @param {PatientModel} patient - The patient data to be saved.
   * @param {string} patientId - The unique identifier of the patient to be updated.
   * @returns {Observable<PatientModel>} - An observable that emits the updated `PatientModel`.
   */
  savePatient(patient: PatientModel, patientId: string): Observable<PatientModel> {
    const processedPatient = new Patient(patient);
    this.processPatient(processedPatient);

    return <Observable<PatientModel>>this.http.put<PatientModel>(`${Environment.defaultAPI}/patients/${patientId}.json`, processedPatient).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while saving patient.', error, ComponentType.patientService, '135');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  deletePatient(patientId: string): Observable<PatientModel> {
    return <Observable<PatientModel>>this.http.delete<PatientModel>(`${Environment.defaultAPI}/patients/${patientId}.json`).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while deleting patient.', error, ComponentType.patientService, '155');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  getPatientXRaysById(patientId: string): Observable<string[]> {
    return <Observable<string[]>>this.storage.ref(patientId).listAll().pipe(
      switchMap(list => {
        const observables = list.items.map(item => {
          return item.getDownloadURL();
        });
        return <Observable<string[]>>forkJoin(observables).pipe(
          catchError((error): Observable<ErrorLogModel> => {
            const errorLog = new ErrorLog(
              'Error while processing forkJoin operation of listing all items based on storage reference for X-Ray fetch.',
              error,
              ComponentType.patientService,
              '173'
            );
            return this.maintenanceService.sendErrorLog(errorLog);
          })
        );
      }),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog(
          'Error while fetching the patient X-Rays by patient ID.',
          error,
          ComponentType.patientService,
          '184'
        );
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  uploadPatientXRays(files: PatientXRayFileModel[], folderName: string): Observable<string[]> {
    const uploadTasks: Observable<string>[] = files.map(fileObject => {
      const file = fileObject.file;
      const filePath = `${folderName}/${file.name}`;
      const uploadTask = this.storage.upload(filePath, file);
      return uploadTask.snapshotChanges().pipe(
        last(),
        switchMap(() => this.storage.ref(filePath).getDownloadURL().pipe(
          catchError((error): Observable<ErrorLogModel> => {
            const errorLog = new ErrorLog(
              'Error while fetching downloadURLs for storage reference while uploading X-Rays.',
              error,
              ComponentType.patientService,
              '204'
            );
            return this.maintenanceService.sendErrorLog(errorLog);
          })
        ))
      );
    });
    return <Observable<string[]>>forkJoin(uploadTasks).pipe(
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while uploading patient X-Rays.', error, ComponentType.patientService, '213');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }

  deletePatientXRays(patientId: string): Observable<void> {
    const folderRef = this.storage.ref(patientId);
    return <Observable<void>>folderRef.listAll().pipe(
      mergeMap((list: ListResult) => {
        const deletionPromises = list.items.map((fileRef: Reference) => {
          return fileRef.delete().then(() => fileRef.name);
        });
        return deletionPromises.length > 0 ? from(Promise.all(deletionPromises)) : of(null);
      }),
      last(),
      mergeMap(() => of(void 0)),
      catchError((error): Observable<ErrorLogModel> => {
        const errorLog = new ErrorLog('Error while deleting Patient X-Rays.', error, ComponentType.patientService, '231');
        return this.maintenanceService.sendErrorLog(errorLog);
      })
    );
  }
}
