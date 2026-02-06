import { IntentMatchResult, IntentTarget } from '../core/types';
import { matchSpokenIntent } from '../core/intentMatching';

export type VoiceIntentHandler = (match: IntentMatchResult) => void;

const getSpeechRecognitionCtor = () => {
  const runtime = globalThis as any;
  return (
    runtime?.SpeechRecognition ??
    runtime?.webkitSpeechRecognition ??
    runtime?.window?.SpeechRecognition ??
    runtime?.window?.webkitSpeechRecognition ??
    null
  );
};

export class VoiceInputAdapter {
  private targets: IntentTarget[];

  private onMatch: VoiceIntentHandler;

  private recognition: any;

  constructor(targets: IntentTarget[], onMatch: VoiceIntentHandler) {
    this.targets = targets;
    this.onMatch = onMatch;
    this.recognition = null;
  }

  isSupported() {
    return Boolean(getSpeechRecognitionCtor());
  }

  start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.onMatch({
        matched: false,
        intent: null,
        vocabularyId: null,
        confidence: 0,
        matchedBy: 'none',
        normalizedTranscript: '',
      });
      return;
    }

    this.stop();

    this.recognition = new Ctor();
    this.recognition.lang = 'th-TH';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript ?? '').trim();
      const result = matchSpokenIntent(transcript, this.targets);
      this.onMatch(result);
    };

    this.recognition.onerror = () => {
      this.onMatch({
        matched: false,
        intent: null,
        vocabularyId: null,
        confidence: 0,
        matchedBy: 'none',
        normalizedTranscript: '',
      });
    };

    this.recognition.start();
  }

  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {
      // ignored
    }
    this.recognition = null;
  }
}
