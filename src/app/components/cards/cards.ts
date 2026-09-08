import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ActiveLanguageService } from '../../services/active-language.service';
import { AuthenticationService } from '../../services/authentication.service';
import { CardService } from '../../services/card.service';
import { CategoryService } from '../../services/category.service';
import { LanguageService } from '../../services/language.service';
import {
  CardResponse,
  getLanguageFlag,
  Language,
  LANGUAGE_LABELS,
  StudySessionRequest,
} from '../../services/models';
import { StudySessionService } from '../../services/study-session.service';
import { UserStudyLanguageService } from '../../services/user-study-language.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { TextToSpeechService } from './textToSpech';

type CardAction = 'KNOWN' | 'UNKNOWN' | 'SKIPPED';
type Step = 'TOPIC' | 'INTENSITY' | 'SESSION';
type IntensityId = 'LIGHT' | 'STANDARD' | 'INTENSE';

interface TopicOption {
  id: string | null;
  name: string;
  cardCount: number;
}

interface IntensityDefinition {
  id: IntensityId;
  label: string;
  description: string;
  icon: string;
  targetAmount: number;
  recommended: boolean;
}

interface IntensityOption extends IntensityDefinition {
  amount: number;
  estimatedMinutesLow: number;
  estimatedMinutesHigh: number;
}

const INTENSITY_DEFINITIONS: IntensityDefinition[] = [
  {
    id: 'LIGHT',
    label: 'Leve',
    description: 'Ideal para dias corridos.',
    icon: 'eco',
    targetAmount: 20,
    recommended: false,
  },
  {
    id: 'STANDARD',
    label: 'Padrão',
    description: 'A sessão completa para manter o ritmo.',
    icon: 'menu_book',
    targetAmount: 60,
    recommended: true,
  },
  {
    id: 'INTENSE',
    label: 'Intensivo',
    description: 'Para quem quer se aprofundar.',
    icon: 'local_fire_department',
    targetAmount: 100,
    recommended: false,
  },
];

