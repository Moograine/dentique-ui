export enum ComponentType {
  patientManager = 'patient-manager.component.ts',
  appointmentDashboard = 'appointmentDashboard.component.ts',
  header = 'header.component.ts',
  settings = 'settings.component.ts',
  location = 'location.service.ts',
  appointmentService = 'appointment.service.ts',
  patientService = 'patient.service.ts',
  doctorService = 'tooth.service.ts',
  servicesListService = 'services-list.service.ts',
  maintenanceService = 'maintenance.service.ts',
  toothViewer = 'tooth-viewer.component.ts',
  pdfViewer = 'pdf-viewer.component.ts',
  xRayViewer = 'x-ray-viewer.component.ts',
  app = 'app.component.ts'
}

export interface ErrorLogModel {
  message: string;
  error: Error;
  component: ComponentType;
  line: string;
  date: Date;
}

export class ErrorLog implements ErrorLogModel {
  message = '';
  error = new Error();
  component = ComponentType.app;
  line = '';
  date = new Date();

  constructor(message: string, error: Error, component: ComponentType, line: string) {
    this.message = message;
    this.error = error;
    this.component = component;
    this.line = `~${line}`;
  }
}
