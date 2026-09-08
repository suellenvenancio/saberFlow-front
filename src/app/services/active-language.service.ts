import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActiveLanguageService {
  private readonly storageKey = 'saberflow.activeLanguageId';

  activeLanguageId = signal<string | null>(
    localStorage.getItem(this.storageKey),
  );

  setActiveLanguageId(languageId: string): void {
    this.activeLanguageId.set(languageId);
    localStorage.setItem(this.storageKey, languageId);
  }
}
