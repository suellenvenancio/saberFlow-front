import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRequest, UserResponse } from './models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = 'https://saberflow-api.onrender.com/api/users';

  constructor(private http: HttpClient) {}

  findAll(email?: string): Observable<UserResponse[]> {
    const params = email ? new HttpParams().set('email', email) : undefined;
    return this.http.get<UserResponse[]>(this.url, { params });
  }

  findById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.url}/${id}`);
  }

  save(request: UserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.url, request);
  }

  deleteById(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
