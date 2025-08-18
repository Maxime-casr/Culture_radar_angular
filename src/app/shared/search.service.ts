import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private searchTermSubject = new BehaviorSubject<string>('');
  private locationSubject = new BehaviorSubject<string>('');

  searchTerm$ = this.searchTermSubject.asObservable();
  location$ = this.locationSubject.asObservable();

  updateSearchTerm(term: string) {
    this.searchTermSubject.next(term);
  }

  updateLocation(location: string) {
    this.locationSubject.next(location);
  }
}
