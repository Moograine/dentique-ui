import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppointmentManagerComponent } from './features/appointments/appointment-manager/appointment-manager.component';
import { AppointmentDashboardComponent } from './features/appointments/appointment-dashboard/appointment-dashboard.component';
import { PatientManagerComponent } from './features/patients/patient-manager/patient-manager.component';
import { PatientDashboardComponent } from './features/patients/patient-dashboard/patient-dashboard.component';
import { HeaderComponent } from './shared/header/header.component';
import { PanelComponent } from './shared/panel/panel.component';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './onboarding/login/login.component';
import { FeaturesComponent } from './features/features.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { OrderListModule } from 'primeng/orderlist';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ToothViewerComponent } from './features/patients/patient-manager/tooth-viewer/tooth-viewer/tooth-viewer.component';
import { PdfViewerComponent } from './features/patients/patient-manager/pdf-viewer/pdf-viewer/pdf-viewer.component';
import { OfflineComponent } from './onboarding/offline/offline.component';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { SettingsComponent } from './features/settings/settings.component';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { XRayViewerComponent } from './features/patients/patient-manager/x-ray-viewer/x-ray-viewer.component';
import { KeyFilterModule } from 'primeng/keyfilter';
import { ChipsModule } from 'primeng/chips';
import { TooltipModule } from 'primeng/tooltip';
import { PatientDetailsComponent } from './features/patients/patient-manager/patient-details/patient-details.component';
import { GalleriaModule } from 'primeng/galleria';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFireModule } from '@angular/fire/compat';
import { FirebaseConfig } from './core/environments/environment';
import { FileUploadModule } from 'primeng/fileupload';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/translations/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    AppointmentManagerComponent,
    AppointmentDashboardComponent,
    PatientManagerComponent,
    PatientDashboardComponent,
    HeaderComponent,
    PanelComponent,
    LoginComponent,
    FeaturesComponent,
    ToothViewerComponent,
    PdfViewerComponent,
    OfflineComponent,
    SettingsComponent,
    XRayViewerComponent,
    PatientDetailsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    InputTextModule,
    InputTextareaModule,
    ReactiveFormsModule,
    CalendarModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    OrderListModule,
    DialogModule,
    DropdownModule,
    ToastModule,
    RippleModule,
    GalleriaModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    KeyFilterModule,
    ChipsModule,
    TooltipModule,
    FileUploadModule,
    AngularFireModule.initializeApp(FirebaseConfig),
    AngularFireStorageModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})

export class AppModule {
}
