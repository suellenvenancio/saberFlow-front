import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OptionRequest, OptionResponse } from './models';

@Injectable({ providedIn: 'root' })
export class OptionService {
  private readonly url = 'http://localhost:8080/api/options';

  constructor(private http: HttpClient) {}

  findAll(questionId?: string): Observable<OptionResponse[]> {
    const params = questionId
      ? new HttpParams().set('questionId', questionId)
      : undefined;
    return this.http.get<OptionResponse[]>(this.url, { params });
  }

  findById(id: string): Observable<OptionResponse> {
    return this.http.get<OptionResponse>(`${this.url}/${id}`);
  }

  save(request: OptionRequest): Observable<OptionResponse> {
    return this.http.post<OptionResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
