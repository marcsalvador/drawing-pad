import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrawingPadComponent } from './drawing-pad.component';

describe('DrawingPadComponent', () => {
  let component: DrawingPadComponent;
  let fixture: ComponentFixture<DrawingPadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DrawingPadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DrawingPadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
