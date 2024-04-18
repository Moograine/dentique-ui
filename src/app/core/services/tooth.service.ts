import { Injectable } from '@angular/core';
import { DetailedToothNotationModel, PreviousCareModel, ToothNotation, ToothNotationModel, ToothModel } from '../models/tooth.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ToothService {
  /** Array of tooth notations for displaying the Tooth Chart
   *
   * A healthy adult has 32 teeth, which means there are 32 objects, where
   *
   *    labelFDI: representation of the respective tooth in the FDI World Dental Federation Notation
   *    labelUNS: representation of the respective tooth in the Universal Numbering System
   *    image: name of the image file
   *
   * Universal Numbering System
   *  Adult
   *    From 1 to 32 | in the top denture, from 1 to 16 and in the bottom denture, from 32 to 17
   *  Child
   *    From "A" to "T" | in the top denture, from "A" to J " and in the bottom denture, from "T" to "K"
   *
   * FDI World Dental Federation Notation
   *  Adult
   *    4 quadrants (1, 2, 3, 4) and 8 teeth per quadrant
   *  Child
   *    4 quadrants (5, 6, 7, 8) and 5 teeth per quadrant
   *
   * See: https://en.wikipedia.org/wiki/Dental_notation
   */

  constructor(private http: HttpClient) {
  }

  notationChart = [
    { labelFDI: '1.8', labelUNS: '1', image: 'molar.png' },
    { labelFDI: '1.7', labelUNS: '2', image: 'molar.png' },
    { labelFDI: '1.6', labelUNS: '3', image: 'molar.png' },
    { labelFDI: '1.5', labelUNS: '4', image: 'premolar.png' },
    { labelFDI: '1.4', labelUNS: '5', image: 'premolar.png' },
    { labelFDI: '1.3', labelUNS: '6', image: 'canine.png' },
    { labelFDI: '1.2', labelUNS: '7', image: 'incisor_smaller.png' },
    { labelFDI: '1.1', labelUNS: '8', image: 'incisor.png' },
    { labelFDI: '2.1', labelUNS: '9', image: 'incisor.png' },
    { labelFDI: '2.2', labelUNS: '10', image: 'incisor_smaller.png' },
    { labelFDI: '2.3', labelUNS: '11', image: 'canine.png' },
    { labelFDI: '2.4', labelUNS: '12', image: 'premolar.png' },
    { labelFDI: '2.5', labelUNS: '13', image: 'premolar.png' },
    { labelFDI: '2.6', labelUNS: '14', image: 'molar.png' },
    { labelFDI: '2.7', labelUNS: '15', image: 'molar.png' },
    { labelFDI: '2.8', labelUNS: '16', image: 'molar.png' },
    { labelFDI: '4.8', labelUNS: '32', image: 'molar.png' },
    { labelFDI: '4.7', labelUNS: '31', image: 'molar.png' },
    { labelFDI: '4.6', labelUNS: '30', image: 'molar.png' },
    { labelFDI: '4.5', labelUNS: '29', image: 'premolar.png' },
    { labelFDI: '4.4', labelUNS: '28', image: 'premolar.png' },
    { labelFDI: '4.3', labelUNS: '27', image: 'canine.png' },
    { labelFDI: '4.2', labelUNS: '26', image: 'incisor_smaller.png' },
    { labelFDI: '4.1', labelUNS: '25', image: 'incisor.png' },
    { labelFDI: '3.1', labelUNS: '24', image: 'incisor.png' },
    { labelFDI: '3.2', labelUNS: '23', image: 'incisor_smaller.png' },
    { labelFDI: '3.3', labelUNS: '22', image: 'canine.png' },
    { labelFDI: '3.4', labelUNS: '21', image: 'premolar.png' },
    { labelFDI: '3.5', labelUNS: '20', image: 'premolar.png' },
    { labelFDI: '3.6', labelUNS: '19', image: 'molar.png' },
    { labelFDI: '3.7', labelUNS: '18', image: 'molar.png' },
    { labelFDI: '3.8', labelUNS: '17', image: 'molar.png' }
  ];

  toothChartForPDF = [
    { labelFDI: '1.8', labelUNS: '1', top: 68.5, left: 83 },
    { labelFDI: '1.7', labelUNS: '2', top: 56.5, left: 84.25 },
    { labelFDI: '1.6', labelUNS: '3', top: 44.5, left: 82.75 },
    { labelFDI: '1.5', labelUNS: '4', top: 34.5, left: 79.25 },
    { labelFDI: '1.4', labelUNS: '5', top: 25.5, left: 74 },
    { labelFDI: '1.3', labelUNS: '6', top: 17.5, left: 69.25 },
    { labelFDI: '1.2', labelUNS: '7', top: 10.5, left: 62.75 },
    { labelFDI: '1.1', labelUNS: '8', top: 7.5, left: 52 },
    { labelFDI: '2.1', labelUNS: '9', top: 7.5, left: 40.25 },
    { labelFDI: '2.2', labelUNS: '10', top: 10.5, left: 29.25 },
    { labelFDI: '2.3', labelUNS: '11', top: 17.5, left: 22.5 },
    { labelFDI: '2.4', labelUNS: '12', top: 25.5, left: 18.25 },
    { labelFDI: '2.5', labelUNS: '13', top: 34.5, left: 13.25 },
    { labelFDI: '2.6', labelUNS: '14', top: 44.5, left: 9 },
    { labelFDI: '2.7', labelUNS: '15', top: 56.5, left: 8 },
    { labelFDI: '2.8', labelUNS: '16', top: 68.5, left: 9.5 },
    { labelFDI: '4.8', labelUNS: '32', top: 7, left: 9 },
    { labelFDI: '4.7', labelUNS: '31', top: 19, left: 8 },
    { labelFDI: '4.6', labelUNS: '30', top: 31.5, left: 9 },
    { labelFDI: '4.5', labelUNS: '29', top: 40.75, left: 13.25 },
    { labelFDI: '4.4', labelUNS: '28', top: 49.5, left: 18.25 },
    { labelFDI: '4.3', labelUNS: '27', top: 57.75, left: 22.75 },
    { labelFDI: '4.2', labelUNS: '26', top: 64.5, left: 29.5 },
    { labelFDI: '4.1', labelUNS: '25', top: 68.5, left: 40 },
    { labelFDI: '3.1', labelUNS: '24', top: 68.5, left: 52 },
    { labelFDI: '3.2', labelUNS: '23', top: 64.5, left: 62.5 },
    { labelFDI: '3.3', labelUNS: '22', top: 57.75, left: 69.5 },
    { labelFDI: '3.4', labelUNS: '21', top: 49.5, left: 74 },
    { labelFDI: '3.5', labelUNS: '20', top: 40.75, left: 79 },
    { labelFDI: '3.6', labelUNS: '19', top: 31.5, left: 83 },
    { labelFDI: '3.7', labelUNS: '18', top: 19, left: 84.5 },
    { labelFDI: '3.8', labelUNS: '17', top: 7, left: 83 },
  ];

  notationChartBaby = [
    { labelFDI: '5.6', labelUNS: 'A', image: 'molar.png' },
    { labelFDI: '5.5', labelUNS: 'B', image: 'molar.png' },
    { labelFDI: '5.4', labelUNS: 'C', image: 'molar.png' },
    { labelFDI: '5.3', labelUNS: 'D', image: 'canine.png' },
    { labelFDI: '5.2', labelUNS: 'E', image: 'incisor_smaller.png' },
    { labelFDI: '5.1', labelUNS: 'F', image: 'incisor.png' },
    { labelFDI: '6.1', labelUNS: 'G', image: 'incisor.png' },
    { labelFDI: '6.2', labelUNS: 'H', image: 'incisor_smaller.png' },
    { labelFDI: '6.3', labelUNS: 'I', image: 'canine.png' },
    { labelFDI: '6.4', labelUNS: 'J', image: 'molar.png' },
    { labelFDI: '6.5', labelUNS: '11', image: 'molar.png' },
    { labelFDI: '6.6', labelUNS: '12', image: 'molar.png' },
    { labelFDI: '8.6', labelUNS: '13', image: 'molar.png' },
    { labelFDI: '8.5', labelUNS: '14', image: 'molar.png' },
    { labelFDI: '8.4', labelUNS: '15', image: 'molar.png' },
    { labelFDI: '8.3', labelUNS: '16', image: 'canine.png' },
    { labelFDI: '8.2', labelUNS: '17', image: 'incisor_smaller.png' },
    { labelFDI: '8.1', labelUNS: '18', image: 'incisor.png' },
    { labelFDI: '7.1', labelUNS: '19', image: 'incisor.png' },
    { labelFDI: '7.2', labelUNS: '20', image: 'incisor_smaller.png' },
    { labelFDI: '7.3', labelUNS: '21', image: 'canine.png' },
    { labelFDI: '7.4', labelUNS: '22', image: 'molar.png' },
    { labelFDI: '7.5', labelUNS: '23', image: 'molar.png' },
    { labelFDI: '7.6', labelUNS: '24', image: 'molar.png' }
  ];

  // TODO Think of a functional system for the tooth eruption and constantly changing baby teeth arrays

  getToothNotation(notation: 'FDI' | 'UNS'): ToothNotationModel[] { // TODO create proper model
    return this.notationChart.map((tooth: DetailedToothNotationModel) => {
      return new ToothNotation(tooth[`label${notation}`], tooth.image);
    });
  }

  savePatientToothChart(patientId: number, toothDataCollection: ToothModel[]): Observable<ToothModel[]> {
    return <Observable<ToothModel[]>>this.http
      .put(`${Environment.defaultApi}/patients/${patientId}/toothChart.json`, toothDataCollection);
  }

  saveTooth(patientId: number, toothId: number, tooth: ToothModel): Observable<ToothModel> {
    console.log(`${Environment.defaultApi}/patients/${patientId}/toothChart/${toothId}.json`);
    return <Observable<ToothModel>>this.http
      .put(`${Environment.defaultApi}/patients/${patientId}/toothChart/${toothId}.json`, tooth);
  }


  savePreviousCare(patientId: number, toothId: number, previousCareId: number, previousCare: PreviousCareModel): Observable<PreviousCareModel> {
    console.log(`${Environment.defaultApi}/patients/${patientId}/toothChart/${toothId}/previousCares/${previousCareId}.json`);
    return <Observable<PreviousCareModel>>this.http
      .put(`${Environment.defaultApi}/patients/${patientId}/toothChart/${toothId}/previousCares/${previousCareId}.json`, previousCare);
  }
}
