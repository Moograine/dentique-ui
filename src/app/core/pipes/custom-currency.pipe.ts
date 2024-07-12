import { Pipe, PipeTransform } from '@angular/core';
import { DoctorService } from '../services/doctor.service';
import { CurrencyType } from '../models/settings.model';

@Pipe({
  name: 'customCurrency'
})
export class CustomCurrencyPipe implements PipeTransform {
  currency: CurrencyType = 'eur';

  constructor(private doctorService: DoctorService) { // TODO create a separate service for this
    this.currency = this.doctorService.currencySubject.getValue();
  }

  /** Takes a number value which will be formatted with the preferred currency **/
  transform(value: number): string {
    if (value == null) {
      return '';
    }

    return new Intl.NumberFormat(this.getLocale(this.currency), {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private getLocale(currency: string): string {
    const currencyLocaleMap = {
      'usd': 'en-US',
      'eur': 'de-DE',
      'huf': 'hu-HU',
      'ron': 'ro-RO',
      'rsd': 'sr-RS',
      'uah': 'uk-UA',
      'czk': 'cs-CZ',
      'pln': 'pl-PL'
    };

    return currencyLocaleMap[currency as CurrencyType] || 'de-DE';
  }
}
