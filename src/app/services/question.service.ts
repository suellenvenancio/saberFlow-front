import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { QuestionRequest, QuestionResponse } from './models';

export interface QuestionFilter {
  categoryIds?: string[];
  languageId?: string;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly url = `${environment.apiUrl}/api/questions`;

  constructor(private http: HttpClient) {}

  findByFilter(filter?: QuestionFilter): Observable<QuestionResponse[]> {
    let params = new HttpParams();
    if (filter?.categoryIds)
      params = params.set('categoryIds', filter.categoryIds.join(','));
    if (filter?.languageId)
      params = params.set('languageId', filter.languageId);
    if (filter?.size) params = params.set('size', filter.size);
    return this.http.get<QuestionResponse[]>(this.url, { params });
  }

  findAll(categoryId?: string): Observable<QuestionResponse[]> {
    const params = categoryId
      ? new HttpParams().set('categoryIds', categoryId)
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
