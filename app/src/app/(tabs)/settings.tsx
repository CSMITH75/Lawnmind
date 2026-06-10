import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Body, Button, Card, Screen, Subtitle, Title } from "@/components/ui";
import * as api from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme";

export default function SettingsScreen() {
  const { resetAll, refreshPlan } = useAppState();
  const [chatMode, setChatMode] = useState<string>("checking…");

  useEffect(() => {
    void api.health().then((h) => {
      if (h.chatMode === "claude") setChatMode("Claude (live)");
      else if (h.chatMode === "mock") setChatMode("Demo mode (server up, no API key)");
      else setChatMode("Standalone demo (API server not running)");
    });
  }, []);

  return (
    <Screen>
      <Title>Settings</Title>

      <Card>
        <Subtitle>AI agent</Subtitle>
        <Body muted>Chat mode: {chatMode}</Body>
        <Text style={styles.hint}>
          Set ANTHROPIC_API_KEY on the API server to enable live Claude responses. The key never
          ships in this app.
        </Text>
      </Card>

      <Card>
        <Subtitle>Plan</Subtitle>
        <Button label="Regenerate this week's plan" variant="secondary" onPress={refreshPlan} />
      </Card>

      <Card>
        <Subtitle>Profile</Subtitle>
        <Body muted>Re-run onboarding to change your lawn profile.</Body>
        <Button
          label="Reset profile & start over"
          variant="secondary"
          onPress={async () => {
            await resetAll();
            router.replace("/onboarding");
          }}
        />
      </Card>

      <Card>
        <Subtitle>About</Subtitle>
        <Body muted>LawnMind v0.1 — weekly plans, AI chat, and product picks. Notifications, photo diagnosis, and Pro subscriptions arrive in Phase 2.</Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
});
