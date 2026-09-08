import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserAnswerRequest, UserAnswerResponse } from './models';

@Injectable({ providedIn: 'root' })
export class UserAnswerService {
  private readonly url = 'https://saberflow-api.onrender.com/api/user-answers';

  constructor(private http: HttpClient) {}

  findAll(params?: {
    userId?: string;
    questionId?: string;
  }): Observable<UserAnswerResponse[]> {
    let httpParams = new HttpParams();
    if (params?.userId) httpParams = httpParams.set('userId', params.userId);
    if (params?.questionId)
      httpParams = httpParams.set('questionId', params.questionId);
    return this.http.get<UserAnswerResponse[]>(this.url, {
      params: httpParams,
    });
  }

  findById(id: string): Observable<UserAnswerResponse> {
    return this.http.get<UserAnswerResponse>(`${this.url}/${id}`);
  }

  save(request: UserAnswerRequest): Observable<UserAnswerResponse> {
    return this.http.post<UserAnswerResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
