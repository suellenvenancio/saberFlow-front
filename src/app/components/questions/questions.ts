import { Location, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ActiveLanguageService } from '../../services/active-language.service';
import { AuthenticationService } from '../../services/authentication.service';
import { CardService } from '../../services/card.service';
import { CategoryService } from '../../services/category.service';
import { LanguageService } from '../../services/language.service';
import {
  getLanguageFlag,
  Language,
  LANGUAGE_LABELS,
  QuestionResponse,
  StudySessionRequest,
} from '../../services/models';
import { QuestionShortAnswerService } from '../../services/question-short-answer.service';
import { QuestionService } from '../../services/question.service';
import { StudySessionService } from '../../services/study-session.service';
import { UserStudyLanguageService } from '../../services/user-study-language.service';
import { TextToSpeechService } from '../cards/textToSpech';
import { SidebarComponent } from '../sidebar/sidebar';

type Step = 'TOPIC' | 'INTENSITY' | 'SESSION';
type IntensityId = 'LIGHT' | 'STANDARD' | 'INTENSE';

interface TopicOption {
  id: string | null;
  name: string;
  questionCount: number;
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
    targetAmount: 10,
    recommended: false,
  },
  {
    id: 'STANDARD',
    label: 'Padrão',
    description: 'A sessão completa para manter o ritmo.',
    icon: 'menu_book',
    targetAmount: 25,
    recommended: true,
  },
  {
    id: 'INTENSE',
    label: 'Intensivo',
    description: 'Para quem quer se aprofundar.',
    icon: 'local_fire_department',
    targetAmount: 50,
    recommended: false,
  },
];

@Component({
  selector: 'app-questions',
  templateUrl: './questions.html',
  standalone: true,
  imports: [MatIconModule, NgClass, FormsModule, SidebarComponent],
})
export class QuestionsComponent {
  private location = inject(Location);
  private questionService = inject(QuestionService);
  private studySessionService = inject(StudySessionService);
  private questionShortAnswerService = inject(QuestionShortAnswerService);
  private cardService = inject(CardService);
  private categoryService = inject(CategoryService);
  private languageService = inject(LanguageService);
  private authenticationService = inject(AuthenticationService);
  private userStudyLanguageService = inject(UserStudyLanguageService);
  private textToSpeechService = inject(TextToSpeechService);
  private activeLanguageService = inject(ActiveLanguageService);
  private router = inject(Router);

