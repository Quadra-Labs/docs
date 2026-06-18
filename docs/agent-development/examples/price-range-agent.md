---
sidebar_position: 2
title: Price Range Agent
---

# Price Range Agent

This is a real example agent. It lives at
`agent/framework/examples/priceRangeAgent.ts`.

It sells one job: guess the BTC/USD price range over a window the user picks. The
band is produced from the live Pyth price, the same feed the evaluation engine
scores against. So a short, steady window scores near 100.

## The skill

The skill fetches the live BTC price from Pyth, then returns an integer band
around it. The band widens a little for longer windows.

```ts
import { z } from "zod";
import { defineAgent, defineSkill } from "../src/index.js";

// The BTC/USD Pyth feed the evaluation engine uses (no 0x prefix).
const BTC_USD_FEED_ID =
  "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
const HERMES_LATEST =
  `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${BTC_USD_FEED_ID}`;

export const quotePriceRange = defineSkill({
  name: "quote_price_range",
  description:
    "Quote a BTC/USD min/max price band from the live Pyth price for a given window.",
  input: z.object({
    asset: z.string().min(1),
    lifetimeMs: z.number().int().positive(),
  }),
  output: z.object({
    minPrice: z.number().int(),
    maxPrice: z.number().int(),
  }),
  async run({ input, ctx }) {
    if (input.asset.toUpperCase() !== "BTC") {
      throw new Error(`only BTC is supported (got ${input.asset})`);
    }
    const body = await ctx.http.getJson(HERMES_LATEST);
    const price = normalizePythUsd(body);

    // Band as a fraction of price, scaled by sqrt(minutes), capped at 5%.
    const minutes = Math.max(1, input.lifetimeMs / 60_000);
    const fraction = Math.min(0.05, 0.0008 * Math.sqrt(minutes));
    const half = Math.max(1, Math.round(price * fraction));
    return { minPrice: price - half, maxPrice: price + half };
  },
});
```

## Why the normalization matters

The agent rounds the Pyth price to a whole USD integer the same way the evaluation
engine does. This makes the agent's anchor match the price the engine will score
against. If they did not match, the score would suffer.

```ts
function normalizePythUsd(body: unknown): number {
  const parsed = (body as { parsed?: unknown }).parsed;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("pyth: no parsed price in response");
  }
  const price = (parsed[0] as { price?: { price?: unknown; expo?: unknown } }).price;
  if (!price || typeof price.price !== "string" || typeof price.expo !== "number") {
    throw new Error("pyth: malformed price object");
  }
  const raw = BigInt(price.price);
  const expo = price.expo;
  if (raw <= 0n) throw new Error("pyth: non-positive price");
  if (expo < 0) {
    const scale = 10n ** BigInt(-expo);
    return Number((raw + scale / 2n) / scale); // round to nearest
  }
  return Number(raw * 10n ** BigInt(expo));
}
```

## The agent

The system prompt sets the rules. BTC only. Window of at least one minute. Cost is
exactly 1 `$QUADRA` (1,000,000 base units).

```ts
export const priceRangeAgent = defineAgent({
  name: "PriceRangeOracle",
  bio: [
    "I forecast a BTC/USD price band for a window you choose and deliver it as a sealed job.",
    "I take finance price-range jobs, BTC only, with a lifetime of at least one minute.",
  ],
  systemPrompt: [
    "You are PriceRangeOracle, an agent that sells one job: a BTC/USD price-range guess.",
    "Rules you MUST follow:",
    "- Only BTC is supported. Politely decline any other asset.",
    "- The user picks the lifetime. It must be at least 1 minute.",
    "- Always charge exactly 1000000 (1 QUADRA) for the job.",
    "- Once the user confirms, clearly accept the job.",
    "- Do not invent a price range yourself. It is produced for you after payment.",
    "Keep replies short and concrete.",
  ].join("\n"),
  templateCategoryIds: ["finance"],
  skills: [quotePriceRange],
});
```

## Run it

```bash
cd agent/framework
npm run example:price-range
```

This runs the agent through the app's real intake, seal, and payment loop. A
bridge injects a `produce` hook that calls `quote_price_range` after the user
pays, then maps its output to the job result.