@Component({
  selector: 'app-cards',
  templateUrl: './cards.html',
  standalone: true,
  imports: [MatIconModule, NgClass, SidebarComponent],
})
export class CardsComponent {
  private cardService = inject(CardService);
  private categoryService = inject(CategoryService);
  private languageService = inject(LanguageService);
  private authenticationService = inject(AuthenticationService);
  private userStudyLanguageService = inject(UserStudyLanguageService);
  private studySessionService = inject(StudySessionService);
  private textToSpeechService = inject(TextToSpeechService);
  private activeLanguageService = inject(ActiveLanguageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private userId: string | null = null;
  private languageId: string | null = null;

  step = signal<Step>('TOPIC');
  setupLoading = signal(true);
  setupError = signal(false);

  languageLabel = signal<string | null>(null);
  languageFlag = signal('🌐');
  topics = signal<TopicOption[]>([]);

  selectedCategoryId = signal<string | null>(null);
  selectedCategoryName = signal<string | null>(null);
  categoryLabel = computed(
    () => this.selectedCategoryName() ?? 'Todos os temas',
  );
  availableCount = signal(0);
  selectedIntensityId = signal<IntensityId>('STANDARD');
  intensityOptions = computed<IntensityOption[]>(() =>
    INTENSITY_DEFINITIONS.map((definition) => {
      const amount = Math.min(definition.targetAmount, this.availableCount());
      return {
        ...definition,
        amount,
        estimatedMinutesLow: Math.round(amount * 0.25),
        estimatedMinutesHigh: Math.round(amount * 0.4),
      };
    }),
  );

  cards = signal<CardResponse[]>([]);
  currentIndex = signal(0);
  isFlipped = signal(false);
  hasFlippedOnce = signal(false);
  loading = signal(true);
  knownCount = signal(0);
  unknownCount = signal(0);
  skippedCount = signal(0);
  currentStreak = signal(0);
  bestStreak = signal(0);
  sessionSyncStatus = signal<'idle' | 'syncing' | 'ok' | 'error' | 'disabled'>(
    'idle',
  );

  private answeredCardIds: string[] = [];
  private sessionStartedAt: string | null = null;

  currentCard = computed(() => this.cards()[this.currentIndex()] ?? null);
  totalCards = computed(() => this.cards().length);
  answeredCount = computed(
    () => this.knownCount() + this.unknownCount() + this.skippedCount(),
  );
  currentPosition = computed(() => {
    if (this.totalCards() === 0) return 0;
    return Math.min(this.currentIndex() + 1, this.totalCards());
  });
  isFinished = computed(
    () => this.totalCards() > 0 && this.currentIndex() >= this.totalCards(),
  );
  progressPercent = computed(() => {
    const total = this.totalCards();
    if (total === 0) return 0;
    const answered = Math.min(this.currentIndex(), total);
    return Math.round((answered / total) * 100);
  });

  ngOnInit() {
    if (!this.authenticationService.isAuthenticated()) {
      this.setupLoading.set(false);
      this.sessionSyncStatus.set('disabled');
      this.router.navigate(['/login']);
      return;
    }

    const userId = this.authenticationService.getUserId();
    if (!userId) {
      this.setupLoading.set(false);
      this.sessionSyncStatus.set('disabled');
      return;
    }
    this.userId = userId;

    const queryParams = this.route.snapshot.queryParamMap;
    const queryCategoryIds = queryParams.get('categoryIds');
    const queryLanguageId = queryParams.get('languageId');
    const queryAmount = queryParams.get('amount');

    this.userStudyLanguageService
      .findAll(userId)
      .pipe(
        switchMap((studyLanguages) => {
          const activeLanguageId =
            this.activeLanguageService.activeLanguageId();
          const languageId =
            queryLanguageId ??
            activeLanguageId ??
            studyLanguages[0]?.languageId ??
            null;

          if (!languageId) {
            return of(null);
          }

          this.languageId = languageId;
          return this.languageService.findById(languageId);
        }),
      )
      .subscribe({
        next: (language) => {
          if (!language) {
            this.setupError.set(true);
            this.setupLoading.set(false);
            return;
          }

          this.languageLabel.set(
            LANGUAGE_LABELS[language.language as Language] ?? language.language,
          );
          this.languageFlag.set(getLanguageFlag(language.language));

          if (queryCategoryIds !== null || queryAmount !== null) {
            const categoryIds = queryCategoryIds
              ? queryCategoryIds.split(',').filter(Boolean)
              : [];
            this.selectedCategoryId.set(categoryIds[0] ?? null);
            const amount = queryAmount ? Number(queryAmount) || null : null;
            this.startSession(amount, categoryIds);
            return;
          }

          this.loadTopics();
        },
        error: () => {
          this.setupError.set(true);
          this.setupLoading.set(false);
        },
      });
  }

  selectTopic(topic: TopicOption): void {
    this.selectedCategoryId.set(topic.id);
    this.selectedCategoryName.set(topic.id ? topic.name : null);
    this.step.set('INTENSITY');
    this.loadAvailableCount();
  }

  selectIntensity(optionId: IntensityId): void {
    this.selectedIntensityId.set(optionId);
  }

  backToTopics(): void {
    this.step.set('TOPIC');
  }

  confirmIntensity(): void {
    const option = this.intensityOptions().find(
      (intensity) => intensity.id === this.selectedIntensityId(),
    );
    const amount = option?.amount ?? null;
    const categoryId = this.selectedCategoryId();
    this.updateSessionUrl(categoryId ? [categoryId] : [], amount);
    this.startSession(amount, categoryId ? [categoryId] : []);
  }

  private loadTopics(): void {
    const languageId = this.languageId;
    if (!languageId) return;

    this.setupLoading.set(true);
    this.categoryService
      .findAll(languageId)
      .pipe(
        switchMap((categories) => {
          if (categories.length === 0) return of([] as TopicOption[]);

          return forkJoin(
            categories.map((category) =>
              forkJoin([
                this.cardService.findByFilter({
                  categoryIds: [category.id],
                  languageId: this.languageId!,
                  size:
                    INTENSITY_DEFINITIONS.find(
                      (i) => i.id === this.selectedIntensityId(),
                    )?.targetAmount ?? 20,
                }),
              ]).pipe(
                map(([cards]) => ({
                  id: category.id,
                  name: category.name,
                  cardCount: cards.length,
                })),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: (topics) => {
          if (topics.length === 0) {
            this.topics.set([]);
            this.setupLoading.set(false);
            return;
          }

          const totalCards = topics.reduce((sum, t) => sum + t.cardCount, 0);

          this.topics.set([
            {
              id: null,
              name: 'Todos os temas',
              cardCount: totalCards,
            },
            ...topics,
          ]);
          this.setupLoading.set(false);
        },
        error: () => {
          this.setupError.set(true);
          this.setupLoading.set(false);
        },
      });
  }

  private loadAvailableCount(): void {
    const languageId = this.languageId;
    if (!languageId) return;

    this.setupLoading.set(true);
    const categoryId = this.selectedCategoryId() ?? undefined;
    this.cardService
      .findByFilter({
        languageId,
        categoryIds: categoryId ? [categoryId] : undefined,
        size:
          INTENSITY_DEFINITIONS.find((i) => i.id === this.selectedIntensityId())
            ?.targetAmount ?? 20,
      })
      .subscribe({
        next: (cards) => {
          this.availableCount.set(cards.length);
          this.setupLoading.set(false);
        },
        error: () => {
          this.setupError.set(true);
          this.setupLoading.set(false);
        },
      });
  }

  private startSession(amount: number | null, categoryIds: string[]): void {
    const languageId = this.languageId;
    const userId = this.userId;
    if (!languageId || !userId) return;

    this.loading.set(true);

    const cards$ =
      categoryIds.length > 0
        ? forkJoin(
            categoryIds.map((categoryId) =>
              this.cardService.findByFilter({
                languageId,
                categoryIds: [categoryId],
                size: 10,
              }),
            ),
          ).pipe(
            map((cardLists) => {
              const seenIds = new Set<string>();
              return cardLists.flat().filter((card) => {
                if (seenIds.has(card.id)) return false;
                seenIds.add(card.id);
                return true;
              });
            }),
          )
        : this.cardService.findByFilter({ languageId, size: 10 });

    cards$.subscribe({
      next: (cards) => {
        this.cards.set(amount ? cards.slice(0, amount) : cards);
        this.currentIndex.set(0);
        this.isFlipped.set(false);
        this.hasFlippedOnce.set(false);
        this.answeredCardIds = [];
        this.sessionStartedAt = new Date().toISOString();
        this.loading.set(false);
        this.step.set('SESSION');
      },
      error: () => {
        this.cards.set([]);
        this.loading.set(false);
        this.step.set('SESSION');
      },
    });
  }

  private updateSessionUrl(categoryIds: string[], amount: number | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoryIds: categoryIds.length > 0 ? categoryIds.join(',') : null,
        languageId: this.languageId,
        amount: amount ?? null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  flipCard() {
    if (!this.currentCard()) return;
    const nextFlipped = !this.isFlipped();
    this.isFlipped.set(nextFlipped);
    if (nextFlipped) {
      this.hasFlippedOnce.set(true);
    }
  }

  markAsKnown() {
    if (!this.hasFlippedOnce()) return;
    this.registerActionAndAdvance('KNOWN');
  }

  markAsUnknown() {
    if (!this.hasFlippedOnce()) return;
    this.registerActionAndAdvance('UNKNOWN');
  }

  skipCard() {
    this.registerActionAndAdvance('SKIPPED');
  }

  private registerActionAndAdvance(action: CardAction) {
    const card = this.currentCard();
    if (!card) return;

    this.updateLocalMetrics(action);
    this.answeredCardIds.push(card.id);
    const isLastCard = this.currentIndex() + 1 >= this.totalCards();
    if (isLastCard) this.saveCompletedStudySession();
    this.goToNextCard();
  }

  private updateLocalMetrics(action: CardAction) {
    if (action === 'KNOWN') {
      this.knownCount.update((value) => value + 1);
      this.currentStreak.update((value) => value + 1);
      this.bestStreak.update((value) => Math.max(value, this.currentStreak()));
      return;
    }

    if (action === 'UNKNOWN') {
      this.unknownCount.update((value) => value + 1);
      this.currentStreak.set(0);
      return;
    }

    this.skippedCount.update((value) => value + 1);
    this.currentStreak.set(0);
  }

  private saveCompletedStudySession(): void {
    const userId = this.userId;
    if (!userId || !this.sessionStartedAt) return;

    const payload: StudySessionRequest = {
      userId,
      startedAt: this.sessionStartedAt,
      endedAt: new Date().toISOString(),
      cardIds: [...this.answeredCardIds],
      questionIds: [],
      status: 'COMPLETED',
    };

    this.sessionSyncStatus.set('syncing');
    this.studySessionService.save(payload).subscribe({
      next: () => this.sessionSyncStatus.set('ok'),
      error: () => this.sessionSyncStatus.set('error'),
    });
  }

  private goToNextCard() {
    if (!this.currentCard()) return;
    this.currentIndex.update((value) => value + 1);
    this.isFlipped.set(false);
    this.hasFlippedOnce.set(false);
  }

  playAudio(word: string, language: string) {
    this.textToSpeechService.speak(word, language);
  }
}
