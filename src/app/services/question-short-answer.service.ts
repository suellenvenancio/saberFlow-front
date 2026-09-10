import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { QuestionShortAnswerResponse } from './models';

@Injectable({ providedIn: 'root' })
export class QuestionShortAnswerService {
  private readonly url = `${environment.apiUrl}/api/question-short-answers`;

  constructor(private http: HttpClient) {}

  findByQuestionId(
    questionId: string,
  ): Observable<QuestionShortAnswerResponse[]> {
    const params = new HttpParams().set('questionId', questionId);
    return this.http.get<QuestionShortAnswerResponse[]>(this.url, { params });
  }
}
