import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip } from "@/components/ui";
import * as api from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors, radius, spacing } from "@/theme";

const SUGGESTED_PROMPTS = [
  "Why is my lawn slow to green up?",
  "Should I aerate before or after rain?",
  "What's causing brown rings?",
];

export default function AskScreen() {
  const { profile, chatHistory, appendChat } = useAppState();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function send(message: string) {
    const text = message.trim();
    if (!text || sending) return;
    setDraft("");
    setError(null);
    setSending(true);
    appendChat([{ role: "user", content: text }]);
    try {
      const result = await api.sendChat(text, chatHistory.slice(-10), profile ?? undefined);
      appendChat([{ role: "assistant", content: result.response }]);
    } catch {
      setError("Couldn't reach LawnMind — check your connection and try again.");
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          <Text style={styles.header}>Ask LawnMind</Text>
          {chatHistory.length === 0 && (
            <Text style={styles.empty}>
              Your lawn-obsessed neighbor who happens to be an agronomist. Ask anything.
            </Text>
          )}
          {chatHistory.map((turn, i) => (
            <View
              key={i}
              style={[styles.bubble, turn.role === "user" ? styles.userBubble : styles.botBubble]}>
              <Text style={turn.role === "user" ? styles.userText : styles.botText}>
                {turn.content}
              </Text>
            </View>
          ))}
          {sending && <ActivityIndicator color={colors.primary} style={{ margin: spacing(2) }} />}
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        {chatHistory.length === 0 && (
          <View style={styles.prompts}>
            {SUGGESTED_PROMPTS.map((p) => (
              <Chip key={p} label={p} onPress={() => send(p)} />
            ))}
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask anything about your lawn…"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            multiline
            maxLength={2000}
            onSubmitEditing={() => send(draft)}
          />
          <Pressable
            onPress={() => send(draft)}
            disabled={sending || !draft.trim()}
            accessibilityRole="button"
            style={[styles.sendButton, (sending || !draft.trim()) && { opacity: 0.5 }]}>
            <Text style={styles.sendLabel}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { fontSize: 26, fontWeight: "700", color: colors.text, marginBottom: spacing(2) },
  messages: {
    padding: spacing(4),
    gap: spacing(2),
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  empty: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  bubble: {
    borderRadius: radius.lg,
    padding: spacing(3),
    maxWidth: "85%",
  },
  userBubble: { backgroundColor: colors.primary, alignSelf: "flex-end" },
  botBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
  },
  userText: { color: colors.white, fontSize: 15, lineHeight: 21 },
  botText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  error: { color: colors.urgent, fontSize: 13 },
  prompts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(2),
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing(2),
    padding: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
    backgroundColor: colors.background,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendLabel: { color: colors.white, fontSize: 20, fontWeight: "700" },
});
