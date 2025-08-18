import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevenirOrganisateurComponent } from './devenir-organisateur.component';

describe('DevenirOrganisateurComponent', () => {
  let component: DevenirOrganisateurComponent;
  let fixture: ComponentFixture<DevenirOrganisateurComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevenirOrganisateurComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DevenirOrganisateurComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
