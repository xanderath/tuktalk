// KamJai theme stub (copy into your Flutter project and wire up).
// Colors match 03_tokens/design_tokens.json (tweak as needed).
import 'package:flutter/material.dart';

class KamJaiTheme {
  static const indigo = Color(0xFF1B2A6B);
  static const saffron = Color(0xFFFF8A00);
  static const gold = Color(0xFFF7C948);

  static ThemeData light() => ThemeData(
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(seedColor: saffron, brightness: Brightness.light),
    scaffoldBackgroundColor: const Color(0xFFFFF7EE),
    useMaterial3: true,
  );

  static ThemeData darkNeon() => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: const Color(0xFF0B0614),
    useMaterial3: true,
  );
}
