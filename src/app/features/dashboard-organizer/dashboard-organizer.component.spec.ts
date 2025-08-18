// src/app/features/dashboard-organizer/dashboard-organizer.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganizerDashboardComponent } from './dashboard-organizer.component';

describe('OrganizerDashboardComponent', () => {
  let component: OrganizerDashboardComponent;
  let fixture: ComponentFixture<OrganizerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Pour un composant standalone, on le met dans "imports"
      imports: [OrganizerDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

