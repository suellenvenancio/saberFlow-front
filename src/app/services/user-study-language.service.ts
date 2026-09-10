import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserStudyLanguageRequest, UserStudyLanguageResponse } from './models';

@Injectable({ providedIn: 'root' })
export class UserStudyLanguageService {
  private readonly url = `${environment.apiUrl}/api/user-study-languages`;

  constructor(private http: HttpClient) {}

  findAll(userId: string): Observable<UserStudyLanguageResponse[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<UserStudyLanguageResponse[]>(this.url, { params });
  }

  save(
    request: UserStudyLanguageRequest,
  ): Observable<UserStudyLanguageResponse> {
    return this.http.post<UserStudyLanguageResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
