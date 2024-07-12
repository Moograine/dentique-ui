import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasheetViewerComponent } from './datasheet-viewer.component';

describe('DatasheetViewerComponent', () => {
  let component: DatasheetViewerComponent;
  let fixture: ComponentFixture<DatasheetViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatasheetViewerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatasheetViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
