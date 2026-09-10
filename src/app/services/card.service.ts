import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardRequest, CardResponse, Level } from './models';

export interface CardFilter {
  categoryIds?: string[];
  languageId: string;
  level?: Level;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly url = `${environment.apiUrl}/api/cards`;

  constructor(private http: HttpClient) {}

  findByFilter(filter?: CardFilter): Observable<CardResponse[]> {
    let params = new HttpParams();
    if (filter?.categoryIds)
      params = params.set('categoryIds', filter.categoryIds.join(','));
    if (filter?.languageId)
      params = params.set('languageId', filter.languageId);
    if (filter?.level) params = params.set('level', filter.level);
    if (filter?.size) params = params.set('size', filter.size);
    return this.http.get<CardResponse[]>(this.url, { params });
  }

  findById(id: string): Observable<CardResponse> {
    return this.http.get<CardResponse>(`${this.url}/${id}`);
  }

  save(request: CardRequest): Observable<CardResponse> {
    return this.http.post<CardResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
