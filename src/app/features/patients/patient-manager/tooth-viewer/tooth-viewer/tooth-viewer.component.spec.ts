import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToothViewerComponent } from './tooth-viewer.component';

describe('ToothViewerComponent', () => {
  let component: ToothViewerComponent;
  let fixture: ComponentFixture<ToothViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ToothViewerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToothViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
