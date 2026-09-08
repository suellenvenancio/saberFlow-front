import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { QuestionRequest, QuestionResponse } from './models';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly url = 'http://localhost:8080/api/questions';

  constructor(private http: HttpClient) {}

  findAll(categoryId?: string): Observable<QuestionResponse[]> {
    const params = categoryId
      ? new HttpParams().set('categoryId', categoryId)
      : undefined;
    return this.http.get<QuestionResponse[]>(this.url, { params });
  }

  findById(id: string): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(`${this.url}/${id}`);
  }

  save(request: QuestionRequest): Observable<QuestionResponse> {
    return this.http.post<QuestionResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
