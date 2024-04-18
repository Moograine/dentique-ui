import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XRayViewerComponent } from './x-ray-viewer.component';

describe('XRayViewerComponent', () => {
  let component: XRayViewerComponent;
  let fixture: ComponentFixture<XRayViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ XRayViewerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(XRayViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
