import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesByDateComponent } from './sales-by-date.component';

describe('SalesByDateComponent', () => {
  let component: SalesByDateComponent;
  let fixture: ComponentFixture<SalesByDateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesByDateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesByDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
