/**
 * Curated affiliate product catalog (PRD §4.2, §6.2).
 *
 * Security note: the affiliate redirect endpoint resolves productId against
 * this allowlist only — partner URLs are never accepted from the client, so
 * the endpoint cannot be used as an open redirect.
 */
export interface CatalogProduct {
  productId: string;
  name: string;
  category: string;
  partnerUrl: string;
  partner: "amazon" | "home_depot" | "true_value";
}

const CATALOG: CatalogProduct[] = [
  {
    productId: "pre-emergent-halts",
    name: "Crabgrass Pre-Emergent (Scotts Halts)",
    category: "pre_emergent",
    partner: "amazon",
    partnerUrl: "https://www.amazon.com/dp/B003E243PA",
  },
  {
    productId: "fert-slow-release",
    name: "Slow-Release Lawn Fertilizer 30-0-4",
    category: "fertilizer",
    partner: "home_depot",
    partnerUrl: "https://www.homedepot.com/b/Outdoors-Garden-Center-Lawn-Care-Lawn-Fertilizers/N-5yc1vZc8rb",
  },
  {
    productId: "seed-tall-fescue",
    name: "Tall Fescue Overseeding Mix",
    category: "seed",
    partner: "amazon",
    partnerUrl: "https://www.amazon.com/dp/B01EZBQ4D2",
  },
  {
    productId: "aerator-core",
    name: "Manual Core Aerator",
    category: "aeration",
    partner: "true_value",
    partnerUrl: "https://www.truevalue.com/lawn-garden",
  },
  {
    productId: "grub-preventer",
    name: "Season-Long Grub Preventer (chlorantraniliprole)",
    category: "grub_control",
    partner: "amazon",
    partnerUrl: "https://www.amazon.com/dp/B00AQ3MWEU",
  },
];

const BY_ID = new Map(CATALOG.map((p) => [p.productId, p]));
const BY_CATEGORY = new Map<string, CatalogProduct[]>();
for (const p of CATALOG) {
  const list = BY_CATEGORY.get(p.category) ?? [];
  list.push(p);
  BY_CATEGORY.set(p.category, list);
}

export function getProduct(productId: string): CatalogProduct | undefined {
  return BY_ID.get(productId);
}

export function firstProductInCategory(category: string): CatalogProduct | undefined {
  return BY_CATEGORY.get(category)?.[0];
}

export function listProducts(): CatalogProduct[] {
  return [...CATALOG];
}
