import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentBuilderComponent } from './document-builder.component';

describe('DocumentBuilderComponent', () => {
  let component: DocumentBuilderComponent;
  let fixture: ComponentFixture<DocumentBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DocumentBuilderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
