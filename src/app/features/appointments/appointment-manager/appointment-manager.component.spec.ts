import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentManagerComponent } from './appointment-manager.component';

describe('AppointmentManagerComponent', () => {
  let component: AppointmentManagerComponent;
  let fixture: ComponentFixture<AppointmentManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AppointmentManagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
