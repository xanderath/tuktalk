import { Platform } from 'react-native';
import { spacing, radii, typeScale, iconSize, layout } from './tokens';

export const lightBrand = {
  cream: '#FFF8E9',
  creamDark: '#FFE7B8',
  creamDeep: '#FFD591',
  white: '#FFFDF7',

  ink: '#1A2A54',
  inkLight: '#315FAE',
  textDark: '#1A2A54',
  textMedium: '#315FAE',
  textLight: '#5A7EC6',

  orange: '#FF9C2A',
  orangeLight: '#FFC95A',
  orangeDark: '#E06A00',
  peach: '#FFD8A6',
  blue: '#2455B8',
  blueLight: '#CFE5FF',
  mint: '#2ACF9C',
  gold: '#FFD45A',
  coral: '#FF6A5F',
  purple: '#4B5EC9',

  success: '#1CB985',
  error: '#E54F61',

  border: '#E7C37D',
  borderStrong: '#C47A1A',
  shadow: 'rgba(34, 55, 107, 0.23)',
  onAccent: '#FFFFFF',
};

export const darkBrand = {
  cream: '#050817',
  creamDark: '#0B1230',
  creamDeep: '#151E47',
  white: '#121C43',

  ink: '#FDF7FF',
  inkLight: '#8AE2FF',
  textDark: '#FDF7FF',
  textMedium: '#A6D9FF',
  textLight: '#7CB5F0',

  orange: '#FF9A2F',
  orangeLight: '#FF4FCB',
  orangeDark: '#FFB14A',
  peach: '#20153D',
  blue: '#4CD1FF',
  blueLight: '#1B2B67',
  mint: '#8DFF5A',
  gold: '#FFD84E',
  coral: '#FF5DAA',
  purple: '#A468FF',

  success: '#8DFF5A',
  error: '#FF637A',

  border: '#314A96',
  borderStrong: '#FF4FCB',
  shadow: 'rgba(129, 85, 255, 0.48)',
  onAccent: '#FFF9FF',
};

export type BrandColors = typeof lightBrand;

export const brand = lightBrand;

const displayFont = 'Mitr_600SemiBold';

const bodyFont = 'Sarabun_400Regular';

const bodyMediumFont = 'Sarabun_700Bold';

export const fonts = {
  display: displayFont,
  body: bodyFont,
  bodyMedium: bodyMediumFont,
};

