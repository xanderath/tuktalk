// Dialogue interfaces only. Dialogue content is stored in Supabase (public.dialogues).

export interface DialogueOption {
  thai: string;
  roman: string;
  english: string;
}

export interface Dialogue {
  speaker: string;
  speakerThai: string;
  emoji: string;
  thai: string;
  roman: string;
  english: string;
  correct: string;
  options: DialogueOption[];
}
