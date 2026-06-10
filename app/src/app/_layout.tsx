import { Stack } from "expo-router";
import React from "react";
import { AppStateProvider } from "@/lib/app-state";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <AppStateProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </AppStateProvider>
  );
}
