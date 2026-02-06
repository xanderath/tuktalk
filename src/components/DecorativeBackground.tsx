import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Percent = `${number}%`;

type PositionedDot = {
  top: Percent;
  left?: Percent;
  right?: Percent;
  size: number;
  color: string;
  opacity: number;
};

type PositionedStar = {
  top: Percent;
  left?: Percent;
  right?: Percent;
  size: number;
  color: string;
  char: string;
};

type SkylineBar = {
  left: Percent;
  width: number;
  height: number;
  color: string;
};

export function DecorativeBackground() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors);

  const sprinkles: PositionedDot[] = isDark
    ? [
        { top: '10%', left: '6%', size: 5, color: colors.orangeLight, opacity: 0.6 },
        { top: '20%', right: '12%', size: 6, color: colors.purple, opacity: 0.6 },
        { top: '32%', left: '16%', size: 4, color: colors.gold, opacity: 0.5 },
        { top: '46%', right: '10%', size: 5, color: colors.mint, opacity: 0.55 },
        { top: '64%', left: '12%', size: 6, color: colors.orange, opacity: 0.55 },
        { top: '78%', right: '14%', size: 4, color: colors.blueLight, opacity: 0.55 },
      ]
    : [
        { top: '8%', left: '6%', size: 6, color: colors.gold, opacity: 0.6 },
        { top: '14%', right: '12%', size: 5, color: colors.orangeLight, opacity: 0.6 },
        { top: '22%', left: '18%', size: 4, color: colors.blueLight, opacity: 0.5 },
        { top: '30%', right: '8%', size: 6, color: colors.peach, opacity: 0.55 },
        { top: '46%', left: '10%', size: 5, color: colors.mint, opacity: 0.45 },
        { top: '60%', right: '16%', size: 4, color: colors.gold, opacity: 0.55 },
        { top: '72%', left: '14%', size: 6, color: colors.orangeLight, opacity: 0.55 },
        { top: '84%', right: '10%', size: 5, color: colors.blueLight, opacity: 0.5 },
      ];

  const stars: PositionedStar[] = isDark
    ? [
        { top: '8%', right: '18%', size: 14, color: colors.orangeLight, char: '✦' },
        { top: '16%', left: '26%', size: 10, color: colors.gold, char: '✧' },
        { top: '30%', right: '10%', size: 12, color: colors.purple, char: '✦' },
        { top: '48%', left: '12%', size: 10, color: colors.mint, char: '✧' },
        { top: '66%', right: '18%', size: 12, color: colors.orange, char: '✦' },
        { top: '78%', left: '22%', size: 10, color: colors.blueLight, char: '+' },
      ]
    : [
        { top: '10%', right: '26%', size: 12, color: colors.orange, char: '✦' },
        { top: '18%', left: '28%', size: 9, color: colors.blue, char: '+' },
        { top: '34%', right: '10%', size: 10, color: colors.coral, char: '✦' },
        { top: '52%', left: '12%', size: 9, color: colors.gold, char: '✧' },
        { top: '68%', right: '22%', size: 11, color: colors.purple, char: '✦' },
        { top: '78%', left: '26%', size: 10, color: colors.orangeDark, char: '+' },
      ];

  const skylineBars: SkylineBar[] = isDark
    ? [
        { left: '4%', width: 18, height: 20, color: colors.purple },
        { left: '10%', width: 22, height: 28, color: colors.blue },
        { left: '17%', width: 14, height: 16, color: colors.coral },
        { left: '24%', width: 24, height: 34, color: colors.orange },
        { left: '33%', width: 16, height: 22, color: colors.gold },
        { left: '40%', width: 20, height: 30, color: colors.purple },
        { left: '48%', width: 14, height: 18, color: colors.blue },
        { left: '56%', width: 24, height: 36, color: colors.coral },
        { left: '66%', width: 18, height: 24, color: colors.orange },
        { left: '74%', width: 22, height: 32, color: colors.purple },
        { left: '84%', width: 16, height: 20, color: colors.gold },
        { left: '90%', width: 12, height: 16, color: colors.blue },
      ]
    : [];

  const tropicalLeaves = !isDark
    ? [
        { bottom: 122, left: -16, size: 84, color: colors.mint, rotate: '-20deg' },
        { bottom: 90, left: 18, size: 68, color: colors.blueLight, rotate: '14deg' },
        { bottom: 118, right: -20, size: 86, color: colors.orangeLight, rotate: '18deg' },
        { bottom: 86, right: 20, size: 70, color: colors.peach, rotate: '-12deg' },
      ]
    : [];

  return (
    <View style={[StyleSheet.absoluteFill, styles.noPointer]}>
      <View
        style={[
          styles.orb,
          styles.orbTop,
          { backgroundColor: isDark ? colors.purple : colors.orangeLight },
        ]}
      />
      <View
        style={[
          styles.orb,
          styles.orbBottom,
          { backgroundColor: isDark ? colors.blue : colors.blueLight },
        ]}
      />
      <View
        style={[
          styles.orb,
          styles.orbSide,
          { backgroundColor: isDark ? colors.orangeLight : colors.peach },
        ]}
      />
      {sprinkles.map((dot, index) => (
        <View
          key={`sprinkle-${index}`}
          style={[
            styles.sprinkle,
            {
              top: dot.top,
              left: dot.left,
              right: dot.right,
              width: dot.size,
              height: dot.size,
              backgroundColor: dot.color,
              opacity: dot.opacity,
            },
          ]}
        />
      ))}
      {stars.map((star, index) => (
        <Text
          key={`star-${index}`}
          style={[
            styles.star,
            {
              top: star.top,
              left: star.left,
              right: star.right,
              color: star.color,
              fontSize: star.size,
            },
          ]}
        >
          {star.char}
        </Text>
      ))}
      {tropicalLeaves.map((leaf, index) => (
        <View
          key={`leaf-${index}`}
          style={[
            styles.leaf,
            {
              bottom: leaf.bottom,
              left: leaf.left,
              right: leaf.right,
              width: leaf.size,
              height: leaf.size,
              backgroundColor: leaf.color,
              transform: [{ rotate: leaf.rotate }],
            },
          ]}
        />
      ))}
      {isDark && <View style={styles.skylineBase} />}
      {skylineBars.map((bar, index) => (
        <View
          key={`skyline-${index}`}
          style={[
            styles.skylineBar,
            {
              left: bar.left,
              width: bar.width,
              height: bar.height,
              backgroundColor: bar.color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const createStyles = (brand: any) => StyleSheet.create({
  noPointer: {
    pointerEvents: 'none',
  },
  orb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.24,
  },
  orbTop: {
    top: -120,
    right: -70,
    backgroundColor: brand.orangeLight,
  },
  orbBottom: {
    bottom: -150,
    left: -70,
    backgroundColor: brand.blueLight,
  },
  orbSide: {
    top: 180,
    left: -160,
    backgroundColor: brand.peach,
  },
  sprinkle: {
    position: 'absolute',
    borderRadius: 4,
  },
  star: {
    position: 'absolute',
    opacity: 0.6,
  },
  leaf: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.26,
  },
  skylineBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 62,
    backgroundColor: brand.creamDeep,
    opacity: 0.55,
  },
  skylineBar: {
    position: 'absolute',
    bottom: 22,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    opacity: 0.7,
  },
});
