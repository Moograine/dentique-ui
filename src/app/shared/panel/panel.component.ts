import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent {
  openSettingsModal = false;

  constructor(private router: Router) {
  }

  openSettings(): void {
    this.openSettingsModal = true;
  }

  navigateToAppointments(): void {
    this.router.navigate((['/appointments'])).then();
  }

  logout(): void {
    this.router.navigate(['/login']).then();
  }
}
