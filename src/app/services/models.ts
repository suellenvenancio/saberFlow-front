export type Level = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type StudySessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface LanguageResponse {
  id: string;
  language: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  language: LanguageResponse;
}

export interface CardResponse {
  id: string;
  question: string;
  answer: string;
  category: CategoryResponse;
  level: Level;
}

export interface OptionResponse {
  id: string;
  option: string;
  isCorrect: boolean;
  questionId: string;
}

export interface QuestionResponse {
  id: string;
  category: CategoryResponse;
  type: QuestionType;
  question: string;
  options: OptionResponse[];
}

export interface QuestionShortAnswerResponse {
  id: string;
  questionId: string;
  answerText: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
}

export interface UserAnswerResponse {
  id: string;
  userId: string;
  questionId: string;
  optionId: string | null;
  providedAnswer: string | null;
  isCorrect: boolean;
  answeredAt: string;
}

export interface StudySessionResponse {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  status: StudySessionStatus;
  cardIds: string[];
  questionIds: string[];
}

export interface LanguageRequest {
  id?: string;
  language: string;
}

export interface CategoryRequest {
  id?: string;
  name: string;
  languageId: string;
}

export interface CardRequest {
  id?: string;
  question: string;
  answer: string;
  categoryId: string;
  level: Level;
}

export interface OptionRequest {
  id?: string;
  option: string;
  isCorrect: boolean;
  questionId: string;
}

export interface QuestionRequest {
  id?: string;
  categoryId: string;
  type: QuestionType;
  question: string;
}

export interface UserRequest {
  name: string;
  email: string;
  password: string;
}

export interface UserAnswerRequest {
  id?: string;
  userId: string;
  questionId: string;
  optionId?: string;
  providedAnswer?: string;
  isCorrect: boolean;
}

export interface StudySessionRequest {
  id?: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  cardIds: string[];
  questionIds: string[];
  status: StudySessionStatus;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
}

export interface UserStudyLanguageResponse {
  id: string;
  userId: string;
  languageId: string;
}

export interface UserStudyLanguageRequest {
  id?: string;
  userId: string;
  languageId: string;
}

export enum Language {
  ENGLISH = 'english',
  ITALIAN = 'italian',
  SPANISH = 'spanish',
  FRENCH = 'french',
  GERMAN = 'german',
  PORTUGUESE = 'portuguese',
}

export const VOICE_NAMES: Record<Language, string> = {
  [Language.ENGLISH]: 'Reed',
  [Language.ITALIAN]: 'Diego',
  [Language.SPANISH]: 'Alvaro',
  [Language.FRENCH]: 'Denise',
  [Language.GERMAN]: 'Katja',
  [Language.PORTUGUESE]: 'Francisca',
};

export const LANGUAGE_CODES: Record<Language, string> = {
  [Language.ENGLISH]: 'en-GB',
  [Language.ITALIAN]: 'it-IT',
  [Language.SPANISH]: 'es-ES',
  [Language.FRENCH]: 'fr-FR',
  [Language.GERMAN]: 'de-DE',
  [Language.PORTUGUESE]: 'pt-BR',
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.ENGLISH]: 'Inglês',
  [Language.ITALIAN]: 'Italiano',
  [Language.SPANISH]: 'Espanhol',
  [Language.FRENCH]: 'Francês',
  [Language.GERMAN]: 'Alemão',
  [Language.PORTUGUESE]: 'Português',
};

export function getLanguageFlag(language: string): string {
  const code = LANGUAGE_CODES[language as Language];
  const country = code?.split('-')[1];
  if (!country) return '🌐';

  return [...country.toUpperCase()]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}
