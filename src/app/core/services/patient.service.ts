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
  throwError,
} from 'rxjs';
import { Patient, PatientCollectionModel, PatientIdCollectionModel, PatientModel, PatientXRayFileModel } from '../models/patient.model';
import { Environment } from '../environments/environment';
import { PreviousCare, Tooth } from '../models/tooth.model';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ListResult, Reference } from '@angular/fire/compat/storage/interfaces';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  activePatient: BehaviorSubject<PatientModel> = new BehaviorSubject<PatientModel>(new Patient());

  constructor(private http: HttpClient, private storage: AngularFireStorage) {
  }

  setActivePatient(patient: PatientModel): void {
    this.activePatient.next(patient);
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
    return this.http.get<PatientIdCollectionModel>(`${Environment.defaultApi}/patients2.json?shallow=true`);
  }

  getPatients(): Observable<PatientModel[]> {
    return this.http.get<PatientModel[]>(`${Environment.defaultApi}/patients.json`)
      .pipe(
        map((data: PatientModel[]) => data
          .map(patient => new Patient({
            ...patient,
            phone: (patient?.phone?.split('-')[1] ?? patient.phone) || '',
            toothChart: patient?.toothChart.map(tooth => new Tooth({
              ...tooth,
              previousCares: tooth?.previousCares?.map(previousCare => new PreviousCare(previousCare)) || []
            }))
          })))
      );
  }

  getPatientById(patientId: string): Observable<PatientModel> {
    return this.http.get<PatientModel>(`${Environment.defaultApi}/patients2/${patientId}.json`).pipe(
      map(patient => new Patient({
        ...patient,
        toothChart: patient?.toothChart?.map(tooth => new Tooth({
          ...tooth,
          previousCares: tooth?.previousCares?.map(previousCare => new PreviousCare(previousCare)) || []
        })) || []
      }))
    );
  }

  getPatientsByPhone(phone: string): Observable<PatientCollectionModel> {
    return this.http.get<PatientCollectionModel>(
      `${Environment.defaultApi}/patients2.json?orderBy="phone"&startAt="${phone}"&endAt="${phone}\uf8ff"`)
      .pipe(
        map(response => {
          const patientCollection: PatientCollectionModel = {};
          for (const key in response) {
            if (response.hasOwnProperty(key)) {
              const patient = response[key];
              patientCollection[key] = new Patient({
                ...patient,
                toothChart: patient.toothChart?.map(tooth => new Tooth({
                  ...tooth,
                  previousCares: tooth?.previousCares?.map(previousCare => new PreviousCare(previousCare)) || []
                })) || []
              });
            }
          }
          return patientCollection;
        })
      );
  }

  getPatientsByName(name: string, reversed: boolean = false): Observable<PatientCollectionModel> {
    const queryAttribute = 'searchKeyName' + (reversed ? 'Reversed' : '');
    return this.http.get<PatientCollectionModel>(
      `${Environment.defaultApi}/patients2.json?orderBy="${queryAttribute}"&startAt="${name}"&endAt="${name}\uf8ff"`)
      .pipe(
        map(response => {
          const patientCollection: PatientCollectionModel = {};
          for (const key in response) {
            if (response.hasOwnProperty(key)) {
              const patient = response[key];
              patientCollection[key] = new Patient({
                ...patient,
                toothChart: patient.toothChart?.map(tooth => new Tooth({
                  ...tooth,
                  previousCares: tooth?.previousCares?.map(previousCare => new PreviousCare(previousCare)) || []
                })) || []
              });
            }
          }
          return patientCollection;
        })
      );
  }

  savePatient(patient: PatientModel, patientId: string): Observable<PatientModel> {
    return <Observable<PatientModel>>this.http.put(`${Environment.defaultApi}/patients2/${patientId}.json`, patient);
  }

  getPatientXRaysById(patientId: string): Observable<string[]> {
    return this.storage.ref(patientId).listAll().pipe(
      switchMap(list => {
        const observables = list.items.map(item => {
          return item.getDownloadURL();
        });
        return forkJoin(observables).pipe(
          catchError(error => {
            return throwError(error);
          })
        );
      }),
      catchError(error => {
        return throwError(error);
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
        switchMap(() => this.storage.ref(filePath).getDownloadURL())
      );
    });
    return forkJoin(uploadTasks);
  }

  deletePatientXRays(patientId: string): Observable<void> {
    const folderRef = this.storage.ref(patientId);
    return folderRef.listAll().pipe(
      mergeMap((list: ListResult) => {
        const deletionPromises = list.items.map((fileRef: Reference) => {
          return fileRef.delete().then(() => fileRef.name);
        });
        return deletionPromises.length > 0 ? from(Promise.all(deletionPromises)) : of(null);
      }),
      last(),
      mergeMap(() => of(void 0))
    );
  }
}
