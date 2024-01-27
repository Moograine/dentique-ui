import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm = this.formBuilder.group({
    username: [''],
    password: ['']
  });
  showPassword = false;

  constructor(private formBuilder: FormBuilder, private router: Router) {
  }

  toggleShowPassword(input: HTMLInputElement): void {
    this.showPassword = !this.showPassword;
    input.type = this.showPassword ? 'text' : 'password';
  }

  login(): void {
    this.router.navigate(['']).then();
  }
}
