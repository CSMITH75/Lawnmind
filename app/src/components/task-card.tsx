import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { affiliateUrl } from "../lib/api";
import type { PlanTask, TaskPriority } from "../lib/types";
import { colors, radius, spacing } from "../theme";
import { Body, Button, Card } from "./ui";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: "Urgent",
  this_week: "This week",
  optional: "Optional",
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: colors.urgent,
  this_week: colors.thisWeek,
  optional: colors.optional,
};

export function TaskCard({
  task,
  completed,
  onComplete,
}: {
  task: PlanTask;
  completed: boolean;
  onComplete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={completed ? styles.completedCard : undefined}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: PRIORITY_COLOR[task.priority] }]}>
          <Text style={styles.badgeLabel}>{PRIORITY_LABEL[task.priority]}</Text>
        </View>
        <Text style={styles.time}>~{task.estimatedMinutes} min</Text>
      </View>

      <Text style={[styles.taskTitle, completed && styles.completedText]}>{task.title}</Text>
      <Body muted>{task.rationale}</Body>

      <Pressable onPress={() => setExpanded((e) => !e)} accessibilityRole="button">
        <Text style={styles.expandLink}>{expanded ? "Hide details" : "Why & how"}</Text>
      </Pressable>
      {expanded && <Body>{task.deepDive}</Body>}

      {task.product && (
        <Pressable
          onPress={() => Linking.openURL(affiliateUrl(task.product!.productId))}
          accessibilityRole="link"
          style={styles.productChip}>
          <Text style={styles.productLabel}>🛒 {task.product.name}</Text>
          <Text style={styles.sponsoredTag}>affiliate link</Text>
        </Pressable>
      )}

      {completed ? (
        <Text style={styles.doneLabel}>✓ Done — nice work</Text>
      ) : (
        <Button label="Mark complete" onPress={onComplete} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  completedCard: { opacity: 0.75 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  badgeLabel: { color: colors.white, fontSize: 12, fontWeight: "700" },
  time: { color: colors.textSecondary, fontSize: 13 },
  taskTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  completedText: { textDecorationLine: "line-through" },
  expandLink: { color: colors.primaryDark, fontWeight: "600", fontSize: 14 },
  productChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing(3),
  },
  productLabel: { color: colors.text, fontSize: 14, flexShrink: 1 },
  sponsoredTag: { color: colors.textSecondary, fontSize: 11, fontStyle: "italic" },
  doneLabel: { color: colors.primaryDark, fontWeight: "700", fontSize: 15 },
});
