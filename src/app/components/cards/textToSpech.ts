import { Injectable } from '@angular/core';
import { Language } from '../../services/models';

@Injectable({
  providedIn: 'root',
})
export class TextToSpeechService {
  private synth = window.speechSynthesis;

  speak(text: string, language: string) {
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const reedVoice = this.getVoice(language);

    if (reedVoice) {
      utterance.voice = reedVoice;
    }

    utterance.lang = reedVoice ? reedVoice.lang : 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    this.synth.speak(utterance);
  }

  private getVoice(language: string): SpeechSynthesisVoice | undefined {
    const voices = this.synth.getVoices();

    switch (language.toLowerCase()) {
      case Language.ENGLISH:
        return voices.find(
          (v) => v.name.includes('Reed') && v.lang === 'en-US',
        );

      case Language.ITALIAN:
        return voices.find(
          (v) => v.name.includes('Google') && v.lang.startsWith('it'),
        );

      case Language.SPANISH:
        return voices.find((v) => v.lang.startsWith('es'));

      case Language.FRENCH:
        return voices.find((v) => v.lang.startsWith('fr'));

      case Language.GERMAN:
        return voices.find((v) => v.lang.startsWith('de'));

      case Language.PORTUGUESE:
        return voices.find((v) => v.lang === 'pt-BR');

      default:
        return undefined;
    }
  }
}
