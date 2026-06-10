import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { WeatherSummary } from "../lib/types";
import { colors, radius, spacing } from "../theme";

function dayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function WeatherStrip({ weather }: { weather: WeatherSummary }) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {weather.days.map((d) => (
          <View key={d.date} style={styles.day}>
            <Text style={styles.dayLabel}>{dayLabel(d.date)}</Text>
            <Text style={styles.temp}>{d.tempMaxF}°</Text>
            <Text style={styles.tempLow}>{d.tempMinF}°</Text>
            <Text style={styles.rain}>{d.precipProbability > 30 ? `💧${d.precipProbability}%` : " "}</Text>
          </View>
        ))}
      </ScrollView>
      {weather.source === "fallback" && (
        <Text style={styles.fallbackNote}>Weather data unavailable — showing seasonal estimates.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing(2) },
  day: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    alignItems: "center",
    minWidth: 64,
  },
  dayLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  temp: { fontSize: 17, fontWeight: "700", color: colors.text },
  tempLow: { fontSize: 13, color: colors.textSecondary },
  rain: { fontSize: 11, color: colors.textSecondary },
  fallbackNote: { fontSize: 12, color: colors.accent, marginTop: spacing(1) },
});
