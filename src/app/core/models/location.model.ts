export interface CountyModel {
  name: string;
}

export interface CountryCodeModel {
  code: string;
  dial_code: string;
  emoji: string;
  image: string;
  name: string;
  unicode: string;
}

export class CountryCode implements CountryCodeModel {
  code = 'RO';
  dial_code = '+40'
  emoji = '🇷🇴';
  image = 'https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/images/RO.svg';
  name = 'Romania';
  unicode = 'U+1F1F7 U+1F1F4';

  constructor(countryCodeData: Partial<CountryCodeModel> = {}) {
    Object.assign(this, countryCodeData);
  }
}