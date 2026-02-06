import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevel01Definition } from './level01_airport';
import { createLevel02Definition } from './level02_tuktuk';
import { createLevel03Definition } from './level03_street_food';
import { createLevel04Definition } from './level04_seven';
import { createLevel05Definition } from './level05_lobby';
import { createLevel06Definition } from './level06_coffee';
import { createLevel07Definition } from './level07_wifi';
import { createLevel08Definition } from './level08_try_buy';
import { createLevel09Definition } from './level09_pressure';
import { createLevel10Definition } from './level10_bill';
import { createLevel11Definition } from './level11_wash';
import { createLevel12Definition } from './level12_symptom';
import { createLevel13Definition } from './level13_style';
import { createLevel14Definition } from './level14_fitness';
import { createLevel15Definition } from './level15_form';
import { createLevel16Definition } from './level16_answer';
import { createLevel17Definition } from './level17_proposal';
import { createLevel18Definition } from './level18_table';
import { createLevel19Definition } from './level19_signal';
import { createLevel20Definition } from './level20_inbox';
import { createLevel21Definition } from './level21_platform';
import { createLevel22Definition } from './level22_safety';
import { createLevel23Definition } from './level23_ranger';
import { createLevel24Definition } from './level24_bargain';
import { createLevel25Definition } from './level25_reef';
import { createLevel26Definition } from './level26_merit';
import { createLevel27Definition } from './level27_wok';
import { createLevel28Definition } from './level28_muay';
import { createLevel29Definition } from './level29_festival';
import { createLevel30Definition } from './level30_friends';

export type LevelDefinitionBuilder = (vocab: VocabItem[]) => MiniGameDefinition;

export const levelDefinitionBuilders: Record<number, LevelDefinitionBuilder> = {
  1: createLevel01Definition,
  2: createLevel02Definition,
  3: createLevel03Definition,
  4: createLevel04Definition,
  5: createLevel05Definition,
  6: createLevel06Definition,
  7: createLevel07Definition,
  8: createLevel08Definition,
  9: createLevel09Definition,
  10: createLevel10Definition,
  11: createLevel11Definition,
  12: createLevel12Definition,
  13: createLevel13Definition,
  14: createLevel14Definition,
  15: createLevel15Definition,
  16: createLevel16Definition,
  17: createLevel17Definition,
  18: createLevel18Definition,
  19: createLevel19Definition,
  20: createLevel20Definition,
  21: createLevel21Definition,
  22: createLevel22Definition,
  23: createLevel23Definition,
  24: createLevel24Definition,
  25: createLevel25Definition,
  26: createLevel26Definition,
  27: createLevel27Definition,
  28: createLevel28Definition,
  29: createLevel29Definition,
  30: createLevel30Definition,
};

export const getLevelDefinitionBuilder = (levelId: number): LevelDefinitionBuilder | null =>
  levelDefinitionBuilders[levelId] ?? null;

export const levelGameTitles: Record<number, string> = {
  1: 'Passport Panic',
  2: 'TukTuk Run: Monitor Lizard Escape',
  3: 'Spice Survivor',
  4: 'Seven Shift',
  5: 'Lobby Logic',
  6: 'Sweetness Chaos',
  7: 'WiFi Wars',
  8: 'Try & Buy',
  9: 'Pressure Balance',
  10: 'Bill Breaker',
  11: 'Wash Quest',
  12: 'Symptom Match',
  13: 'Style Matcher',
  14: 'Fitness Flow',
  15: 'Form Frenzy',
  16: 'Answer Confidence',
  17: 'Proposal Stack',
  18: 'Table Manners',
  19: 'Signal Panic',
  20: 'Inbox Attack',
  21: 'Platform Puzzle',
  22: 'Safety Surf',
  23: 'Ranger Sort',
  24: 'Bargain Battle',
  25: 'Reef Explorer',
  26: 'Merit Flow',
  27: 'Wok Master',
  28: 'Muay Combo',
  29: 'Festival Flow',
  30: 'Social Links',
};
