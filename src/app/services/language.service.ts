import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LanguageRequest, LanguageResponse } from './models';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly url = 'https://saberflow-api.onrender.com/api/languages';

  constructor(private http: HttpClient) {}

  findAll(): Observable<LanguageResponse[]> {
    return this.http.get<LanguageResponse[]>(this.url);
  }

  findById(id: string): Observable<LanguageResponse> {
    return this.http.get<LanguageResponse>(`${this.url}/${id}`);
  }

  save(request: LanguageRequest): Observable<LanguageResponse> {
    return this.http.post<LanguageResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
