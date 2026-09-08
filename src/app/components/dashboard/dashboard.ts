import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ActiveLanguageService } from '../../services/active-language.service';
import { AuthenticationService } from '../../services/authentication.service';
import { CardService } from '../../services/card.service';
import { CategoryService } from '../../services/category.service';
import { LanguageService } from '../../services/language.service';
import {
  CardResponse,
  CategoryResponse,
  getLanguageFlag,
  Language,
  LANGUAGE_LABELS,
  LanguageResponse,
  QuestionResponse,
  StudySessionResponse,
  UserAnswerResponse,
} from '../../services/models';
import { QuestionService } from '../../services/question.service';
import { StudySessionService } from '../../services/study-session.service';
import { UserAnswerService } from '../../services/user-answer.service';
import { UserStudyLanguageService } from '../../services/user-study-language.service';
import { UserService } from '../../services/user.service';
import { SidebarComponent } from '../sidebar/sidebar';

interface EnrolledLanguage {
  id: string;
  label: string;
  flag: string;
  topicCount: number;
}

interface RecentSession {
  id: string;
  startedAt: string;
  cardCount: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  standalone: true,
  imports: [MatIconModule, NgClass, SidebarComponent],
})
export class DashboardComponent {
  private authenticationService = inject(AuthenticationService);
  private userService = inject(UserService);
  private userStudyLanguageService = inject(UserStudyLanguageService);
  private languageService = inject(LanguageService);
  private categoryService = inject(CategoryService);
  private cardService = inject(CardService);
  private questionService = inject(QuestionService);
  private studySessionService = inject(StudySessionService);
  private userAnswerService = inject(UserAnswerService);
  private activeLanguageService = inject(ActiveLanguageService);
  private router = inject(Router);

  loading = signal(true);
  userName = signal<string | null>(null);

  activeLanguageId = signal<string | null>(null);
  activeLanguageLabel = signal<string | null>(null);
  activeLanguageFlag = signal('🌐');
  studiedCardsForActiveLanguage = signal(0);
  totalCardsForActiveLanguage = signal(0);
  activeLanguageProgressPercent = computed(() => {
    const total = this.totalCardsForActiveLanguage();
    if (total === 0) return 0;
    return Math.round((this.studiedCardsForActiveLanguage() / total) * 100);
  });

  enrolledLanguages = signal<EnrolledLanguage[]>([]);

  totalCardsStudied = signal(0);
  totalQuestionsAnswered = signal(0);
  accuracyPercent = signal<number | null>(null);
  studyStreakDays = signal(0);
  recentSessions = signal<RecentSession[]>([]);

