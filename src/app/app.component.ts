import { Component, OnInit } from '@angular/core';
import { InternetConnectionService } from './core/services/internet-connection';
import { PrimeNGConfig } from 'primeng/api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isInternetAvailable$ = this.internetConnection.checkInternetConnection();

  constructor(private internetConnection: InternetConnectionService, private primengConfig: PrimeNGConfig) {
  }

  ngOnInit() {
    this.setRippleConfig();
  }

  setRippleConfig(): void {
    this.primengConfig.ripple = true;
  }


  tryConnection(): void {
    console.log('Reconnecting...');
    // TODO implement retrying
    this.isInternetAvailable$ = this.internetConnection.checkInternetConnection();
  }
}
