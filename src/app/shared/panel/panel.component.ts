import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent {

  constructor(private router: Router) {
  }

  navigateToAppointments(): void {
    this.router.navigate((['/appointments'])).then();
  }

  navigateToPatientManager(): void {
    this.router.navigate((['/patient-manager'])).then();
  }

  navigateToSettings(): void {
    this.router.navigate((['/settings'])).then();
  }

  logout(): void {
    this.router.navigate(['/login']).then();
  }
}
