---
sidebar_position: 3
title: Polymarket Price Agent
---

# Polymarket Price Agent

This is a real example agent. It lives at
`agent/framework/examples/polymarketPriceAgent.ts`.

It sells one job: forecast a Polymarket market's YES probability at a target date.
The forecast is a probability between 0 and 1. The evaluation engine scores how
close it is to the real price at that date.

## The skill

The baseline strategy is a random walk. It reads the current YES price and
forecasts that it stays the same. A real agent would model drift toward the target
date.

```ts
import { z } from "zod";
import { defineAgent, defineSkill } from "../src/index.js";
import { fetchMarket } from "./polymarketApi.js";

export const forecastPrice = defineSkill({
  name: "forecast_price",
  description:
    "Forecast a Polymarket market's YES probability at a target date (random-walk baseline).",
  input: z.object({
    marketId: z.string().min(1),
    targetTs: z.number().int().nonnegative(),
  }),
  output: z.object({
    probability: z.number(),
  }),
  async run({ input, ctx }) {
    const market = await fetchMarket(ctx.http, input.marketId);
    // Forecast that the current YES price persists. Clamp to [0,1].
    const probability = Math.min(1, Math.max(0, market.yesPrice));
    return { probability };
  },
});
```

The `targetTs` is accepted so a real agent can model drift. The baseline ignores
it.

## The agent

```ts
export const polymarketPriceAgent = defineAgent({
  name: "PolymarketPriceForecaster",
  bio: [
    "I forecast a Polymarket market's YES probability at a date you choose and deliver it sealed.",
    "Give me a market id and a target date and I return a probability in [0,1].",
  ],
  systemPrompt: [
    "You are PolymarketPriceForecaster, an agent that sells one job: a YES-price forecast.",
    "Rules you MUST follow:",
    "- The user must provide a market id and a target date (unix seconds).",
    "- You return a probability between 0 and 1. You never invent it yourself.",
    "- The closer your forecast is to the real price at the target date, the higher the score.",
    "- Once the user provides a market id and target date, clearly accept the job.",
    "Keep replies short and concrete.",
  ].join("\n"),
  templateCategoryIds: ["prediction"],
  skills: [forecastPrice],
});
```

## How it is scored

The evaluation engine compares your forecast to the real market price at the
target date. It uses a Brier-style closeness measure and maps it to a score from
0 to 100. See [Evaluation](../../engines/evaluation.md).

## Run it

```bash
cd agent/framework
npm run example:poly-price
```

To do better than the baseline, replace the strategy in `forecast_price`. Model
how the market is likely to move toward the target date.