  private languageId: string | null = null;
  private userId: string | null = null;

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
        estimatedMinutesLow: Math.round(amount * 0.5),
        estimatedMinutesHigh: Math.round(amount * 0.75),
      };
    }),
  );

  questions = signal<QuestionResponse[]>([]);
  currentIndex = signal(0);
  selectedOptionId = signal<string | null>(null);
  shortAnswerText = signal('');
  shortAnswerOptions = signal<string[]>([]);
  isAnswerChecked = signal(false);
  loading = signal(true);
  error = signal(false);
  studySessionId = signal<string | null>(null);
  sessionSyncStatus = signal<'idle' | 'syncing' | 'ok' | 'error'>('idle');

  private answeredQuestionIds: string[] = [];
  private pendingSessionStatus: StudySessionRequest['status'] = 'ACTIVE';
  private sessionStartedAt: string | null = null;
  private sessionEndedAt: string | null = null;

  currentQuestion = computed(
    () => this.questions()[this.currentIndex()] ?? null,
  );
  totalQuestions = computed(() => this.questions().length);
  currentPosition = computed(() => {
    const total = this.totalQuestions();
    return total === 0 ? 0 : this.currentIndex() + 1;
  });
  progressPercent = computed(() => {
    const total = this.totalQuestions();
    return total === 0 ? 0 : Math.round((this.currentPosition() / total) * 100);
  });
  selectedOption = computed(
    () =>
      this.currentQuestion()?.options.find(
        (option) => option.id === this.selectedOptionId(),
      ) ?? null,
  );
  correctOption = computed(
    () =>
      this.currentQuestion()?.options.find((option) => option.isCorrect) ??
      null,
  );
  isLastQuestion = computed(
    () => this.currentPosition() === this.totalQuestions(),
  );
  isShortAnswerCorrect = computed(() => {
    const provided = this.shortAnswerText().trim().toLowerCase();
    if (!provided) return false;
    return this.shortAnswerOptions().some(
      (answer) => answer.trim().toLowerCase() === provided,
    );
  });
  canCheckAnswer = computed(() => {
    const question = this.currentQuestion();
    if (!question) return false;
    return question.type === 'SHORT_ANSWER'
      ? this.shortAnswerText().trim().length > 0
      : !!this.selectedOptionId();
  });

  ngOnInit(): void {
    if (!this.authenticationService.isAuthenticated()) {
      this.setupLoading.set(false);
      this.router.navigate(['/login']);
      return;
    }

    const userId = this.authenticationService.getUserId();
    if (!userId) {
      this.setupLoading.set(false);
      return;
    }
    this.userId = userId;

    this.userStudyLanguageService
      .findAll(userId)
      .pipe(
        switchMap((studyLanguages) => {
          const activeLanguageId =
            this.activeLanguageService.activeLanguageId();
          const languageId =
            activeLanguageId ?? studyLanguages[0]?.languageId ?? null;

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
    this.startSession(option?.amount ?? null);
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
              forkJoin([this.questionService.findAll(category.id)]).pipe(
                map(([questions]) => ({
                  id: category.id,
                  name: category.name,
                  questionCount: questions.length,
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

          const totalQuestions = topics.reduce(
            (sum, topic) => sum + topic.questionCount,
            0,
          );

          this.topics.set([
            {
              id: null,
              name: 'Todos os temas',
              questionCount: totalQuestions,
            },
            ...topics.filter((topic) => topic.questionCount > 0),
          ]);
          this.setupLoading.set(false);
        },
        error: () => {
          this.setupError.set(true);
          this.setupLoading.set(false);
        },
      });
  }

  private startSession(amount: number | null): void {
    const languageId = this.languageId;
    if (!languageId) return;

    this.loading.set(true);
    const categoryId = this.selectedCategoryId();

    (categoryId
      ? this.questionService.findAll(categoryId)
      : this.questionService
          .findAll()
          .pipe(
            map((questions) =>
              questions.filter(
                (question) => question.category.language.id === languageId,
              ),
            ),
          )
    ).subscribe({
      next: (questions) => {
        this.questions.set(amount ? questions.slice(0, amount) : questions);
        this.currentIndex.set(0);
        this.resetAnswer();
        this.sessionStartedAt = new Date().toISOString();
        this.loading.set(false);
        this.step.set('SESSION');
        this.createStudySession();
      },
      error: () => {
        this.questions.set([]);
        this.error.set(true);
        this.loading.set(false);
        this.step.set('SESSION');
      },
    });
  }

  selectOption(optionId: string): void {
    if (this.isAnswerChecked()) return;
    this.selectedOptionId.set(optionId);
  }

  checkAnswer(): void {
    if (!this.canCheckAnswer() || this.isAnswerChecked()) return;
    this.isAnswerChecked.set(true);
    this.registerAnsweredQuestion(
      this.isLastQuestion() ? 'COMPLETED' : 'ACTIVE',
    );
  }

  nextQuestion(): void {
    if (!this.isAnswerChecked() || this.isLastQuestion()) return;
    this.currentIndex.update((index) => index + 1);
    this.resetAnswer();
  }

  previousQuestion(): void {
    if (this.currentIndex() === 0) return;
    this.currentIndex.update((index) => index - 1);
    this.resetAnswer();
  }

  goBack(): void {
    this.location.back();
  }

  playQuestionAudio(): void {
    const question = this.currentQuestion();
    if (!question) return;

    this.textToSpeechService.speak(
      question.question,
      question.category.language.language,
    );
  }

  optionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  optionClasses(
    option: QuestionResponse['options'][number],
  ): Record<string, boolean> {
    const isSelected = this.selectedOptionId() === option.id;
    const isChecked = this.isAnswerChecked();

    return {
      'border-[var(--tf-border)]': !isChecked && !isSelected,
      'border-[var(--tf-primary)] bg-[var(--tf-primary-light)]':
        !isChecked && isSelected,
      'border-[var(--tf-success)] bg-emerald-500/10':
        isChecked && option.isCorrect,
      'border-[var(--tf-error)] bg-red-500/10':
        isChecked && isSelected && !option.isCorrect,
    };
  }

  private resetAnswer(): void {
    this.selectedOptionId.set(null);
    this.shortAnswerText.set('');
    this.isAnswerChecked.set(false);
    this.loadShortAnswersForCurrentQuestion();
  }

  private createStudySession(): void {
    const userId = this.userId;
    if (!userId) return;

    this.answeredQuestionIds = [];
    this.pendingSessionStatus = 'ACTIVE';
    this.sessionEndedAt = null;
    const startedAt = this.sessionStartedAt;
    if (!startedAt) return;
    this.studySessionId.set(null);
    this.sessionSyncStatus.set('syncing');
    this.studySessionService
      .save({
        userId,
        startedAt,
        endedAt: null,
        cardIds: [],
        questionIds: [],
        status: 'ACTIVE',
      })
      .subscribe({
        next: (session) => {
          this.studySessionId.set(session.id);
          this.sessionSyncStatus.set('ok');
          if (this.answeredQuestionIds.length > 0) {
            this.syncStudySession(
              this.pendingSessionStatus,
              this.sessionEndedAt,
            );
          }
        },
        error: () => this.sessionSyncStatus.set('error'),
      });
  }

  private registerAnsweredQuestion(
    status: StudySessionRequest['status'],
  ): void {
    const question = this.currentQuestion();
    if (!question) return;

    this.answeredQuestionIds.push(question.id);
    this.pendingSessionStatus = status;
    this.sessionEndedAt = status === 'ACTIVE' ? null : new Date().toISOString();
    this.syncStudySession(status, this.sessionEndedAt);
  }

  private syncStudySession(
    status: StudySessionRequest['status'] = 'ACTIVE',
    endedAt: string | null = null,
  ): void {
    const userId = this.userId;
    const sessionId = this.studySessionId();
    const startedAt = this.sessionStartedAt;
    if (!userId || !sessionId || !startedAt) return;

    const payload: StudySessionRequest = {
      id: sessionId,
      userId,
      startedAt,
      endedAt,
      cardIds: [],
      questionIds: [...this.answeredQuestionIds],
      status,
    };

    this.sessionSyncStatus.set('syncing');
    this.studySessionService.save(payload).subscribe({
      next: () => this.sessionSyncStatus.set('ok'),
      error: () => this.sessionSyncStatus.set('error'),
    });
  }

  private loadShortAnswersForCurrentQuestion(): void {
    const question = this.currentQuestion();
    this.shortAnswerOptions.set([]);
    if (!question || question.type !== 'SHORT_ANSWER') return;

    this.questionShortAnswerService.findByQuestionId(question.id).subscribe({
      next: (answers) =>
        this.shortAnswerOptions.set(answers.map((answer) => answer.answerText)),
      error: () => this.shortAnswerOptions.set([]),
    });
  }
}
