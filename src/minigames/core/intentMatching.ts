import { IntentMatchResult, IntentTarget, VocabItem } from './types';

const THAI_POLITE_PARTICLES = ['นะครับ', 'นะคะ', 'ครับ', 'ค่ะ', 'คะ', 'นะ'];
const ROMAN_POLITE_PARTICLES = ['na khrap', 'na kha', 'khrap', 'kha', 'na'];
const MATCH_CONFIDENCE_THRESHOLD = 0.65;
const MAX_EDIT_DISTANCE = 2;

const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ').trim();

const stripThaiPoliteParticles = (input: string) => {
  let next = normalizeSpaces(input);
  THAI_POLITE_PARTICLES.forEach((particle) => {
    const pattern = new RegExp(`${particle}$`);
    if (pattern.test(next)) {
      next = next.replace(pattern, '');
      next = normalizeSpaces(next);
    }
  });
  return next;
};

const stripRomanPoliteParticles = (input: string) => {
  let next = normalizeSpaces(input.toLowerCase());
  ROMAN_POLITE_PARTICLES.forEach((particle) => {
    const pattern = new RegExp(`${particle}$`);
    if (pattern.test(next)) {
      next = next.replace(pattern, '');
      next = normalizeSpaces(next);
    }
  });
  return next;
};

const normalizeThai = (input: string) => {
  const trimmed = normalizeSpaces(input);
  const withoutPolite = stripThaiPoliteParticles(trimmed);
  return withoutPolite.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
};

const normalizeRomanization = (input: string) => {
  const lowered = input.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const collapsed = normalizeSpaces(lowered);
  return stripRomanPoliteParticles(collapsed);
};

const levenshteinDistance = (left: string, right: string) => {
  if (!left) return right.length;
  if (!right) return left.length;

  const dp: number[][] = Array.from({ length: left.length + 1 }, (_, i) =>
    Array.from({ length: right.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[left.length][right.length];
};

const computeFuzzyConfidence = (distance: number, candidate: string) => {
  const len = Math.max(candidate.length, 1);
  const ratio = 1 - distance / len;
  return Math.max(0, Math.min(1, ratio));
};

export const buildIntentTargetsFromVocab = (vocab: VocabItem[]): IntentTarget[] =>
  vocab.map((item, index) => {
    const base = item.english_translation
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'intent';
    return {
      intent: `INTENT_${base.toUpperCase()}_${index + 1}`,
      thaiScript: item.thai_script,
      romanization: item.romanization,
      englishTranslation: item.english_translation,
      vocabularyId: item.id,
    };
  });

export const matchSpokenIntent = (
  transcript: string,
  targets: IntentTarget[]
): IntentMatchResult => {
  const normalizedThai = normalizeThai(transcript);
  const normalizedRoman = normalizeRomanization(transcript);

  if (!normalizedThai && !normalizedRoman) {
    return {
      matched: false,
      intent: null,
      vocabularyId: null,
      confidence: 0,
      matchedBy: 'none',
      normalizedTranscript: '',
    };
  }

  for (const target of targets) {
    if (normalizeThai(target.thaiScript) === normalizedThai) {
      return {
        matched: true,
        intent: target.intent,
        vocabularyId: target.vocabularyId,
        confidence: 1,
        matchedBy: 'exact_thai',
        normalizedTranscript: normalizedThai,
      };
    }
  }

  for (const target of targets) {
    if (normalizeRomanization(target.romanization) === normalizedRoman) {
      return {
        matched: true,
        intent: target.intent,
        vocabularyId: target.vocabularyId,
        confidence: 1,
        matchedBy: 'exact_romanization',
        normalizedTranscript: normalizedRoman,
      };
    }
  }

  let bestFuzzyThai: { target: IntentTarget; distance: number; confidence: number } | null = null;
  for (const target of targets) {
    const candidate = normalizeThai(target.thaiScript);
    if (!candidate || !normalizedThai) continue;
    const distance = levenshteinDistance(normalizedThai, candidate);
    if (distance > MAX_EDIT_DISTANCE) continue;
    const confidence = computeFuzzyConfidence(distance, candidate);
    if (!bestFuzzyThai || confidence > bestFuzzyThai.confidence) {
      bestFuzzyThai = { target, distance, confidence };
    }
  }

  if (bestFuzzyThai && bestFuzzyThai.confidence >= MATCH_CONFIDENCE_THRESHOLD) {
    return {
      matched: true,
      intent: bestFuzzyThai.target.intent,
      vocabularyId: bestFuzzyThai.target.vocabularyId,
      confidence: bestFuzzyThai.confidence,
      matchedBy: 'fuzzy_thai',
      normalizedTranscript: normalizedThai,
    };
  }

  let bestFuzzyRoman: { target: IntentTarget; distance: number; confidence: number } | null = null;
  for (const target of targets) {
    const candidate = normalizeRomanization(target.romanization);
    if (!candidate || !normalizedRoman) continue;
    const distance = levenshteinDistance(normalizedRoman, candidate);
    if (distance > MAX_EDIT_DISTANCE) continue;
    const confidence = computeFuzzyConfidence(distance, candidate);
    if (!bestFuzzyRoman || confidence > bestFuzzyRoman.confidence) {
      bestFuzzyRoman = { target, distance, confidence };
    }
  }

  if (bestFuzzyRoman && bestFuzzyRoman.confidence >= MATCH_CONFIDENCE_THRESHOLD) {
    return {
      matched: true,
      intent: bestFuzzyRoman.target.intent,
      vocabularyId: bestFuzzyRoman.target.vocabularyId,
      confidence: bestFuzzyRoman.confidence,
      matchedBy: 'fuzzy_romanization',
      normalizedTranscript: normalizedRoman,
    };
  }

  return {
    matched: false,
    intent: null,
    vocabularyId: null,
    confidence: 0,
    matchedBy: 'none',
    normalizedTranscript: normalizedThai || normalizedRoman,
  };
};

export const normalizeTranscriptForDebug = (input: string) => ({
  thai: normalizeThai(input),
  romanization: normalizeRomanization(input),
});
