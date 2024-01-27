import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PatientModel } from '../../../../../core/models/patient.model';
import { PatientService } from '../../../../../core/services/patient.service';
import jsPDF from 'jspdf';
import { ToothService } from '../../../../../core/services/tooth.service';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit, AfterViewInit {
  @ViewChild('content') content!: ElementRef;
  patient: PatientModel = this.patientService.activePatient;

  constructor(private patientService: PatientService, private toothService: ToothService) {
  }

  ngOnInit(): void {
    this.initializePatient();
  }

  ngAfterViewInit(): void {
   this.generatePDF();
  }

  initializePatient(): void {
    this.patient.firstName = 'Zsolt';
    this.patient.lastName = 'Keresztes';
    this.patient.sex = 'Mr.';
    this.patient.PIN = '5000212142381';
    this.patient.phone = '+40755753463';
    this.patient.county = 'Harghita';
    this.patient.town = 'Miercurea-Ciuc';
    this.patient.address = 'Str. Jigodin, nr. 1';
    console.log(this.patientService.activePatient);
  }

  generatePDF(): void {
    const pdf = new jsPDF({ format: 'a4' });
    pdf.html(this.content.nativeElement, {
      callback: (pdf: jsPDF) => pdf.save('receipt.pdf')
    });
  }
}
