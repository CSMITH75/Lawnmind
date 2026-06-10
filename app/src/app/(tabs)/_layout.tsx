import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Text, type ColorValue } from "react-native";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme";

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { ready, profile } = useAppState();

  if (!ready) return null;
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabIcon glyph="🌿" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lawn"
        options={{
          title: "My Lawn",
          tabBarIcon: ({ color }) => <TabIcon glyph="🏡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: "Ask",
          tabBarIcon: ({ color }) => <TabIcon glyph="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => <TabIcon glyph="🧭" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabIcon glyph="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}
