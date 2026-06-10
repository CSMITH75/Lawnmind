import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

export function HealthGauge({
  score,
  trend,
}: {
  score: number;
  trend: "up" | "flat" | "down";
}) {
  const arrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "▶";
  const pct = Math.max(0, Math.min(10, score)) * 10;
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Lawn health</Text>
        <Text style={styles.score}>
          {score}/10 <Text style={styles.trend}>{arrow}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing(1.5) },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },
  score: { fontSize: 14, fontWeight: "700", color: colors.text },
  trend: { color: colors.primary },
  track: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.sm },
});
