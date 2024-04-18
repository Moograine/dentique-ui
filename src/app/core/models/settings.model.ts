export type SearchType = 'phone' | 'name' | 'date';

export interface LanguageModel {
  language: string;
  code: string;
}

export interface SearchOptionModel {
  option: SearchType;
  icon: string;
}
