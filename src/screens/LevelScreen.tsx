import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../lib/supabase';
import { playAudioFromUri, playThaiAudio } from '../lib/audio';
import { getTheme, fonts, spacing, radii } from '../lib/themes';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { useSessionStats } from '../context/SessionStatsContext';
import { useAuth } from '../hooks/useAuth';
import { type Dialogue, type DialogueOption } from '../lib/dialogues';
import { useTheme } from '../context/ThemeContext';
import { isThaiText, transliterateThaiRtgs } from '../lib/transliteration';
import {
  getUserPronunciationByVocabulary,
  getUserPronunciationSignedUrl,
  uploadUserPronunciation,
} from '../lib/pronunciation';

interface Vocabulary {
  id: string;
  thai_script: string;
  romanization: string;
  english_translation: string;
}

interface LevelScreenProps {
  levelId: number;
  onBack: () => void;
  startPhase?: Phase;
}

type Phase = 'intro' | 'video' | 'listen' | 'quiz' | 'match' | 'dialogue' | 'complete';
type SrsRating = 'again' | 'hard' | 'good' | 'easy';

const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
};

const createRng = (seed: number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const stableShuffle = <T,>(items: T[], key: string) => {
  const arr = [...items];
  const rand = createRng(hashSeed(key));
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const placeCorrectOption = <T,>(correct: T, wrong: T[], key: string, maxCount: number) => {
  const total = Math.max(1, Math.min(maxCount, wrong.length + 1));
  if (total === 1) return [correct];
  const base = wrong.slice(0, Math.max(0, total - 1));
  const rand = createRng(hashSeed(`${key}-slot`));
  const slot = Math.max(1, Math.min(total - 1, Math.floor(rand() * total)));
  const arranged = [...base];
  arranged.splice(slot, 0, correct);
  return arranged;
};

const properNouns = [
  'Thai',
  'Bangkok',
  'Chiang Mai',
  'Pad Thai',
  'Tom Yum',
  'Songkran',
  'Loy Krathong',
  'LINE',
  'WiFi',
  'SIM',
  'ATM',
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyProperNouns = (value: string) =>
  properNouns.reduce((result, term) => {
    const pattern = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'gi');
    return result.replace(pattern, term);
  }, value);

const formatEnglishDisplay = (value: string | undefined | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const sentenceLike =
    /[.!?]$/.test(trimmed) ||
    /^(what|where|when|why|how|can|could|would|do|does|did|is|are|was|were)\b/i.test(trimmed);

  let normalized = trimmed.toLowerCase().replace(/\bi\b/g, 'I');
  normalized = applyProperNouns(normalized);
  if (sentenceLike) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return normalized;
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
  const runtime = globalThis as any;
  const ctor =
    runtime?.SpeechRecognition ??
    runtime?.webkitSpeechRecognition ??
    runtime?.window?.SpeechRecognition ??
    runtime?.window?.webkitSpeechRecognition;
  return (ctor ?? null) as SpeechRecognitionCtor | null;
};

const normalizeSpeech = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, ' ')
    .trim();

const levenshteinDistance = (left: string, right: string) => {
  const leftLen = left.length;
  const rightLen = right.length;
  if (leftLen === 0) return rightLen;
  if (rightLen === 0) return leftLen;

  const matrix: number[][] = Array.from({ length: leftLen + 1 }, (_, i) =>
    Array.from({ length: rightLen + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= leftLen; i += 1) {
    for (let j = 1; j <= rightLen; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[leftLen][rightLen];
};

const tokenSet = (value: string) =>
  new Set(
    value
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
  );

const scoreTranscriptAgainstTarget = (transcript: string, target: string) => {
  const normalizedTranscript = normalizeSpeech(transcript);
  const normalizedTarget = normalizeSpeech(target);
  if (!normalizedTranscript || !normalizedTarget) return 0;
  if (normalizedTranscript === normalizedTarget) return 100;

  const distance = levenshteinDistance(normalizedTranscript, normalizedTarget);
  const charScore = 1 - distance / Math.max(normalizedTranscript.length, normalizedTarget.length, 1);

  const spokenTokens = tokenSet(normalizedTranscript);
  const targetTokens = tokenSet(normalizedTarget);
  const overlap = [...spokenTokens].filter((token) => targetTokens.has(token)).length;
  const tokenScore = overlap / Math.max(1, targetTokens.size);

  return Math.round(Math.max(0, Math.min(1, charScore * 0.7 + tokenScore * 0.3)) * 100);
};

const inferIntent = (option: DialogueOption) => {
  const text = `${option.english} ${option.roman}`.toLowerCase().trim();
  if (/\?/.test(option.english) || /\b(what|where|when|why|how|can|could|would|do|does|did|is|are)\b/.test(text)) {
    return 'question';
  }
  if (/\b(thank|thanks|welcome|sorry)\b/.test(text)) return 'courtesy';
  if (/\b(no|not|cannot|can\'t|don\'t)\b/.test(text)) return 'negative';
  if (/\b(yes|ok|okay|sure|understood|right)\b/.test(text)) return 'affirm';
  return 'statement';
};

export function LevelScreen({ levelId, onBack, startPhase }: LevelScreenProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelMeta, setLevelMeta] = useState<{
    video_intro_url?: string | null;
    cultural_media_url?: string | null;
    environment_name?: string | null;
  } | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [matchPairs, setMatchPairs] = useState<{left: any[], right: any[], matched: string[]}>({left: [], right: [], matched: []});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const optionAnimsRef = useRef<Animated.Value[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [pronunciationSupported, setPronunciationSupported] = useState(false);
  const [pronunciationListening, setPronunciationListening] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [pronunciationTranscript, setPronunciationTranscript] = useState('');
  const [pronunciationMatchedWord, setPronunciationMatchedWord] = useState<Vocabulary | null>(null);
  const [pronunciationRomanization, setPronunciationRomanization] = useState('');
  const [pronunciationMeaning, setPronunciationMeaning] = useState('');
  const [pronunciationHint, setPronunciationHint] = useState('Practice pronunciation and get instant feedback.');
  const [savedPronunciationUrl, setSavedPronunciationUrl] = useState<string | null>(null);
  const [savingPronunciation, setSavingPronunciation] = useState(false);
  const [loadingSavedPronunciation, setLoadingSavedPronunciation] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const latestPronunciationResultRef = useRef<{
    score: number;
    transcript: string;
    recognizedRomanization: string;
    vocabularyId: string;
  } | null>(null);
  const sessionStart = useRef<number>(Date.now());
  const sessionReported = useRef(false);
  const { setLastSession } = useSessionStats();
  const { user } = useAuth();
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const listenRingAnim = useRef(new Animated.Value(0)).current;
  const listenWaveAnim = useRef(new Animated.Value(0)).current;
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const theme = getTheme(levelId);
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && viewportWidth >= 1180;
  const isCompactHeight = isWeb && viewportHeight <= 860;

  const stopRecorderStreamTracks = () => {
    const stream = mediaStreamRef.current;
    if (stream?.getTracks) {
      stream.getTracks().forEach((track: any) => track.stop());
    }
    mediaStreamRef.current = null;
  };

  const persistPronunciationIfPerfect = async (expectedVocabularyId: string) => {
    const latest = latestPronunciationResultRef.current;
    const chunks = recordedChunksRef.current;

    if (
      !latest ||
      latest.score < 100 ||
      latest.vocabularyId !== expectedVocabularyId ||
      !user?.id ||
      chunks.length === 0
    ) {
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      latestPronunciationResultRef.current = null;
      stopRecorderStreamTracks();
      return;
    }

    try {
      setSavingPronunciation(true);
      const mimeType = chunks[0]?.type || 'audio/webm';
      const audioBlob = new Blob(chunks, { type: mimeType });
      const saved = await uploadUserPronunciation({
        userId: user.id,
        vocabularyId: expectedVocabularyId,
        audioBlob,
        pronunciationScore: latest.score,
        transcript: latest.transcript,
        recognizedRomanization: latest.recognizedRomanization,
      });

      const nextSignedUrl = saved?.storage_path
        ? await getUserPronunciationSignedUrl(saved.storage_path)
        : null;
      setSavedPronunciationUrl(nextSignedUrl);
      setPronunciationHint('Perfect score saved. You can now play your recording.');
    } catch {
      setPronunciationHint('Perfect score reached, but saving failed. Try once more.');
    } finally {
      mediaRecorderRef.current = null;
      setSavingPronunciation(false);
      recordedChunksRef.current = [];
      latestPronunciationResultRef.current = null;
      stopRecorderStreamTracks();
    }
  };

  const quizOptions = useMemo(() => {
    const currentWord = vocabulary[currentIndex];
    if (!currentWord) return [] as Vocabulary[];
    const wrongPool = stableShuffle(
      vocabulary.filter((v) => v.id !== currentWord.id),
      `quiz-wrong-${levelId}-${currentIndex}`
    );
    return placeCorrectOption(
      currentWord,
      wrongPool.slice(0, 3),
      `quiz-${levelId}-${currentIndex}`,
      4
    );
  }, [vocabulary, currentIndex, levelId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getOptionAnim = (index: number) => {
    if (!optionAnimsRef.current[index]) {
      optionAnimsRef.current[index] = new Animated.Value(0);
    }
    return optionAnimsRef.current[index];
  };

  const runOptionAnimation = (count: number) => {
    if (count <= 0) return;
    if (optionAnimsRef.current.length < count) {
      optionAnimsRef.current = Array.from({ length: count }, (_, i) => optionAnimsRef.current[i] ?? new Animated.Value(0));
    }
    const anims = optionAnimsRef.current.slice(0, count);
    anims.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      60,
      anims.map((anim, idx) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 260,
          delay: idx * 20,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  };

  const optionAnimCount =
    phase === 'quiz'
      ? Math.min(4, vocabulary.length)
      : phase === 'dialogue'
        ? 3
        : phase === 'match'
          ? matchPairs.left.length + matchPairs.right.length
          : 0;

  useEffect(() => {
    if (optionAnimCount > 0) {
      runOptionAnimation(optionAnimCount);
    }
  }, [phase, currentIndex, optionAnimCount]);

  useEffect(() => {
    loadVocabulary();
    loadDialogues();
    sessionReported.current = false;
    sessionStart.current = Date.now();
  }, [levelId]);

  useEffect(() => {
    setPronunciationSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    if (phase === 'complete') {
      summaryAnim.setValue(0);
      Animated.timing(summaryAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [phase, summaryAnim]);

  useEffect(() => {
    if (startPhase === 'video' && levelMeta?.video_intro_url && phase === 'intro') {
      setPhase('video');
    }
  }, [startPhase, levelMeta?.video_intro_url, phase]);

  useEffect(() => {
    // DB-only dialogue mode: if no dialogue rows exist, skip the dialogue phase.
    if (phase === 'dialogue' && dialogues.length === 0) {
      setPhase('complete');
      setCurrentIndex(0);
    }
  }, [phase, dialogues.length]);

  useEffect(() => {
    if (phase !== 'listen' && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignored
      }
      recognitionRef.current = null;
      setPronunciationListening(false);
    }
    if (phase === 'listen') {
      setPronunciationScore(null);
      setPronunciationTranscript('');
      setPronunciationMatchedWord(null);
      setPronunciationRomanization('');
      setPronunciationMeaning('');
      setPronunciationHint('Practice pronunciation and get instant feedback.');
    }
  }, [phase, currentIndex]);

  useEffect(() => {
    const word = vocabulary[currentIndex];
    if (phase !== 'listen' || !user?.id || !word?.id) {
      setSavedPronunciationUrl(null);
      setLoadingSavedPronunciation(false);
      return;
    }

    let cancelled = false;
    const loadSavedPronunciation = async () => {
      setLoadingSavedPronunciation(true);
      try {
        const row = await getUserPronunciationByVocabulary({
          userId: user.id,
          vocabularyId: word.id,
        });
        if (!row) {
          if (!cancelled) setSavedPronunciationUrl(null);
          return;
        }
        const signedUrl = await getUserPronunciationSignedUrl(row.storage_path);
        if (!cancelled) {
          setSavedPronunciationUrl(signedUrl);
        }
      } catch {
        if (!cancelled) setSavedPronunciationUrl(null);
      } finally {
        if (!cancelled) setLoadingSavedPronunciation(false);
      }
    };

    void loadSavedPronunciation();
    return () => {
      cancelled = true;
    };
  }, [phase, currentIndex, user?.id, vocabulary]);

  useEffect(() => {
    if (!pronunciationListening) {
      listenRingAnim.stopAnimation();
      listenWaveAnim.stopAnimation();
      listenRingAnim.setValue(0);
      listenWaveAnim.setValue(0);
      return;
    }

    const ringLoop = Animated.loop(
      Animated.timing(listenRingAnim, {
        toValue: 1,
        duration: 1350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    const waveLoop = Animated.loop(
      Animated.timing(listenWaveAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
    );

    ringLoop.start();
    waveLoop.start();
    return () => {
      ringLoop.stop();
      waveLoop.stop();
    };
  }, [pronunciationListening, listenRingAnim, listenWaveAnim]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignored
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignored
        }
      }
      stopRecorderStreamTracks();
    };
  }, []);

  const loadVocabulary = async () => {
    const [levelRes, levelVocabRes] = await Promise.all([
      supabase.from('levels').select('video_intro_url, cultural_media_url, environment_name').eq('id', levelId).single(),
      supabase
        .from('level_vocabulary')
        .select('display_order, vocabulary: vocabulary_id (id, thai_script, romanization, english_translation)')
        .eq('level_id', levelId)
        .order('display_order', { ascending: true })
        .limit(8),
    ]);

    let vocabItems: Vocabulary[] =
      levelVocabRes.data
        ?.map((row: any) => row.vocabulary)
        .filter(Boolean) ?? [];

    if (vocabItems.length === 0) {
      const fallback = await supabase
        .from('vocabulary')
        .select('*')
        .eq('difficulty_level', levelId)
        .limit(8);
      vocabItems = fallback.data ?? [];
    }

    if (vocabItems.length > 0) {
      setVocabulary(vocabItems);
      setupMatchPairs(vocabItems);
    }
    if (levelRes.data) setLevelMeta(levelRes.data);
    setLoading(false);
  };

  const genericDistractors: DialogueOption[] = [
    { thai: 'ขอโทษครับ/ค่ะ', roman: 'khor-thot', english: 'Sorry' },
    { thai: 'ไม่เข้าใจ', roman: 'mai khao-jai', english: "I don't understand" },
    { thai: 'ช่วยพูดอีกครั้ง', roman: 'chuay phuut iik khrang', english: 'Please say again' },
    { thai: 'ไม่แน่ใจ', roman: 'mai nae jai', english: 'Not sure' },
    { thai: 'ไม่เป็นไร', roman: 'mai pen rai', english: "It's OK" },
  ];

  const tokenScore = (value: string) => {
    const tokens = value
      .toLowerCase()
      .replace(/[^a-z]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return new Set(tokens);
  };

  const isTooSimilar = (a: DialogueOption, b: DialogueOption) => {
    if (!a || !b) return false;
    const aText = (a.roman || a.thai || '').toLowerCase();
    const bText = (b.roman || b.thai || '').toLowerCase();
    if (!aText || !bText) return false;
    if (aText === bText) return true;
    if (aText.includes(bText) || bText.includes(aText)) return true;
    const aTokens = tokenScore(aText);
    const bTokens = tokenScore(bText);
    if (aTokens.size === 0 || bTokens.size === 0) return false;
    const intersection = [...aTokens].filter((t) => bTokens.has(t)).length;
    const overlap = intersection / Math.max(1, aTokens.size);
    return overlap >= 0.6;
  };

  const ambiguityTokens = new Set([
    'sugar',
    'sweet',
    'spicy',
    'salt',
    'ice',
    'milk',
    'size',
    'small',
    'large',
    'left',
    'right',
    'straight',
    'price',
    'cheap',
    'expensive',
    'time',
    'day',
    'week',
    'month',
    'yes',
    'no',
    'more',
    'less',
    'half',
    'full',
    'none',
  ]);

  const responseDimensionTokens = new Set([
    'sugar',
    'sweet',
    'spicy',
    'salt',
    'ice',
    'milk',
    'size',
    'small',
    'large',
    'left',
    'right',
    'straight',
    'price',
    'cheap',
    'expensive',
    'cash',
    'card',
    'day',
    'week',
    'month',
    'minute',
    'hour',
    'am',
    'pm',
    'yes',
    'no',
    'more',
    'less',
    'half',
    'full',
    'none',
  ]);

  const tokenize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const isPotentiallyAmbiguous = (opt: DialogueOption, correct: DialogueOption) => {
    const optTokens = new Set(tokenize(`${opt.english} ${opt.roman}`));
    const correctTokens = new Set(tokenize(`${correct.english} ${correct.roman}`));
    const overlap = [...optTokens].filter((token) => correctTokens.has(token));
    return overlap.some((token) => ambiguityTokens.has(token));
  };

  const normalizeDialogueOptions = (dialogue: Dialogue): DialogueOption[] => {
    const correct = dialogue.options.find((opt) => opt.thai === dialogue.correct) ?? {
      thai: dialogue.correct,
      roman: '',
      english: 'Correct',
    };

    const uniqueWrong = dialogue.options.filter(
      (opt, idx, arr) =>
        opt.thai !== correct.thai &&
        arr.findIndex((candidate) => candidate.thai === opt.thai) === idx
    );

    const correctIntent = inferIntent(correct);

    const promptTokens = new Set(tokenize(`${dialogue.english} ${dialogue.roman}`));
    const promptHasAmbiguousDimension = [...promptTokens].some((token) =>
      responseDimensionTokens.has(token)
    );

    const strictDistractors = promptHasAmbiguousDimension
      ? []
      : uniqueWrong.filter(
          (opt) =>
            inferIntent(opt) !== correctIntent &&
            !isTooSimilar(opt, correct) &&
            !isPotentiallyAmbiguous(opt, correct) &&
            !tokenize(`${opt.english} ${opt.roman}`).some((token) =>
              responseDimensionTokens.has(token)
            )
        );

    const relaxedDistractors = promptHasAmbiguousDimension
      ? []
      : uniqueWrong.filter(
          (opt) =>
            !isTooSimilar(opt, correct) &&
            !isPotentiallyAmbiguous(opt, correct) &&
            !tokenize(`${opt.english} ${opt.roman}`).some((token) =>
              responseDimensionTokens.has(token)
            )
        );

    const distractors: DialogueOption[] = [];
    strictDistractors.forEach((candidate) => {
      if (distractors.length < 2) distractors.push(candidate);
    });
    relaxedDistractors.forEach((candidate) => {
      if (distractors.length < 2 && !distractors.find((item) => item.thai === candidate.thai)) {
        distractors.push(candidate);
      }
    });

    genericDistractors.forEach((candidate) => {
      if (
        distractors.length < 2 &&
        candidate.thai !== correct.thai &&
        !isTooSimilar(candidate, correct) &&
        !distractors.find((item) => item.thai === candidate.thai)
      ) {
        distractors.push(candidate);
      }
    });

    return placeCorrectOption(
      correct,
      distractors,
      `dialogue-normalized-${dialogue.speaker}-${dialogue.thai}`,
      3
    );
  };

  const startPronunciationPractice = async (word: Vocabulary | undefined) => {
    if (!word) return;
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setPronunciationHint('Voice practice is available on web Chrome/Edge.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignored
      }
      recognitionRef.current = null;
    }

    try {
      recordedChunksRef.current = [];
      latestPronunciationResultRef.current = null;

      const runtime = globalThis as any;
      const mediaDevices = runtime?.navigator?.mediaDevices;
      const MediaRecorderCtor = runtime?.MediaRecorder;
      if (Platform.OS === 'web' && mediaDevices?.getUserMedia && MediaRecorderCtor) {
        try {
          const stream = await mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
          const mimeType = preferredMimeTypes.find((type) =>
            MediaRecorderCtor?.isTypeSupported ? MediaRecorderCtor.isTypeSupported(type) : false
          );
          const recorder = mimeType
            ? new MediaRecorderCtor(stream, { mimeType })
            : new MediaRecorderCtor(stream);
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (event: any) => {
            if (event?.data?.size > 0) recordedChunksRef.current.push(event.data);
          };
          recorder.onstop = () => {
            void persistPronunciationIfPerfect(word.id);
          };
          recorder.onerror = () => {
            stopRecorderStreamTracks();
          };
          recorder.start();
        } catch {
          mediaRecorderRef.current = null;
          stopRecorderStreamTracks();
        }
      } else {
        mediaRecorderRef.current = null;
        stopRecorderStreamTracks();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'th-TH';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setPronunciationListening(true);
      setPronunciationHint('Listening...');
      setPronunciationTranscript('');
      setPronunciationMatchedWord(null);
      setPronunciationRomanization('');
      setPronunciationMeaning('');
      setPronunciationScore(null);

      recognition.onresult = async (event: any) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript ?? '').trim();
        const normalizedTranscript = normalizeSpeech(transcript);
        let matchedWord: Vocabulary | null =
          vocabulary.find((item) => normalizeSpeech(item.thai_script) === normalizedTranscript) ?? null;
        if (!matchedWord && transcript) {
          const { data } = await supabase
            .from('vocabulary')
            .select('id, thai_script, romanization, english_translation')
            .eq('thai_script', transcript)
            .limit(1)
            .maybeSingle();
          if (data) {
            matchedWord = data as Vocabulary;
          }
        }
        const thaiScore = scoreTranscriptAgainstTarget(transcript, word.thai_script);
        const romanScore = scoreTranscriptAgainstTarget(transcript, word.romanization);
        const bestScore = Math.max(thaiScore, romanScore);
        const fallbackRomanization = isThaiText(transcript)
          ? transliterateThaiRtgs(transcript)
          : transcript.toLowerCase();
        const effectiveRomanization = matchedWord?.romanization || fallbackRomanization || word.romanization;
        const effectiveMeaning = matchedWord?.english_translation
          ? formatEnglishDisplay(matchedWord.english_translation)
          : 'no glossary match';
        setPronunciationTranscript(transcript);
        setPronunciationMatchedWord(matchedWord);
        setPronunciationRomanization(effectiveRomanization);
        setPronunciationMeaning(effectiveMeaning);
        setPronunciationScore(bestScore);
        latestPronunciationResultRef.current = {
          score: bestScore,
          transcript,
          recognizedRomanization: effectiveRomanization,
          vocabularyId: word.id,
        };
        if (bestScore >= 85) setPronunciationHint('Strong pronunciation. Keep going.');
        else if (bestScore >= 65) setPronunciationHint('Good attempt. Try once more for precision.');
        else setPronunciationHint('Try slower and repeat once.');
      };
      recognition.onerror = () => {
        setPronunciationHint('Could not capture voice. Try again in a quieter spot.');
        setPronunciationMatchedWord(null);
        setPronunciationListening(false);
        if (mediaRecorderRef.current?.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            // ignored
          }
        } else {
          stopRecorderStreamTracks();
        }
      };
      recognition.onend = () => {
        setPronunciationListening(false);
        if (mediaRecorderRef.current?.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            stopRecorderStreamTracks();
          }
        } else {
          stopRecorderStreamTracks();
        }
      };
      recognition.start();
    } catch {
      setPronunciationListening(false);
      setPronunciationHint('Voice practice is unavailable on this browser/device.');
      stopRecorderStreamTracks();
    }
  };

  const stopPronunciationPractice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignored
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignored
      }
    } else {
      mediaRecorderRef.current = null;
      stopRecorderStreamTracks();
    }
    setPronunciationListening(false);
  };

  const loadDialogues = async () => {
    const { data, error } = await supabase
      .from('dialogues')
      .select('speaker, speaker_thai, emoji, thai, roman, english, correct, options, display_order')
      .eq('level_id', levelId)
      .order('display_order', { ascending: true });

    if (error) {
      setDialogues([]);
      return;
    }

    if (data && data.length > 0) {
      const mapped: Dialogue[] = data.map((row: any) => ({
        speaker: row.speaker,
        speakerThai: row.speaker_thai,
        emoji: row.emoji,
        thai: row.thai,
        roman: row.roman,
        english: row.english,
        correct: row.correct,
        options: Array.isArray(row.options) ? row.options : [],
      }));
      setDialogues(mapped.map((dialogue) => ({ ...dialogue, options: normalizeDialogueOptions(dialogue) })));
    } else {
      setDialogues([]);
    }
  };

  const setupMatchPairs = (data: Vocabulary[]) => {
    const items = data.slice(0, 4);
    const left = items.map(v => ({ id: v.id, thai: v.thai_script, roman: v.romanization })).sort(() => Math.random() - 0.5);
    const right = items.map(v => ({ id: v.id, english: v.english_translation })).sort(() => Math.random() - 0.5);
    setMatchPairs({ left, right, matched: [] });
  };

  const getPhases = () => {
    const base: Phase[] = ['intro', 'listen', 'quiz', 'match'];
    if (dialogues.length > 0) {
      base.push('dialogue');
    }
    base.push('complete');
    if (levelMeta?.video_intro_url) {
      base.splice(1, 0, 'video');
    }
    return base;
  };

  const handleNextPhase = () => {
    const phases = getPhases();
    const idx = phases.indexOf(phase);
    if (idx < phases.length - 1) {
      setPhase(phases[idx + 1]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const handleAnswer = (answer: string, correct: boolean) => {
    setSelectedAnswer(answer);
    setShowFeedback(true);
    setAttemptCount((c) => c + 1);
    if (correct) {
      setScore(s => s + 10);
      setCorrectCount((c) => c + 1);
    }
    const lastIndex =
      phase === 'dialogue'
        ? Math.max(0, dialogues.length - 1)
        : Math.min(3, Math.max(0, vocabulary.length - 1));
    setTimeout(() => {
      if (currentIndex < lastIndex) {
        setCurrentIndex(i => i + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        handleNextPhase();
      }
    }, 1200);
  };

  const getIntervalDays = (box: number, rating: SrsRating) => {
    const intervals = [1, 3, 7, 14, 30];
    const base = intervals[Math.max(0, Math.min(intervals.length - 1, box - 1))];
    if (rating === 'hard') return Math.max(1, Math.round(base * 0.5));
    if (rating === 'easy') return Math.round(base * 1.5);
    return base;
  };

  const getNextBox = (currentBox: number, rating: SrsRating, incorrectStreak: number) => {
    if (rating === 'again') return 1;
    if (rating === 'hard') return Math.max(1, currentBox - (incorrectStreak >= 2 ? 1 : 0));
    if (rating === 'good') return Math.min(5, currentBox + 1);
    return Math.min(5, currentBox + 2);
  };

  const updateSrsProgress = async (wordId: string, rating: SrsRating) => {
    if (!user?.id) return;
    const now = new Date();
    const { data } = await supabase
      .from('user_vocabulary_progress')
      .select('id, srs_box, times_correct, times_incorrect, incorrect_streak')
      .eq('user_id', user.id)
      .eq('vocabulary_id', wordId)
      .maybeSingle();

    const currentBox = data?.srs_box ?? 1;
    const timesCorrect = data?.times_correct ?? 0;
    const timesIncorrect = data?.times_incorrect ?? 0;
    const incorrectStreak = data?.incorrect_streak ?? 0;
    const newIncorrectStreak = rating === 'again' ? incorrectStreak + 1 : 0;
    const nextBox = getNextBox(currentBox, rating, newIncorrectStreak);
    const newCorrect = rating === 'again' ? timesCorrect : timesCorrect + 1;
    const newIncorrect = rating === 'again' ? timesIncorrect + 1 : timesIncorrect;
    const nextReview = new Date(now.getTime() + getIntervalDays(nextBox, rating) * 24 * 60 * 60 * 1000);
    const isProblem = newIncorrect >= 3;

    await supabase.from('user_vocabulary_progress').upsert(
      {
        user_id: user.id,
        vocabulary_id: wordId,
        srs_box: nextBox,
        times_correct: newCorrect,
        times_incorrect: newIncorrect,
        incorrect_streak: newIncorrectStreak,
        last_reviewed: now.toISOString(),
        next_review_date: nextReview.toISOString(),
        is_problem_word: isProblem,
      },
      { onConflict: 'user_id,vocabulary_id' }
    );
  };

  const handleListenRating = (rating: SrsRating) => {
    const ratingPoints: Record<SrsRating, number> = {
      again: 0,
      hard: 5,
      good: 10,
      easy: 15,
    };
    setScore((s) => s + ratingPoints[rating]);
    const word = vocabulary[currentIndex];
    if (word?.id) {
      updateSrsProgress(word.id, rating).catch((error) => {
        console.warn('SRS update failed', error);
      });
    }
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleNextPhase();
    }
  };

  const handleMatch = (item: any, side: 'left' | 'right') => {
    if (side === 'left') {
      setSelectedLeft(item.id);
      playThaiAudio(item.thai);
    } else if (selectedLeft) {
      if (selectedLeft === item.id) {
        setMatchPairs(p => ({ ...p, matched: [...p.matched, item.id] }));
        setScore(s => s + 15);
        setAttemptCount((c) => c + 1);
        setCorrectCount((c) => c + 1);
        if (matchPairs.matched.length + 1 >= 4) setTimeout(handleNextPhase, 800);
      }
      setSelectedLeft(null);
    }
  };

  useEffect(() => {
    if (phase === 'complete') {
      const timeSeconds = Math.max(1, Math.round((Date.now() - sessionStart.current) / 1000));
      const accuracy = attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 100;
      if (!sessionReported.current) {
        sessionReported.current = true;
        setLastSession({
          completedAt: Date.now(),
          levelId,
          score,
          wordsLearned: vocabulary.length,
          accuracy,
          timeSeconds,
        });
      }
    }
  }, [phase, attemptCount, correctCount, levelId, score, setLastSession, vocabulary.length]);

  const Screen = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.container}>
      <DecorativeBackground />
      {children}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  const SceneHeader = ({
    showProgress = false,
    progress = 0,
    progressLabel,
  }: {
    showProgress?: boolean;
    progress?: number;
    progressLabel?: string;
  }) => (
    <View style={[styles.sceneHeader, { borderColor: theme.cardBorder }]}>
      <View style={[styles.sceneHeaderAccent, { backgroundColor: theme.primaryLight }]} />
      <View style={styles.sceneHeaderTop}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.sceneEmojis}>
          {theme.sceneEmojis.map((e, i) => (
            <Text key={i} style={[styles.sceneEmoji, { opacity: 0.6 + (i * 0.1) }]}>{e}</Text>
          ))}
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreIcon}>⭐</Text>
          <Text style={styles.scoreNum}>{score}</Text>
        </View>
      </View>
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
          </View>
          <Text style={styles.progressText}>{progressLabel ?? `${Math.round(progress)}%`}</Text>
        </View>
      )}
    </View>
  );

  if (phase === 'intro') {
    return (
      <Screen>
        <SceneHeader />
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.introCard}>
            <Text style={styles.levelEmoji}>{theme.emoji}</Text>
            <Text style={styles.levelTitle}>{theme.name}</Text>
            <Text style={styles.levelDesc}>{theme.description}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📚 Words to Learn</Text>
            {vocabulary.slice(0, 5).map((v, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [styles.wordRow, pressed && styles.pressScale]}
                onPress={() => playThaiAudio(v.thai_script)}
              >
                <View style={styles.wordLeft}>
                  <Text style={styles.wordThai}>{v.thai_script}</Text>
                  <Text style={styles.wordRoman}>{v.romanization}</Text>
                </View>
                <Text style={styles.wordEnglish}>{formatEnglishDisplay(v.english_translation)}</Text>
                <Text style={styles.audioIcon}>🔊</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.orange },
              pressed && styles.pressScale,
            ]}
            onPress={handleNextPhase}
          >
            <Text style={styles.primaryBtnText}>{levelMeta?.video_intro_url ? 'Watch Intro' : 'Start Lesson'}</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }


  if (phase === 'video') {
    return (
      <Screen>
        <SceneHeader />
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.videoCard}>
            <Text style={styles.videoTitle}>Video Intro</Text>
            <Text style={styles.videoSubtitle}>2–3 min real-world context</Text>
            {levelMeta?.video_intro_url ? (
              <View style={styles.videoFrame}>
                <Video
                  style={styles.videoPlayer}
                  source={{ uri: levelMeta.video_intro_url }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              </View>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderEmoji}>🎬</Text>
                <Text style={styles.videoPlaceholderText}>Intro video coming soon.</Text>
              </View>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.orange },
              pressed && styles.pressScale,
            ]}
            onPress={handleNextPhase}
          >
            <Text style={styles.primaryBtnText}>Start Lesson</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  if (phase === 'listen') {
    const word = vocabulary[currentIndex];
    const progress = ((currentIndex + 1) / vocabulary.length) * 100;
    const pronunciationColor =
      pronunciationScore === null
        ? colors.blue
        : pronunciationScore >= 85
          ? colors.success
          : pronunciationScore >= 65
            ? colors.orange
            : colors.error;
    const ringScalePrimary = listenRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.35],
    });
    const ringOpacityPrimary = listenRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0],
    });
    const ringScaleSecondary = listenRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.2],
    });
    const ringOpacitySecondary = listenRingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0],
    });
    const waveScaleA = listenWaveAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0.6, 1.4, 0.8, 1.2, 0.6],
    });
    const waveScaleB = listenWaveAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [1.1, 0.7, 1.4, 0.8, 1.1],
    });
    const waveScaleC = listenWaveAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0.8, 1.2, 0.6, 1.5, 0.8],
    });
    const heardMatch = pronunciationTranscript
      ? pronunciationMatchedWord
      : null;
    const heardRomanization =
      pronunciationRomanization || heardMatch?.romanization || word.romanization;
    const heardEnglish =
      pronunciationMeaning ||
      formatEnglishDisplay(heardMatch?.english_translation ?? word.english_translation);
    const heardMetaLabel = heardMatch ? 'Matched' : 'Target';
    return (
      <Screen>
        <SceneHeader showProgress progress={progress} progressLabel={`${currentIndex + 1}/${vocabulary.length}`} />
        <View style={[styles.content, styles.listenContent, isCompactHeight && styles.listenContentCompact]}>
          <Text style={[styles.phaseTitle, isCompactHeight && styles.phaseTitleCompact]}>Listen & Learn</Text>
          <Text style={[styles.phaseSubtitle, isCompactHeight && styles.phaseSubtitleCompact]}>Tap the card to hear the pronunciation</Text>

          <View style={[styles.listenTopRow, isWideWeb && styles.listenTopRowWide]}>
            <Pressable
              style={({ pressed }) => [
                styles.bigCard,
                styles.listenWordCard,
                isWideWeb && styles.listenWordCardWide,
                isCompactHeight && styles.listenWordCardCompact,
                { borderColor: theme.primary },
                pressed && styles.pressScale,
              ]}
              onPress={() => playThaiAudio(word.thai_script)}
            >
              <Text style={styles.bigCardEmoji}>🔊</Text>
              <Text style={[styles.bigCardThai, isCompactHeight && styles.bigCardThaiCompact]}>{word.thai_script}</Text>
              <Text style={[styles.bigCardRoman, { color: theme.primary }, isCompactHeight && styles.bigCardRomanCompact]}>
                {word.romanization}
              </Text>
              <View style={styles.dividerLine} />
              <Text style={[styles.bigCardEnglish, isCompactHeight && styles.bigCardEnglishCompact]}>
                {formatEnglishDisplay(word.english_translation)}
              </Text>
            </Pressable>

            <View
              style={[
                styles.pronunciationCard,
                styles.pronunciationCardProminent,
                isWideWeb && styles.pronunciationCardWide,
                isCompactHeight && styles.pronunciationCardCompact,
              ]}
            >
              <View style={styles.pronunciationHeader}>
                <Text style={styles.pronunciationTitle}>Pronunciation Practice</Text>
                <Text style={styles.pronunciationHint}>{pronunciationHint}</Text>
              </View>
              <View style={styles.pronunciationBody}>
                <View style={styles.pronunciationOrbWrap}>
                  {pronunciationListening && (
                    <>
                      <Animated.View
                        style={[
                          styles.pronunciationRing,
                          { borderColor: pronunciationColor, opacity: ringOpacityPrimary, transform: [{ scale: ringScalePrimary }] },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.pronunciationRing,
                          styles.pronunciationRingSecondary,
                          { borderColor: pronunciationColor, opacity: ringOpacitySecondary, transform: [{ scale: ringScaleSecondary }] },
                        ]}
                      />
                    </>
                  )}
                  <View style={[styles.pronunciationOrb, { borderColor: pronunciationColor }]}>
                    <Text style={[styles.pronunciationScore, { color: pronunciationColor }]}>
                      {pronunciationScore === null ? '--' : `${pronunciationScore}%`}
                    </Text>
                  </View>
                </View>
                <View style={styles.pronunciationActionCol}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.pronunciationBtn,
                      { backgroundColor: colors.orange, borderColor: colors.orangeDark },
                      pressed && styles.pressScale,
                    ]}
                    onPress={() => startPronunciationPractice(word)}
                    disabled={!pronunciationSupported || pronunciationListening}
                  >
                    <Text style={styles.pronunciationBtnText}>
                      {pronunciationListening ? 'Listening...' : 'Start Practice'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.pronunciationBtnSecondary,
                      (!savedPronunciationUrl || loadingSavedPronunciation || savingPronunciation) &&
                        styles.pronunciationBtnDisabled,
                      pressed && styles.pressScale,
                    ]}
                    onPress={() => {
                      if (savedPronunciationUrl) {
                        void playAudioFromUri(savedPronunciationUrl);
                      }
                    }}
                    disabled={!savedPronunciationUrl || loadingSavedPronunciation || savingPronunciation}
                  >
                    <Text style={styles.pronunciationBtnSecondaryText}>
                      {loadingSavedPronunciation
                        ? 'Loading recording...'
                        : savingPronunciation
                          ? 'Saving recording...'
                          : savedPronunciationUrl
                            ? 'Play My Recording'
                            : 'No Recording Yet'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.pronunciationBtnSecondary,
                      !pronunciationListening && styles.pronunciationBtnDisabled,
                      pressed && styles.pressScale,
                    ]}
                    onPress={stopPronunciationPractice}
                    disabled={!pronunciationListening}
                  >
                    <Text style={styles.pronunciationBtnSecondaryText}>Stop</Text>
                  </Pressable>
                  {pronunciationListening && (
                    <View style={styles.waveRow}>
                      <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveScaleA }] }]} />
                      <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveScaleB }] }]} />
                      <Animated.View style={[styles.waveBar, { transform: [{ scaleY: waveScaleC }] }]} />
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.pronunciationMeta}>
                <Text style={styles.pronunciationTranscript}>
                  {pronunciationTranscript
                    ? `Heard: "${pronunciationTranscript}"`
                    : pronunciationSupported
                      ? 'Tap Start Practice and say the Thai word out loud.'
                      : 'This feature is currently web-only in supported browsers.'}
                </Text>
                <Text style={styles.pronunciationMetaLine}>{heardMetaLabel} romanization: {heardRomanization}</Text>
                <Text style={styles.pronunciationMetaLine}>{heardMetaLabel} meaning: {heardEnglish}</Text>
                <Text style={styles.pronunciationMetaLine}>
                  Personal recording: {savedPronunciationUrl ? 'available' : 'save by hitting 100%'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.srsLabel, isCompactHeight && styles.srsLabelCompact]}>How did that feel?</Text>
          <View style={[styles.srsGrid, isWideWeb && styles.srsGridWide]}>
            <Pressable
              style={({ pressed }) => [
                styles.srsButton,
                styles.srsAgain,
                isWideWeb && styles.srsButtonWide,
                isCompactHeight && styles.srsButtonCompact,
                pressed && styles.pressScale,
              ]}
              onPress={() => handleListenRating('again')}
            >
              <Text style={styles.srsText}>Again</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.srsButton,
                styles.srsHard,
                isWideWeb && styles.srsButtonWide,
                isCompactHeight && styles.srsButtonCompact,
                pressed && styles.pressScale,
              ]}
              onPress={() => handleListenRating('hard')}
            >
              <Text style={styles.srsText}>Hard</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.srsButton,
                styles.srsGood,
                isWideWeb && styles.srsButtonWide,
                isCompactHeight && styles.srsButtonCompact,
                pressed && styles.pressScale,
              ]}
              onPress={() => handleListenRating('good')}
            >
              <Text style={styles.srsText}>Good</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.srsButton,
                styles.srsEasy,
                isWideWeb && styles.srsButtonWide,
                isCompactHeight && styles.srsButtonCompact,
                pressed && styles.pressScale,
              ]}
              onPress={() => handleListenRating('easy')}
            >
              <Text style={styles.srsText}>Easy</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === 'quiz') {
    const word = vocabulary[currentIndex];
    const options = quizOptions;
    const totalQuestions = 4;
    const progress = ((currentIndex + 1) / totalQuestions) * 100;
    return (
      <Screen>
        <SceneHeader
          showProgress
          progress={progress}
          progressLabel={`${Math.min(currentIndex + 1, totalQuestions)}/${totalQuestions}`}
        />
        <View style={styles.content}>
          <Text style={styles.phaseTitle}>What does this mean?</Text>

          <TouchableOpacity style={[styles.quizCard, { borderColor: theme.primary }]} onPress={() => playThaiAudio(word.thai_script)}>
            <Text style={styles.quizThai}>{word.thai_script}</Text>
            <Text style={[styles.quizRoman, { color: theme.primary }]}>{word.romanization}</Text>
            <Text style={styles.tapHint}>🔊 Tap to hear</Text>
          </TouchableOpacity>

          <View style={styles.optionsContainer}>
            {options.map((opt, i) => {
              const isCorrect = opt.id === word.id;
              const isSelected = selectedAnswer === opt.id;
              let bgColor = colors.white;
              let borderColor = colors.blue;
              if (showFeedback && isCorrect) { bgColor = '#E8F5E9'; borderColor = colors.success; }
              else if (showFeedback && isSelected && !isCorrect) { bgColor = '#FFEBEE'; borderColor = colors.error; }
              const anim = getOptionAnim(i);
              return (
                <Animated.View
                  key={i}
                  style={{
                    opacity: anim,
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionBtn,
                      { backgroundColor: bgColor, borderColor },
                      pressed && !showFeedback && styles.pressScale,
                    ]}
                    onPress={() => !showFeedback && handleAnswer(opt.id, isCorrect)}
                    disabled={showFeedback}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.optionRadio,
                          isSelected && { borderColor: theme.primary },
                          showFeedback && isCorrect && { borderColor: colors.success },
                          showFeedback && isSelected && !isCorrect && { borderColor: colors.error },
                        ]}
                      >
                        {(isSelected || (showFeedback && isCorrect)) && (
                          <View
                            style={[
                              styles.optionRadioFill,
                              showFeedback && isCorrect && { backgroundColor: colors.success },
                              showFeedback && isSelected && !isCorrect && { backgroundColor: colors.error },
                              !showFeedback && { backgroundColor: theme.primary },
                            ]}
                          />
                        )}
                      </View>
                      <Text style={styles.optionText}>{formatEnglishDisplay(opt.english_translation)}</Text>
                    </View>
                    {showFeedback && isCorrect && (
                      <View style={[styles.optionBadge, styles.optionBadgeSuccess]}>
                        <Text style={styles.checkMark}>✓</Text>
                      </View>
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <View style={[styles.optionBadge, styles.optionBadgeError]}>
                        <Text style={styles.xMark}>✗</Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === 'match') {
    const progress = (matchPairs.matched.length / 4) * 100;
    return (
      <Screen>
        <SceneHeader showProgress progress={progress} progressLabel={`${matchPairs.matched.length}/4`} />
        <View style={styles.content}>
          <Text style={styles.phaseTitle}>Match the Pairs</Text>
          <Text style={styles.phaseSubtitle}>Tap Thai → then tap English</Text>

          <View style={styles.matchGrid}>
            <View style={styles.matchCol}>
              {matchPairs.left.map((item, i) => {
                const matched = matchPairs.matched.includes(item.id);
                const selected = selectedLeft === item.id;
                const anim = getOptionAnim(i);
                return (
                  <Animated.View
                    key={i}
                    style={{
                      opacity: anim,
                      transform: [
                        {
                          translateY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.matchCard,
                        matched && styles.matchedCard,
                        selected && { borderColor: theme.primary, borderWidth: 3 },
                        pressed && !matched && styles.pressScale,
                      ]}
                      onPress={() => !matched && handleMatch(item, 'left')}
                      disabled={matched}
                    >
                      <View style={styles.matchCardContent}>
                        <View
                          style={[
                            styles.matchDot,
                            selected && styles.matchDotSelected,
                            matched && styles.matchDotMatched,
                          ]}
                        />
                        <View style={styles.matchTextBlock}>
                          <Text style={[styles.matchThai, matched && styles.matchedText]}>{item.thai}</Text>
                          <Text style={[styles.matchRoman, matched && styles.matchedText]}>{item.roman}</Text>
                        </View>
                      </View>
                      {matched && (
                        <View style={[styles.optionBadge, styles.optionBadgeSuccess]}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.matchCol}>
              {matchPairs.right.map((item, i) => {
                const matched = matchPairs.matched.includes(item.id);
                const anim = getOptionAnim(i + matchPairs.left.length);
                return (
                  <Animated.View
                    key={i}
                    style={{
                      opacity: anim,
                      transform: [
                        {
                          translateY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.matchCard,
                        styles.matchCardRight,
                        matched && styles.matchedCard,
                        pressed && !matched && styles.pressScale,
                      ]}
                      onPress={() => !matched && handleMatch(item, 'right')}
                      disabled={matched}
                    >
                      <View style={styles.matchCardContent}>
                        <View style={[styles.matchDot, matched && styles.matchDotMatched]} />
                        <View style={styles.matchTextBlock}>
                          <Text style={[styles.matchEnglish, matched && styles.matchedText]}>
                            {formatEnglishDisplay(item.english)}
                          </Text>
                        </View>
                      </View>
                      {matched && (
                        <View style={[styles.optionBadge, styles.optionBadgeSuccess]}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === 'dialogue') {
    if (dialogues.length === 0) {
      return (
        <Screen>
          <SceneHeader />
          <View style={styles.content}>
            <Text style={styles.phaseTitle}>🗣️ Conversation Practice</Text>
            <Text style={styles.phaseSubtitle}>Dialogue content is loading. You can continue for now.</Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.orange },
                pressed && styles.pressScale,
              ]}
              onPress={handleNextPhase}
            >
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </Pressable>
          </View>
        </Screen>
      );
    }

    const dialogueSet = dialogues;
    const d = dialogueSet[currentIndex] ?? dialogueSet[0];
    const correctOption =
      d.options.find((opt) => opt.thai === d.correct) ?? d.options[0];
    const wrongOptions = stableShuffle(
      d.options.filter((opt) => opt.thai !== correctOption?.thai),
      `dialogue-wrong-${levelId}-${currentIndex}`
    );
    const dialogueOptions = correctOption
      ? placeCorrectOption(
          correctOption,
          wrongOptions,
          `dialogue-${levelId}-${currentIndex}`,
          3
        )
      : d.options;
    const total = dialogueSet.length || 1;
    const progress = ((currentIndex + 1) / total) * 100;

    return (
      <Screen>
        <SceneHeader showProgress progress={progress} progressLabel={`${currentIndex + 1}/${total}`} />
        <View style={styles.dialogueStage}>
          <View style={[styles.dialogueGlowTop, { backgroundColor: theme.primaryLight }]} />
          <View style={styles.dialogueGlowBottom} />
          <View style={styles.dialogueStageContent}>
            <Text style={styles.phaseTitle}>🗣️ Conversation Practice</Text>

            <Pressable
              style={({ pressed }) => [
                styles.dialogueBubble,
                { borderColor: theme.primary },
                pressed && styles.pressScale,
              ]}
              onPress={() => playThaiAudio(d.thai)}
            >
              <View style={styles.dialogueHeader}>
                <View style={styles.dialogueAvatar}>
                  <Text style={styles.dialogueAvatarEmoji}>{d.emoji}</Text>
                </View>
                <View style={styles.dialogueHeaderText}>
                  <Text style={styles.dialogueSpeaker}>{d.speaker}</Text>
                  <Text style={styles.dialogueSpeakerThai}>{d.speakerThai}</Text>
                </View>
                <View style={styles.dialogueTag}>
                  <Text style={styles.dialogueTagText}>Roleplay</Text>
                </View>
              </View>
              <Text style={styles.dialogueThai}>{d.thai}</Text>
              <Text style={[styles.dialogueRoman, { color: theme.primary }]}>{d.roman}</Text>
              <Text style={styles.dialogueEnglish}>{formatEnglishDisplay(d.english)}</Text>
              <Text style={styles.tapHint}>🔊 Tap to hear</Text>
            </Pressable>

            <Text style={styles.responseLabel}>Your response:</Text>

            <View style={styles.dialogueOptions}>
              {dialogueOptions.map((opt, i) => {
                const isCorrect = opt.thai === d.correct;
                const isSelected = selectedAnswer === opt.thai;
                let bgColor = colors.white;
                let borderColor = colors.blue;
                if (showFeedback && isCorrect) { bgColor = '#E8F5E9'; borderColor = colors.success; }
                else if (showFeedback && isSelected && !isCorrect) { bgColor = '#FFEBEE'; borderColor = colors.error; }
                const anim = getOptionAnim(i);
                return (
                  <Animated.View
                    key={i}
                    style={{
                      opacity: anim,
                      transform: [
                        {
                          translateY: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.dialogueOption,
                        { backgroundColor: bgColor, borderColor },
                        pressed && !showFeedback && styles.pressScale,
                      ]}
                      onPress={() => {
                        if (!showFeedback) {
                          playThaiAudio(opt.thai);
                          handleAnswer(opt.thai, isCorrect);
                        }
                      }}
                      disabled={showFeedback}
                    >
                      <View style={styles.dialogueOptionLeft}>
                        <View
                          style={[
                            styles.optionRadio,
                            isSelected && { borderColor: theme.primary },
                            showFeedback && isCorrect && { borderColor: colors.success },
                            showFeedback && isSelected && !isCorrect && { borderColor: colors.error },
                          ]}
                        >
                          {(isSelected || (showFeedback && isCorrect)) && (
                            <View
                              style={[
                                styles.optionRadioFill,
                                showFeedback && isCorrect && { backgroundColor: colors.success },
                                showFeedback && isSelected && !isCorrect && { backgroundColor: colors.error },
                                !showFeedback && { backgroundColor: theme.primary },
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.dialogueOptionText}>
                          <Text style={styles.dialogueOptThai}>{opt.thai}</Text>
                          <Text style={styles.dialogueOptRoman}>{opt.roman}</Text>
                          <Text style={styles.dialogueOptEnglish}>{formatEnglishDisplay(opt.english)}</Text>
                        </View>
                      </View>
                      {showFeedback && isCorrect && (
                        <View style={[styles.optionBadge, styles.optionBadgeSuccess]}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <View style={[styles.optionBadge, styles.optionBadgeError]}>
                          <Text style={styles.xMark}>✗</Text>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === 'complete') {
    const stars = score >= 80 ? 3 : score >= 50 ? 2 : 1;
    const timeSeconds = Math.max(1, Math.round((Date.now() - sessionStart.current) / 1000));
    const accuracy = attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 100;
    return (
      <Screen>
        <View style={[styles.completeHeader, { backgroundColor: theme.primaryLight, borderColor: theme.cardBorder }]}>
          {theme.sceneEmojis.map((e, i) => (
            <Text key={i} style={styles.completeEmoji}>{e}</Text>
          ))}
        </View>
        <View style={styles.completeContent}>
          <Text style={styles.completeTitle}>🎉 Level Complete!</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3].map(i => (
              <Text key={i} style={[styles.star, i <= stars ? styles.starFilled : styles.starEmpty]}>★</Text>
            ))}
          </View>
          <View style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{score} pts</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Words Learned</Text>
              <Text style={styles.scoreValue}>{vocabulary.length}</Text>
            </View>
          </View>
          <Animated.View
            style={[
              styles.sessionCard,
              {
                opacity: summaryAnim,
                transform: [
                  {
                    translateY: summaryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                  {
                    scale: summaryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sessionTitle}>Session Summary</Text>
            <Animated.View
              style={[
                styles.sessionRow,
                {
                  opacity: summaryAnim,
                  transform: [
                    {
                      translateY: summaryAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.sessionRowLeft}>
                <Text style={styles.sessionIcon}>🎯</Text>
                <Text style={styles.sessionLabel}>Accuracy</Text>
              </View>
              <Text style={styles.sessionValue}>{accuracy}%</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.sessionRow,
                {
                  opacity: summaryAnim,
                  transform: [
                    {
                      translateY: summaryAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.sessionRowLeft}>
                <Text style={styles.sessionIcon}>⏱️</Text>
                <Text style={styles.sessionLabel}>Time</Text>
              </View>
              <Text style={styles.sessionValue}>{formatDuration(timeSeconds)}</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.sessionRow,
                {
                  opacity: summaryAnim,
                  transform: [
                    {
                      translateY: summaryAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.sessionRowLeft}>
                <Text style={styles.sessionIcon}>🧠</Text>
                <Text style={styles.sessionLabel}>Reviewed</Text>
              </View>
              <Text style={styles.sessionValue}>{attemptCount} checks</Text>
            </Animated.View>
          </Animated.View>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.orange },
              pressed && styles.pressScale,
            ]}
            onPress={onBack}
          >
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return null;
}

const createStyles = (brand: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.cream },
  loadingContainer: { flex: 1, backgroundColor: brand.cream, justifyContent: 'center', alignItems: 'center' },

  sceneHeader: {
    paddingTop: 46,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
    borderWidth: 2,
    backgroundColor: brand.white,
    overflow: 'hidden',
    ...shadows.soft,
  },
  sceneHeaderAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    opacity: 0.7,
  },
  sceneHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    width: spacing['4xl'],
    height: spacing['4xl'],
    borderRadius: radii.xxl,
    backgroundColor: brand.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.borderStrong,
  },
  backBtnText: { fontSize: 20, color: brand.textDark },
  sceneEmojis: { flexDirection: 'row', gap: 8 },
  sceneEmoji: { fontSize: 24 },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: brand.borderStrong,
  },
  scoreIcon: { fontSize: 16, marginRight: 4 },
  scoreNum: { fontSize: 16, fontWeight: '700', color: brand.textDark },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  progressBg: {
    flex: 1,
    height: 10,
    backgroundColor: brand.creamDark,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: brand.border,
    marginRight: 8,
  },
  progressFill: { height: '100%', borderRadius: 6 },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: brand.textDark,
    backgroundColor: brand.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.borderStrong,
  },

  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  contentContainer: { paddingBottom: spacing['4xl'] },

  introCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  levelEmoji: { fontSize: 48, marginBottom: 8 },
  levelTitle: { fontSize: 24, fontFamily: fonts.display, color: brand.blue, marginBottom: 4 },
  levelDesc: { fontSize: 14, color: brand.textMedium, textAlign: 'center' },
  videoCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  videoTitle: { fontSize: 18, fontFamily: fonts.display, color: brand.blue },
  videoSubtitle: { fontSize: 12, color: brand.textMedium, marginTop: 4, marginBottom: 12 },
  videoFrame: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: brand.border,
    backgroundColor: brand.creamDark,
  },
  videoPlayer: { width: '100%', height: 200 },
  videoPlaceholder: {
    height: 200,
    borderRadius: radii.xl,
    backgroundColor: brand.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brand.border,
  },
  videoPlaceholderEmoji: { fontSize: 32, marginBottom: 8 },
  videoPlaceholderText: { fontSize: 12, color: brand.textMedium },


  card: {
    backgroundColor: brand.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  cardTitle: { fontSize: 16, fontFamily: fonts.display, color: brand.blue, marginBottom: spacing.md },
  wordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: brand.border },
  wordLeft: { flex: 1 },
  wordThai: { fontSize: 18, fontFamily: fonts.display, color: brand.textDark },
  wordRoman: { fontSize: 12, color: brand.orange },
  wordEnglish: { fontSize: 14, color: brand.textMedium, marginRight: 8 },
  audioIcon: { fontSize: 18 },

  primaryBtn: {
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    ...shadows.soft,
  },
  primaryBtnText: { color: brand.onAccent, fontSize: 18, fontFamily: fonts.display },

  phaseTitle: { fontSize: 22, fontFamily: fonts.display, color: brand.blue, textAlign: 'center', marginBottom: 4 },
  phaseTitleCompact: { fontSize: 20, marginBottom: 2 },
  phaseSubtitle: { fontSize: 14, color: brand.textMedium, textAlign: 'center', marginBottom: 20 },
  phaseSubtitleCompact: { marginBottom: 10 },
  listenContent: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  listenContentCompact: { paddingTop: spacing.sm, paddingBottom: 0 },
  listenTopRow: { gap: spacing.md },
  listenTopRowWide: { flexDirection: 'row', alignItems: 'stretch' },
  listenWordCard: { marginBottom: spacing.md, paddingVertical: spacing.xl },
  listenWordCardWide: { flex: 1.08, marginBottom: 0 },
  listenWordCardCompact: { paddingVertical: spacing.lg, marginBottom: spacing.sm },
  srsLabel: { fontSize: 14, fontWeight: '600', color: brand.textDark, textAlign: 'center', marginBottom: 12, marginTop: spacing.md },
  srsLabelCompact: { marginBottom: 8, marginTop: 8 },
  pronunciationCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  pronunciationCardProminent: {
    borderWidth: 3,
    borderColor: brand.borderStrong,
  },
  pronunciationCardWide: {
    flex: 1,
    marginBottom: 0,
    minWidth: 360,
  },
  pronunciationCardCompact: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  pronunciationHeader: {
    marginBottom: spacing.md,
  },
  pronunciationTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.display,
    color: brand.blue,
  },
  pronunciationHint: {
    fontSize: 12,
    lineHeight: 16,
    color: brand.textMedium,
    marginTop: 2,
  },
  pronunciationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pronunciationOrbWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pronunciationRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
  },
  pronunciationRingSecondary: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  pronunciationOrb: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.creamDark,
  },
  pronunciationScore: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fonts.display,
  },
  pronunciationActionCol: {
    flex: 1,
    gap: spacing.sm,
  },
  pronunciationBtn: {
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationBtnText: {
    color: brand.onAccent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.bodyMedium,
  },
  pronunciationBtnSecondary: {
    minHeight: 32,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: brand.blue,
    backgroundColor: brand.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pronunciationBtnSecondaryText: {
    color: brand.textDark,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.bodyMedium,
  },
  pronunciationBtnDisabled: {
    opacity: 0.45,
  },
  pronunciationTranscript: {
    fontSize: 11,
    lineHeight: 15,
    color: brand.textMedium,
    marginTop: spacing.sm,
  },
  pronunciationMeta: {
    marginTop: spacing.xs,
    gap: 2,
  },
  pronunciationMetaLine: {
    fontSize: 11,
    lineHeight: 15,
    color: brand.textMedium,
  },
  waveRow: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  waveBar: {
    width: 8,
    height: 14,
    borderRadius: 3,
    backgroundColor: brand.blue,
  },
  srsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  srsGridWide: { flexWrap: 'nowrap', gap: spacing.sm },
  srsButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    ...shadows.soft,
  },
  srsButtonWide: { width: '24%' },
  srsButtonCompact: { paddingVertical: 8 },
  srsText: { fontSize: 14, fontWeight: '700', color: brand.textDark },
  srsAgain: { backgroundColor: '#FFEBEE', borderColor: brand.error },
  srsHard: { backgroundColor: brand.orangeLight, borderColor: brand.orangeDark },
  srsGood: { backgroundColor: '#E8F5E9', borderColor: brand.success },
  srsEasy: { backgroundColor: brand.blueLight, borderColor: brand.blue },

  bigCard: {
    backgroundColor: brand.white,
    borderRadius: radii.jumbo,
    padding: spacing['3xl'],
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.lift,
  },
  bigCardEmoji: { fontSize: 40, marginBottom: spacing.lg },
  bigCardThai: { fontSize: 48, fontFamily: fonts.display, color: brand.textDark, marginBottom: spacing.xs },
  bigCardThaiCompact: { fontSize: 40 },
  bigCardRoman: { fontSize: 20, marginBottom: spacing.lg },
  bigCardRomanCompact: { fontSize: 18, marginBottom: spacing.md },
  dividerLine: { width: 60, height: 2, backgroundColor: brand.border, marginVertical: spacing.lg },
  bigCardEnglish: { fontSize: 22, color: brand.textMedium },
  bigCardEnglishCompact: { fontSize: 20 },

  quizCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  quizThai: { fontSize: 40, fontFamily: fonts.display, color: brand.textDark, marginBottom: spacing.xs },
  quizRoman: { fontSize: 18, marginBottom: spacing.sm },
  tapHint: { fontSize: 12, color: brand.textLight },
  optionsContainer: { gap: spacing.md },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 2,
    ...shadows.soft,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.white,
  },
  optionRadioFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: { fontSize: 16, color: brand.textDark, marginLeft: 10, flex: 1 },
  optionBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  optionBadgeSuccess: { backgroundColor: '#E8F5E9', borderColor: brand.success },
  optionBadgeError: { backgroundColor: '#FFEBEE', borderColor: brand.error },
  checkMark: { fontSize: 16, color: brand.success, fontWeight: '700' },
  xMark: { fontSize: 16, color: brand.error, fontWeight: '700' },
  pressScale: { transform: [{ scale: 0.985 }] },

  matchGrid: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  matchCol: { flex: 1, gap: spacing.md, alignItems: 'stretch' },
  matchCard: {
    backgroundColor: brand.white,
    borderRadius: radii.lg,
    padding: 14,
    minHeight: 92,
    height: 92,
    width: '100%',
    borderWidth: 2,
    borderColor: brand.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.soft,
  },
  matchCardRight: { backgroundColor: brand.creamDark },
  matchedCard: { backgroundColor: brand.success, borderColor: brand.success },
  matchCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 64 },
  matchDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: brand.blue,
    backgroundColor: brand.white,
  },
  matchDotSelected: { borderColor: brand.orange },
  matchDotMatched: { borderColor: brand.success, backgroundColor: brand.success },
  matchTextBlock: { marginLeft: 10, flex: 1, justifyContent: 'center' },
  matchThai: { fontSize: 18, fontFamily: fonts.display, color: brand.textDark },
  matchRoman: { fontSize: 12, color: brand.orange, marginTop: 2 },
  matchEnglish: { fontSize: 14, color: brand.textDark },
  matchedText: { color: brand.onAccent },

  dialogueStage: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.jumbo,
    borderWidth: 2,
    borderColor: brand.blue,
    backgroundColor: brand.cream,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  dialogueGlowTop: {
    position: 'absolute',
    top: -70,
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.35,
  },
  dialogueGlowBottom: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: brand.blueLight,
    opacity: 0.25,
  },
  dialogueStageContent: { flex: 1 },
  dialogueBubble: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: 18,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  dialogueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dialogueAvatar: {
    width: spacing['4xl'],
    height: spacing['4xl'],
    borderRadius: radii.lg,
    backgroundColor: brand.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brand.blue,
  },
  dialogueAvatarEmoji: { fontSize: 18 },
  dialogueHeaderText: { marginLeft: 10, flex: 1 },
  dialogueSpeaker: { fontSize: 14, fontFamily: fonts.display, color: brand.blue },
  dialogueSpeakerThai: { fontSize: 12, color: brand.textMedium, marginTop: 2 },
  dialogueTag: {
    backgroundColor: brand.orangeLight,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: brand.orangeDark,
  },
  dialogueTagText: { fontSize: 10, fontWeight: '700', color: brand.textDark },
  dialogueThai: { fontSize: 28, fontFamily: fonts.display, color: brand.textDark, marginBottom: spacing.xs },
  dialogueRoman: { fontSize: 16, marginBottom: spacing.xs },
  dialogueEnglish: { fontSize: 16, color: brand.textMedium, marginBottom: spacing.sm },
  responseLabel: { fontSize: 14, fontWeight: '600', color: brand.blue, marginBottom: spacing.md },
  dialogueOptions: { gap: 10 },
  dialogueOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radii.xl,
    borderWidth: 2,
    ...shadows.soft,
  },
  dialogueOptionLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  dialogueOptionText: { marginLeft: 10, flex: 1 },
  dialogueOptThai: { fontSize: 18, fontFamily: fonts.display, color: brand.textDark },
  dialogueOptRoman: { fontSize: 12, color: brand.orange, marginTop: 2 },
  dialogueOptEnglish: { fontSize: 14, color: brand.textMedium, marginTop: 6 },

  completeHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderWidth: 2,
    ...shadows.soft,
  },
  completeEmoji: { fontSize: 36 },
  completeContent: { flex: 1, alignItems: 'center', paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'] },
  completeTitle: { fontSize: 28, fontFamily: fonts.display, color: brand.textDark, marginBottom: spacing.lg },
  starsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
  star: { fontSize: 40 },
  starFilled: { color: brand.gold },
  starEmpty: { color: brand.border },
  scoreCard: { backgroundColor: brand.white, borderRadius: radii.xl, padding: spacing.xl, width: '100%', marginBottom: spacing['2xl'], borderWidth: 2, borderColor: brand.border, ...shadows.soft },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  scoreLabel: { fontSize: 16, color: brand.textMedium },
  scoreValue: { fontSize: 16, fontWeight: '700', color: brand.textDark },
  sessionCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xl,
    padding: 18,
    width: '100%',
    marginBottom: spacing['2xl'],
    borderWidth: 2,
    borderColor: brand.border,
    ...shadows.soft,
  },
  sessionTitle: { fontSize: 14, fontFamily: fonts.display, color: brand.textDark, marginBottom: spacing.sm },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sessionRowLeft: { flexDirection: 'row', alignItems: 'center' },
  sessionIcon: { fontSize: 14, marginRight: spacing.sm },
  sessionLabel: { fontSize: 13, color: brand.textMedium },
  sessionValue: { fontSize: 13, fontWeight: '700', color: brand.textDark },
});
