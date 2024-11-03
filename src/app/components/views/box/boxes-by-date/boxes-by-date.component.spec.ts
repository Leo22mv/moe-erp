import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxesByDateComponent } from './boxes-by-date.component';

describe('BoxesByDateComponent', () => {
  let component: BoxesByDateComponent;
  let fixture: ComponentFixture<BoxesByDateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxesByDateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoxesByDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
