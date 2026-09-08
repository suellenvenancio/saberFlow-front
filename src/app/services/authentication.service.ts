import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { LoginRequest, TokenResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly url = 'http://localhost:8080/api/auth';
  private readonly tokenKey = 'saberflow.token';
  private readonly userIdKey = 'saberflow.userId';

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.url}/login`, request)
      .pipe(tap((response) => this.setToken(response.token)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userIdKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.userIdKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }

    return true;
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);

    const userId = this.extractUserIdFromToken(token);
    if (userId) {
      localStorage.setItem(this.userIdKey, userId);
    }
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) return null;

      const payloadBase64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadBase64)) as { sub?: string };
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        return true;
      }

      const payloadBase64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadBase64)) as { exp?: number };

      if (!payload.exp) {
        return true;
      }

      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
