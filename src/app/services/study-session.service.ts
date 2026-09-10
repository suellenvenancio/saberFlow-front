import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { StudySessionRequest, StudySessionResponse } from './models';

@Injectable({ providedIn: 'root' })
export class StudySessionService {
  private readonly url = `${environment.apiUrl}/api/study-sessions`;

  constructor(private http: HttpClient) {}

  findAll(userId?: string): Observable<StudySessionResponse[]> {
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<StudySessionResponse[]>(this.url, { params });
  }

  findById(id: string): Observable<StudySessionResponse> {
    return this.http.get<StudySessionResponse>(`${this.url}/${id}`);
  }

  save(request: StudySessionRequest): Observable<StudySessionResponse> {
    return this.http.post<StudySessionResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
