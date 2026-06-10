import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Body, Card, Screen, Subtitle, Title } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { zoneLabelForLat } from "@/lib/zip-geo";
import { colors, spacing } from "@/theme";

const LABELS: Record<string, string> = {
  small: "Small (<2,000 sq ft)",
  medium: "Medium (2k–8k sq ft)",
  large: "Large (8k+ sq ft)",
  beautiful: "Beautiful",
  pretty_good: "Pretty good",
  needs_work: "Needs work",
  total_mess: "Total mess",
  keep_green: "Keep it green",
  fix_regrow: "Fix and regrow",
  stop_weeds: "Stop weeds",
  low_maintenance: "Low-maintenance",
};

export default function LawnScreen() {
  const { profile, treatmentHistory } = useAppState();

  return (
    <Screen>
      <Title>My Lawn</Title>

      {profile && (
        <Card>
          <Subtitle>Profile</Subtitle>
          <Row label="Grass type" value={profile.grassType} />
          <Row label="Size" value={LABELS[profile.lawnSizeCategory] ?? profile.lawnSizeCategory} />
          <Row label="Condition" value={LABELS[profile.condition] ?? profile.condition} />
          <Row label="Goal" value={LABELS[profile.primaryGoal] ?? profile.primaryGoal} />
          <Row label="Climate zone" value={zoneLabelForLat(profile.lat)} />
          <Row label="ZIP" value={profile.zipCode} />
        </Card>
      )}

      <Subtitle>Treatment history</Subtitle>
      {treatmentHistory.length === 0 ? (
        <Card>
          <Body muted>
            Nothing logged yet — completed tasks land here automatically, and the agent uses them
            to avoid repeating recommendations.
          </Body>
        </Card>
      ) : (
        treatmentHistory.map((record, i) => (
          <Card key={`${record.taskId}-${i}`}>
            <Body>{record.title}</Body>
            <Text style={styles.date}>
              {new Date(record.completedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing(1.5),
    gap: spacing(3),
  },
  rowLabel: { color: colors.textSecondary, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  date: { color: colors.textSecondary, fontSize: 12 },
});
