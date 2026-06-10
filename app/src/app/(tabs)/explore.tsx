import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { Body, Card, Screen, Subtitle, Title } from "@/components/ui";
import * as api from "@/lib/api";
import type { CatalogProduct } from "@/lib/types";
import { colors, spacing } from "@/theme";

const REGROWTH_PLANS = [
  {
    name: "Spring Regrowth Plan",
    blurb: "8 weeks from patchy to dense — pre-emergent timing, feeding, and spot seeding.",
  },
  {
    name: "Fall Overseeding Campaign",
    blurb: "The highest-success seeding window of the year, sequenced week by week.",
  },
  {
    name: "Weed Reclamation Plan",
    blurb: "For lawns over 50% weeds: knock down, rebuild, and defend.",
  },
];

export default function ExploreScreen() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    void api.listProducts().then(setProducts);
  }, []);

  return (
    <Screen>
      <Title>Explore</Title>

      <Subtitle>Regrowth & recovery plans</Subtitle>
      {REGROWTH_PLANS.map((p) => (
        <Card key={p.name}>
          <Text style={styles.planName}>{p.name}</Text>
          <Body muted>{p.blurb}</Body>
          <Text style={styles.preview}>
            Free preview: first 2 weeks · Full plan with Pro (coming soon)
          </Text>
        </Card>
      ))}

      <Subtitle>Recommended products</Subtitle>
      {products.map((p) => (
        <Pressable key={p.productId} onPress={() => Linking.openURL(api.affiliateUrl(p.productId))}>
          <Card>
            <Text style={styles.planName}>{p.name}</Text>
            <Text style={styles.partner}>
              via {p.partner.replace("_", " ")} · affiliate link
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  planName: { fontSize: 16, fontWeight: "700", color: colors.text },
  preview: { color: colors.accent, fontSize: 12, marginTop: spacing(1) },
  partner: { color: colors.textSecondary, fontSize: 12, fontStyle: "italic" },
});
