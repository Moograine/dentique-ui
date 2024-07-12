export type SearchType = 'phone' | 'name' | 'date';

export type CurrencyType = 'eur' | 'usd' | 'huf' | 'ron' | 'rsd' | 'uah' | 'czk' | 'pln';

export interface LanguageModel {
  language: string;
  code: string;
}

export interface SearchOptionModel {
  option: SearchType;
  icon: string;
}

export interface CurrencyOptionModel {
  currency: CurrencyType;
  label: string;
}
