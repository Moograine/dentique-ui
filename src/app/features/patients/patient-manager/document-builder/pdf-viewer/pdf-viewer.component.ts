import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent {
  @ViewChild('content') content!: ElementRef;
  @Output() hidePdfViewer: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() receipt = false;

  /** Function to emit a signal to the parent component, that this component is finished and can be destroyed **/
  closePdfViewer(): void {
    this.hidePdfViewer.emit(true);
  }

  generatePDF(): void {
    // const pdfTemplate = this.content.nativeElement.cloneNode(true);
    let pdfTemplate = this.content.nativeElement;
    let format: string | number[] = 'a4';
    let pdfWidth = 210; /* Width in millimeter for A4 paper */
    let pdfHeight = 500;


    if (this.receipt) {
      //pdfTemplate.style.position = 'static';
      pdfTemplate = this.content.nativeElement.firstChild.firstChild;
      if (pdfTemplate.children[1] && pdfTemplate.children[1].children) {
        for (let child of Array.from(pdfTemplate.children[1].children)) {
          (child as HTMLElement).style.overflow = 'unset';
        }
      }

      pdfWidth = 100;
      pdfHeight = 250;
      format = [pdfWidth, pdfHeight];
    } else {
      const pdfTemplate = this.content.nativeElement.cloneNode(true);
      pdfTemplate.style.transform = 'none'; /* TODO - As of now, responsiveness is solved with an unspeakable cheap trick, which is transform: scale() */
      pdfTemplate.style.position = 'fixed';
    }

    //document.body.appendChild(pdfTemplate);
    html2canvas(pdfTemplate, { scale: 3 }).then(canvas => {
      //document.body.removeChild(pdfTemplate);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', format);

      /* Calculate ratio of the content */
      const imgProps = pdf.getImageProperties(imgData);
      pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'png', 0, 0, pdfWidth, pdfHeight);
      pdf.save('receipt.pdf');
    });
  }

  generatePDF2(): void {
    const pdfTemplate = this.content.nativeElement.firstChild.firstChild;
    if (pdfTemplate.children[1] && pdfTemplate.children[1].children) {
      for (let child of Array.from(pdfTemplate.children[1].children)) {
        (child as HTMLElement).style.overflow = 'unset';
      }
    }
    const format = [100, 250]//'a4';
    //document.body.appendChild(pdfTemplate);
    document.fonts.ready.then(() => {
      html2canvas(pdfTemplate, { scale: 3, useCORS: true }).then(canvas => {
        //document.body.removeChild(pdfTemplate);
        const imgData = canvas.toDataURL('image/png');
        console.log(typeof imgData, imgData.length);
        const pdf = new jsPDF('p', 'mm', format);
        /* Calculate ratio of the content */
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = 100; /* Width in millimeter for A4 paper */

        const pdfHeight = 250//(imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'image/jpeg', 0, 0, pdfWidth, pdfHeight);
        pdf.save('receipt.pdf');
      });
    });
  }
}
