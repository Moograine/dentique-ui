import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent {
  menuItems = [
    {
      path: 'appointments',
      icon: 'pi-calendar-clock',
      label: 'menu.appointments'
    },
    {
      path: 'patient-manager',
      icon: 'pi-user',
      label: 'menu.patient_manager'
    },
    {
      path: 'patient-list',
      icon: 'pi-users',
      label: 'menu.patient_list'
    },
    {
      path: 'settings',
      icon: 'pi-cog',
      label: 'menu.settings'
    },
    {
      path: 'login',
      icon: 'pi-sign-out',
      label: 'menu.logout'
    }
  ]

  constructor(private router: Router) {
  }

  navigateTo(path: string): void {
    this.router.navigate([path]).then();
  }

  logout(): void {
    this.router.navigate(['login']).then();
  }
}
