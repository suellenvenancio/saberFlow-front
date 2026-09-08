import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'saberflow.theme';
  private readonly darkClass = 'theme-dark';

  theme = signal<ThemeMode>(this.readStoredTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    const next: ThemeMode = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
    localStorage.setItem(this.storageKey, next);
  }

  private applyTheme(theme: ThemeMode): void {
    document.body.classList.toggle(this.darkClass, theme === 'dark');
  }

  private readStoredTheme(): ThemeMode {
    const stored = localStorage.getItem(this.storageKey);
    return stored === 'light' ? 'light' : 'dark';
  }
}
