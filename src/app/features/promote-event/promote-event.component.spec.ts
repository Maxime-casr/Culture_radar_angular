import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromoteEventComponent } from './promote-event.component';

describe('PromoteEventComponent', () => {
  let component: PromoteEventComponent;
  let fixture: ComponentFixture<PromoteEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromoteEventComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromoteEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
