import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryRequest, CategoryResponse } from './models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly url = 'http://localhost:8080/api/categories';

  constructor(private http: HttpClient) {}

  findAll(languageId?: string): Observable<CategoryResponse[]> {
    const params = languageId
      ? new HttpParams().set('languageId', languageId)
      : undefined;
    return this.http.get<CategoryResponse[]>(this.url, { params });
  }

  findById(id: string): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${this.url}/${id}`);
  }

  save(request: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
