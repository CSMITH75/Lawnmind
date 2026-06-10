import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Body, Button, Card, Chip, Screen, Subtitle, Title } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import type { LawnCondition, LawnSizeCategory, PrimaryGoal } from "@/lib/types";
import { coordsForZip, grassOptionsForLat, zoneLabelForLat } from "@/lib/zip-geo";
import { colors, radius, spacing } from "@/theme";

const SIZES: { value: LawnSizeCategory; label: string }[] = [
  { value: "small", label: "Small (<2,000 sq ft)" },
  { value: "medium", label: "Medium (2k–8k sq ft)" },
  { value: "large", label: "Large (8k+ sq ft)" },
];

const CONDITIONS: { value: LawnCondition; label: string }[] = [
  { value: "beautiful", label: "Beautiful" },
  { value: "pretty_good", label: "Pretty good" },
  { value: "needs_work", label: "Needs work" },
  { value: "total_mess", label: "Total mess" },
];

const GOALS: { value: PrimaryGoal; label: string }[] = [
  { value: "keep_green", label: "Keep it green" },
  { value: "fix_regrow", label: "Fix and regrow" },
  { value: "stop_weeds", label: "Stop weeds" },
  { value: "low_maintenance", label: "Low-maintenance" },
];

export default function Onboarding() {
  const { saveProfile } = useAppState();
  const [step, setStep] = useState(1);
  const [zip, setZip] = useState("");
  const [size, setSize] = useState<LawnSizeCategory | null>(null);
  const [condition, setCondition] = useState<LawnCondition | null>(null);
  const [goal, setGoal] = useState<PrimaryGoal | null>(null);
  const [grass, setGrass] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const zipValid = /^\d{5}$/.test(zip);
  const coords = useMemo(() => (zipValid ? coordsForZip(zip) : null), [zip, zipValid]);
  const grassOptions = coords ? grassOptionsForLat(coords.lat) : [];

  async function finish() {
    if (!coords || !size || !condition || !goal || !grass) return;
    setGenerating(true);
    await saveProfile({
      zipCode: zip,
      lat: coords.lat,
      lng: coords.lng,
      grassType: grass === "Not sure" ? "Unknown (agent will infer)" : grass,
      lawnSizeCategory: size,
      condition,
      primaryGoal: goal,
    });
    router.replace("/(tabs)");
  }

  return (
    <Screen>
      <Title>🌿 LawnMind</Title>
      <Body muted>Step {step} of 4 — under 90 seconds, promise.</Body>

      {step === 1 && (
        <Card>
          <Subtitle>Where's your lawn?</Subtitle>
          <Body muted>We use your ZIP to detect your climate zone and local weather.</Body>
          <TextInput
            value={zip}
            onChangeText={(t) => setZip(t.replace(/\D/g, "").slice(0, 5))}
            placeholder="ZIP code"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={5}
          />
          {coords && (
            <View style={styles.zoneBox}>
              <Text style={styles.zoneText}>
                Detected: {zoneLabelForLat(coords.lat)} ✓
              </Text>
            </View>
          )}
          <Button label="Next" onPress={() => setStep(2)} disabled={!zipValid} />
        </Card>
      )}

      {step === 2 && (
        <Card>
          <Subtitle>Quick lawn snapshot</Subtitle>
          <Body muted>Approximate size</Body>
          <View style={styles.chipRow}>
            {SIZES.map((s) => (
              <Chip key={s.value} label={s.label} selected={size === s.value} onPress={() => setSize(s.value)} />
            ))}
          </View>
          <Body muted>Current condition</Body>
          <View style={styles.chipRow}>
            {CONDITIONS.map((c) => (
              <Chip key={c.value} label={c.label} selected={condition === c.value} onPress={() => setCondition(c.value)} />
            ))}
          </View>
          <Body muted>Primary goal</Body>
          <View style={styles.chipRow}>
            {GOALS.map((g) => (
              <Chip key={g.value} label={g.label} selected={goal === g.value} onPress={() => setGoal(g.value)} />
            ))}
          </View>
          <Button label="Next" onPress={() => setStep(3)} disabled={!size || !condition || !goal} />
        </Card>
      )}

      {step === 3 && (
        <Card>
          <Subtitle>What grass do you have?</Subtitle>
          <Body muted>Common types for your zone — pick "Not sure" and we'll infer it.</Body>
          <View style={styles.chipRow}>
            {grassOptions.map((g) => (
              <Chip key={g} label={g} selected={grass === g} onPress={() => setGrass(g)} />
            ))}
          </View>
          <Button label="Next" onPress={() => setStep(4)} disabled={!grass} />
        </Card>
      )}

      {step === 4 && (
        <Card>
          <Subtitle>Ready for your first plan</Subtitle>
          <Body muted>
            We'll combine your {zoneLabelForLat(coords?.lat ?? 40).toLowerCase()}, this week's
            forecast, and your goal to build Week 1.
          </Body>
          {generating ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Button label="Generate my first plan 🎉" onPress={finish} />
          )}
        </Card>
      )}

      {step > 1 && !generating && (
        <Button label="Back" variant="ghost" onPress={() => setStep((s) => s - 1)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing(3),
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  zoneBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing(3),
  },
  zoneText: { color: colors.primaryDark, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
});