  private languageResults: {
    language: LanguageResponse;
    topics: CategoryResponse[];
    cards: CardResponse[];
    questions: QuestionResponse[];
  }[] = [];
  private studiedCardIds = new Set<string>();
  private allSessions: StudySessionResponse[] = [];
  private allAnswers: UserAnswerResponse[] = [];

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
      user: this.userService.findById(userId),
      studyLanguages: this.userStudyLanguageService.findAll(userId),
      sessions: this.studySessionService.findAll(userId),
      answers: this.userAnswerService.findAll({ userId }),
    }).subscribe({
      next: ({ user, studyLanguages, sessions, answers }) => {
        this.userName.set(user.name);
        this.allSessions = sessions;
        this.allAnswers = answers;

        if (studyLanguages.length === 0) {
          this.processSessions(sessions);
          this.processAnswers(answers);
          this.loading.set(false);
          return;
        }

        const studiedCardIds = new Set(sessions.flatMap((s) => s.cardIds));
        this.studiedCardIds = studiedCardIds;

        forkJoin(
          studyLanguages.map((studyLanguage) =>
            forkJoin({
              language: this.languageService.findById(studyLanguage.languageId),
              topics: this.categoryService.findAll(studyLanguage.languageId),
              cards: this.cardService.findByFilter({
                languageId: studyLanguage.languageId,
                size: 20,
              }),
            }).pipe(
              switchMap(({ language, topics, cards }) =>
                topics.length === 0
                  ? of({
                      language,
                      topics,
                      cards,
                      questions: [] as QuestionResponse[],
                    })
                  : forkJoin(
                      topics.map((topic) =>
                        this.questionService.findAll(topic.id),
                      ),
                    ).pipe(
                      map((questionLists) => ({
                        language,
                        topics,
                        cards,
                        questions: questionLists.flat(),
                      })),
                    ),
              ),
            ),
          ),
        ).subscribe({
          next: (results) => {
            this.languageResults = results;
            this.enrolledLanguages.set(
              results.map(({ language, topics }) => ({
                id: language.id,
                label:
                  LANGUAGE_LABELS[language.language as Language] ??
                  language.language,
                flag: getLanguageFlag(language.language),
                topicCount: topics.length,
              })),
            );

            const activeLanguageId =
              this.activeLanguageService.activeLanguageId() ??
              studyLanguages[0].languageId;
            this.applyActiveLanguage(activeLanguageId);

            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  selectLanguage(languageId: string): void {
    this.activeLanguageService.setActiveLanguageId(languageId);
    this.applyActiveLanguage(languageId);
  }

  continueStudying(): void {
    this.router.navigate(['/cards']);
  }

  formatSessionDate(startedAt: string): string {
    const date = new Date(startedAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  private processSessions(
    sessions: StudySessionResponse[],
    cardIds?: Set<string>,
  ): void {
    const uniqueCardIds = new Set(
      sessions
        .flatMap((s) => s.cardIds)
        .filter((id) => !cardIds || cardIds.has(id)),
    );
    this.totalCardsStudied.set(uniqueCardIds.size);
    this.studyStreakDays.set(this.computeStreak(sessions));

    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
    this.recentSessions.set(
      sorted.slice(0, 5).map((session) => ({
        id: session.id,
        startedAt: session.startedAt,
        cardCount: cardIds
          ? session.cardIds.filter((id) => cardIds.has(id)).length
          : session.cardIds.length,
      })),
    );
  }

  private processAnswers(answers: { isCorrect: boolean }[]): void {
    this.totalQuestionsAnswered.set(answers.length);
    if (answers.length === 0) {
      this.accuracyPercent.set(null);
      return;
    }

    const correct = answers.filter((answer) => answer.isCorrect).length;
    this.accuracyPercent.set(Math.round((correct / answers.length) * 100));
  }

  private applyActiveLanguage(languageId: string): void {
    const active = this.languageResults.find(
      (result) => result.language.id === languageId,
    );
    if (!active) return;

    this.activeLanguageId.set(active.language.id);
    this.activeLanguageLabel.set(
      LANGUAGE_LABELS[active.language.language as Language] ??
        active.language.language,
    );
    this.activeLanguageFlag.set(getLanguageFlag(active.language.language));
    this.totalCardsForActiveLanguage.set(active.cards.length);
    this.studiedCardsForActiveLanguage.set(
      active.cards.filter((card) => this.studiedCardIds.has(card.id)).length,
    );

    const cardIds = new Set(active.cards.map((card) => card.id));
    const questionIds = new Set(
      active.questions.map((question) => question.id),
    );

    const languageSessions = this.allSessions.filter(
      (session) =>
        session.cardIds.some((id) => cardIds.has(id)) ||
        session.questionIds.some((id) => questionIds.has(id)),
    );
    const languageAnswers = this.allAnswers.filter((answer) =>
      questionIds.has(answer.questionId),
    );

    this.processSessions(languageSessions, cardIds);
    this.processAnswers(languageAnswers);
  }

  private computeStreak(sessions: StudySessionResponse[]): number {
    const days = new Set(
      sessions.map((session) => new Date(session.startedAt).toDateString()),
    );

    const cursor = new Date();
    if (!days.has(cursor.toDateString())) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (days.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }
}
