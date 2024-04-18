import { Component, OnInit } from '@angular/core';
import { InternetConnectionService } from './core/services/internet-connection';
import { PrimeNGConfig } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { LocationService } from './core/services/location.service';
import { CountryCode, CountryCodeModel } from './core/models/location.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isInternetAvailable$ = this.internetConnection.checkInternetConnection();

  constructor(private internetConnection: InternetConnectionService,
              private primengConfig: PrimeNGConfig,
              private locationService: LocationService,
              private translateService: TranslateService) {
  }

  ngOnInit() {
    this.setRippleConfig();
    this.initializeTranslations();
    this.getCountryCodes();
  }

  setRippleConfig(): void {
    this.primengConfig.ripple = true;
  }

  getCountryCodes(): void {
    this.locationService.getCountryCodes().subscribe((countryCodes: CountryCodeModel[]): void => {
      this.locationService.countryCodes = countryCodes;
      this.locationService.selectedCountryCode = new CountryCode( { ...countryCodes[178] }); /* Default dial code is set to Romania. */
    });
  }

  initializeTranslations(): void {
    // TODO implement initialization based on user settings
    this.translateService.setDefaultLang('en');
    this.translateService.use('en');
  }

  tryConnection(): void {
    console.log('Reconnecting...');
    // TODO implement retrying
    this.isInternetAvailable$ = this.internetConnection.checkInternetConnection();
  }
}
