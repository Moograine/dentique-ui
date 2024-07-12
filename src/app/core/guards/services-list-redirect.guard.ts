import { inject, Injectable } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ServicesListRedirectGuard {

  constructor(private router: Router) {
  }

  canActivate(): boolean {
    /* If the page was loaded directly on the services-list page, redirect to the settings page, to make sure the currency pipe is fetched properly */
    if (this.router.url === '/') {
      this.router.navigate(['/settings']).then();
      return false;
    }

    return true;
  }
}

export const ServicesListGuard: CanActivateFn = (): boolean => {
  return inject(ServicesListRedirectGuard).canActivate();
}
