import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
  PatientManagerComponent
} from './features/patients/patient-manager/patient-manager.component';
import {
  PatientDashboardComponent
} from './features/patients/patient-dashboard/patient-dashboard.component';
import {
  AppointmentDashboardComponent
} from './features/appointments/appointment-dashboard/appointment-dashboard.component';
import {
  AppointmentManagerComponent
} from './features/appointments/appointment-manager/appointment-manager.component';
import { LoginComponent } from './onboarding/login/login.component';
import { FeaturesComponent } from './features/features.component';
import { PdfViewerComponent } from './features/patients/patient-manager/document-builder/pdf-viewer/pdf-viewer.component';
import { SettingsComponent } from './features/settings/settings.component';
import { ServicesTableComponent } from './features/settings/services-table/services-table.component';
import { PatientListComponent } from './features/patients/patient-list/patient-list.component';
import { ServicesListGuard } from './core/guards/services-list-redirect.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'appointments'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: FeaturesComponent,
    children: [
      {
        path: 'patient-dashboard',
        component: PatientDashboardComponent
      },
      {
        path: 'patient-manager',
        component: PatientManagerComponent,
      },
      {
        path: 'patient-list',
        component: PatientListComponent,
      },
      {
        path: 'pdf',
        component: PdfViewerComponent
      },
      {
        path: 'appointments',
        component: AppointmentDashboardComponent
      },
      {
        path: 'appointment-manager',
        component: AppointmentManagerComponent
      },
      {
        path: 'settings',
        component: SettingsComponent
      },
      {
        path: 'services-table',
        component: ServicesTableComponent,
        canActivate: [ServicesListGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
