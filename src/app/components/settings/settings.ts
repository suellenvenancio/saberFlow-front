import { NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ActiveLanguageService } from '../../services/active-language.service';
import { AuthenticationService } from '../../services/authentication.service';
import { LanguageService } from '../../services/language.service';
import {
  getLanguageFlag,
  Language,
  LANGUAGE_LABELS,
  LanguageResponse,
} from '../../services/models';
import { UserStudyLanguageService } from '../../services/user-study-language.service';
import { SidebarComponent } from '../sidebar/sidebar';

interface LanguageOption {
  id: string;
  label: string;
  flag: string;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  standalone: true,
  imports: [MatIconModule, NgClass, SidebarComponent],
})
export class SettingsComponent {
  private authenticationService = inject(AuthenticationService);
  private userStudyLanguageService = inject(UserStudyLanguageService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  activeLanguageService = inject(ActiveLanguageService);

  languages = signal<LanguageOption[]>([]);
  linkedLanguageIds = signal<string[]>([]);
  selectedLanguageId = signal<string | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    if (!this.authenticationService.isAuthenticated()) {
      this.loading.set(false);
      this.router.navigate(['/login']);
      return;
    }

    const userId = this.authenticationService.getUserId();
    if (!userId) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      studyLanguages: this.userStudyLanguageService.findAll(userId),
      allLanguages: this.languageService.findAll(),
    }).subscribe({
      next: ({ studyLanguages, allLanguages }) => {
        const linkedIds = studyLanguages.map(
          (studyLanguage) => studyLanguage.languageId,
        );
        this.linkedLanguageIds.set(linkedIds);
        this.languages.set(
          allLanguages.map((language) => this.toOption(language)),
        );

        const preferredLanguageId =
          this.activeLanguageService.activeLanguageId() ??
          linkedIds[0] ??
          allLanguages[0]?.id ??
          null;

        this.selectedLanguageId.set(preferredLanguageId);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isLinked(languageId: string): boolean {
    return this.linkedLanguageIds().includes(languageId);
  }

  selectLanguage(languageId: string): void {
    this.selectedLanguageId.set(languageId);
  }

  confirmSelection(): void {
    const languageId = this.selectedLanguageId();
    if (!languageId) return;

    const userId = this.authenticationService.getUserId();
    if (!userId) {
      this.router.navigate(['/login']);
      return;
    }

    const isLinked = this.isLinked(languageId);

    if (isLinked) {
      this.activeLanguageService.setActiveLanguageId(languageId);
      this.router.navigate(['/cards'], {
        queryParams: { languageId },
      });
      return;
    }

    this.userStudyLanguageService.save({ userId, languageId }).subscribe({
      next: () => {
        this.linkedLanguageIds.update((ids) => [...ids, languageId]);
        this.activeLanguageService.setActiveLanguageId(languageId);
        this.router.navigate(['/cards'], {
          queryParams: { languageId },
        });
      },
      error: () => {
        this.activeLanguageService.setActiveLanguageId(languageId);
        this.router.navigate(['/cards'], {
          queryParams: { languageId },
        });
      },
    });
  }

  private toOption(language: LanguageResponse): LanguageOption {
    return {
      id: language.id,
      label:
        LANGUAGE_LABELS[language.language as Language] ?? language.language,
      flag: getLanguageFlag(language.language),
    };
  }
}
