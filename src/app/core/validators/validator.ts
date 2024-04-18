import { AbstractControl, ValidatorFn, Validators } from '@angular/forms';

export function onlySpaceValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: boolean } | null => {
    const value: string = control.value;
    if (value && value.trim().length === 0) {
      return { 'onlySpace': true };
    }
    return null;
  };
}

export const nameValidators = [
  Validators.required,
  Validators.minLength(1),
  onlySpaceValidator()
];

export const phoneValidators = [
  Validators.required,
  Validators.minLength(7),
  Validators.maxLength(15),
  onlySpaceValidator()
];

export const required = Validators.required;
