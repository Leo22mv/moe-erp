import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPromoComponent } from './add-promo.component';

describe('AddPromoComponent', () => {
  let component: AddPromoComponent;
  let fixture: ComponentFixture<AddPromoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPromoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPromoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