const makeShadow = (
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
  shadowRgb: string,
  shadowColor: string
) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${y}px ${blur}px rgba(${shadowRgb}, ${opacity})`,
    };
  }
  return {
    shadowColor,
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
};

export const createShadows = (shadowRgb: string, shadowColor: string) => ({
  soft: makeShadow(4, 6, 0.18, 3, shadowRgb, shadowColor),
  lift: makeShadow(6, 10, 0.2, 4, shadowRgb, shadowColor),
});

export const shadows = createShadows('27, 42, 107', lightBrand.shadow);

export interface LevelTheme {
  id: number;
  name: string;
  emoji: string;
  description: string;
  primary: string;
  primaryLight: string;
  headerGradient: [string, string];
  cardBorder: string;
  sceneEmojis: string[];
}

export const levelThemes: Record<number, LevelTheme> = {
  1: {
    id: 1,
    name: 'Airport Arrival',
    emoji: '✈️',
    description: 'Navigate customs and find your way',
    primary: '#4A6FB3',
    primaryLight: '#CFE1FF',
    headerGradient: ['#8CB4E2', '#CFE1FF'],
    cardBorder: '#4A6FB3',
    sceneEmojis: ['✈️', '🧳', '🛂', '🌴'],
  },
  2: {
    id: 2,
    name: 'TukTuk Ride',
    emoji: '🛺',
    description: 'Negotiate your first ride through Bangkok',
    primary: '#F6A03A',
    primaryLight: '#FFE3C1',
    headerGradient: ['#FFD59A', '#FFE3C1'],
    cardBorder: '#F6A03A',
    sceneEmojis: ['🛺', '🌆', '🚦', '🌙'],
  },
  3: {
    id: 3,
    name: 'Street Food Stall',
    emoji: '🍜',
    description: 'Order delicious Thai street food',
    primary: '#E08B47',
    primaryLight: '#FFD9B6',
    headerGradient: ['#FFC08C', '#FFD9B6'],
    cardBorder: '#E08B47',
    sceneEmojis: ['🍜', '🥢', '🔥', '🌶️'],
  },
  4: {
    id: 4,
    name: 'Convenience Store',
    emoji: '🏪',
    description: 'Quick stops and everyday essentials',
    primary: '#6BCB77',
    primaryLight: '#CFEFD4',
    headerGradient: ['#AEE5B6', '#CFEFD4'],
    cardBorder: '#6BCB77',
    sceneEmojis: ['🏪', '🥤', '🍙', '💳'],
  },
  5: {
    id: 5,
    name: 'Hotel Check-In',
    emoji: '🏨',
    description: 'Book your room with confidence',
    primary: '#8E6AD6',
    primaryLight: '#E6D9FF',
    headerGradient: ['#C2A9F2', '#E6D9FF'],
    cardBorder: '#8E6AD6',
    sceneEmojis: ['🏨', '🛏️', '🔑', '🌺'],
  },
  6: {
    id: 6,
    name: 'Coffee Shop',
    emoji: '☕',
    description: 'Order your perfect Thai coffee',
    primary: '#B57B2A',
    primaryLight: '#F3D2A4',
    headerGradient: ['#E7B774', '#F3D2A4'],
    cardBorder: '#B57B2A',
    sceneEmojis: ['☕', '🧋', '🥐', '📖'],
  },
  7: {
    id: 7,
    name: 'Coworking Space',
    emoji: '💻',
    description: 'Network with digital nomads',
    primary: '#4ECDC4',
    primaryLight: '#BFF1EC',
    headerGradient: ['#87E5DD', '#BFF1EC'],
    cardBorder: '#4ECDC4',
    sceneEmojis: ['💻', '📱', '🎧', '🌿'],
  },
  8: {
    id: 8,
    name: 'Weekend Market',
    emoji: '🛍️',
    description: 'Haggle like a local at Chatuchak',
    primary: '#F26D5B',
    primaryLight: '#FFD3C9',
    headerGradient: ['#FFB2A6', '#FFD3C9'],
    cardBorder: '#F26D5B',
    sceneEmojis: ['🛍️', '👕', '🎨', '🥥'],
  },
  9: {
    id: 9,
    name: 'Yoga Studio',
    emoji: '🧘',
    description: 'Find your zen in Thai',
    primary: '#7CBE8E',
    primaryLight: '#D3F0DC',
    headerGradient: ['#AEE2BC', '#D3F0DC'],
    cardBorder: '#7CBE8E',
    sceneEmojis: ['🧘', '🪷', '✨', '🕯️'],
  },
  10: {
    id: 10,
    name: 'Rooftop Bar',
    emoji: '🌃',
    description: 'Toast to Bangkok nights',
    primary: '#2C3150',
    primaryLight: '#C9CDE0',
    headerGradient: ['#7B84A8', '#C9CDE0'],
    cardBorder: '#2C3150',
    sceneEmojis: ['🌃', '🍸', '🌙', '✨'],
  },
};

export { spacing, radii, typeScale, iconSize, layout };

export const defaultTheme: LevelTheme = {
  id: 0,
  name: 'KamJai',
  emoji: '🇹🇭',
  description: 'Learn Thai with heart',
  primary: '#F6A03A',
  primaryLight: '#FFE3C1',
  headerGradient: ['#FFD59A', '#FFE3C1'],
  cardBorder: '#F6A03A',
  sceneEmojis: ['🇹🇭', '🙏', '💛', '✨'],
};

export function getTheme(levelId: number): LevelTheme {
  return levelThemes[levelId] || defaultTheme;
}
