import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HealthGauge } from "@/components/health-gauge";
import { TaskCard } from "@/components/task-card";
import { Body, Card, Screen, Subtitle, Title } from "@/components/ui";
import { WeatherStrip } from "@/components/weather-strip";
import { useAppState } from "@/lib/app-state";
import { colors, radius, spacing } from "@/theme";

export default function HomeScreen() {
  const { plan, planStale, completedTaskIds, completeTask } = useAppState();

  if (!plan) {
    return (
      <Screen>
        <Title>🌿 LawnMind</Title>
        <Card>
          <Body muted>Generating your weekly plan…</Body>
        </Card>
      </Screen>
    );
  }

  const completedCount = plan.tasks.filter((t) => completedTaskIds.includes(t.id)).length;

  return (
    <Screen>
      <Title>{plan.weekLabel}</Title>
      <Card style={styles.banner}>
        <Body>{plan.weatherBanner}</Body>
        {planStale && (
          <Text style={styles.staleNote}>Offline — showing your last saved plan.</Text>
        )}
      </Card>

      <HealthGauge
        score={Math.min(10, plan.healthScore + completedCount)}
        trend={completedCount > 0 ? "up" : plan.healthTrend}
      />

      <Subtitle>
        This week's tasks ({completedCount}/{plan.tasks.length} done)
      </Subtitle>
      {plan.tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          completed={completedTaskIds.includes(task.id)}
          onComplete={() => completeTask(task.id, task.title)}
        />
      ))}

      <Subtitle>7-day outlook</Subtitle>
      <WeatherStrip weather={plan.weather} />

      <Pressable
        style={styles.askBar}
        accessibilityRole="button"
        onPress={() => router.push("/(tabs)/ask")}>
        <Text style={styles.askText}>Ask anything about your lawn…</Text>
      </Pressable>
      <View style={{ height: spacing(4) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.surfaceMuted },
  staleNote: { color: colors.accent, fontSize: 12 },
  askBar: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 999,
    padding: spacing(3.5),
  },
  askText: { color: colors.textSecondary, fontSize: 15 },
});
