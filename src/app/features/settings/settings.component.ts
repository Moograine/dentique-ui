import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DoctorService } from '../../core/services/doctor.service';
import { LanguageModel, SearchOptionModel } from '../../core/models/settings.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

export class SettingsComponent implements OnInit {
  languageOptions: LanguageModel[] = [
    { language: 'English', code: 'en' },
    { language: 'Hungarian', code: 'hu' },
    { language: 'Romanian', code: 'ro' },
    { language: 'German', code: 'de' },
    { language: 'Czech', code: 'cz' },
    { language: 'Spanish', code: 'es' },
    { language: 'Polish', code: 'pl' },
    { language: 'Serbian', code: 'rs' },
    { language: 'Ukrainian', code: 'ua' },
  ];
  selectedLanguage: LanguageModel = {
    language: 'English', code: 'en'
  }
  themeOptions = ['Dark'];
  selectedTheme = 'Dark';
  notationSystemOptions = ['FDI', 'UNS'];
  selectedNotationSystem: 'FDI' | 'UNS' = 'FDI'; /* Default notation system in Europe. */
  defaultSearchOptions: SearchOptionModel[] = [
    {
      option: 'phone',
      icon: 'pi-phone'
    },
    {
      option: 'name',
      icon: 'pi-user'
    }
  ];
  selectedDefaultSearch: SearchOptionModel = {
    option: 'phone',
    icon: 'pi-phone'
  };

  constructor(private translateService: TranslateService, private doctorService: DoctorService) {
  }

  ngOnInit() {
    this.initializeLanguage();
    this.initializeNotationSystem();
  }

  initializeNotationSystem(): void {
    this.selectedNotationSystem = this.doctorService.notationSystem;
  }

  initializeLanguage(): void {
    const currentLanguage = this.translateService.currentLang;
    for (let language of this.languageOptions) {
      if (language.code === currentLanguage) {
        this.selectedLanguage = language;
        return;
      }
    }
  }

  changeLanguage(language: LanguageModel): void {
    this.translateService.setDefaultLang(language.code);
    this.translateService.use(language.code);
  }

  changeNotationSystem(notationSystem: 'FDI' | 'UNS'): void {
    this.doctorService.notationSystem = notationSystem;
  }
}
