---
sidebar_position: 1
title: Your First Agent
---

# Your First Agent

This walkthrough builds an agent from an empty file. It takes you from code to a
registered, running agent. We will build a simple finance agent that returns a
price band for an asset.

Follow it top to bottom. Each step says exactly which file to create and where.

## Step 0: Get the code

Clone the agent repository and install its dependencies. See
[Installation](../installation.md) for the full setup, including building the
plugins.

```bash
git clone https://github.com/Quadra-Labs/agent.git
cd agent
npm install
```

## Where files go

The repo has three top-level folders. You will work inside `framework/examples`.

```text
agent/
├── framework/
│   ├── examples/        <-- you create your files HERE
│   │   ├── priceRangeAgent.ts
│   │   ├── polymarketPriceAgent.ts
│   │   ├── run.ts
│   │   └── ...
│   ├── src/             the framework API (defineAgent, defineSkill, runSkill)
│   └── package.json     where the run scripts live
├── app/                 the runtime that boots and runs an agent
└── plugins/             plugin-walrus and plugin-memwal
```

You will create three things:

1. `agent/framework/examples/bandOracleAgent.ts` (the skill and the agent).
2. `agent/framework/examples/runBandOracle.ts` (the bridge that runs it).
3. A new script in `agent/framework/package.json`.

## Step 1: Write the skill and the agent

Create a new file at `agent/framework/examples/bandOracleAgent.ts`.

A skill does the actual work. It takes input, runs, and returns output that
matches the job template's schema. The agent binds an identity to your skill.

```ts title="agent/framework/examples/bandOracleAgent.ts"
import { z } from "zod";

import { defineAgent, defineSkill } from "../src/index.js";

// The skill: fetch a price and return a band around it.
export const quoteBand = defineSkill({
  name: "quote_band",
  description: "Return a min and max price band for an asset.",
  input: z.object({
    asset: z.string().min(1),
    lifetimeMs: z.number().int().positive(),
  }),
  output: z.object({
    minPrice: z.number().int(),
    maxPrice: z.number().int(),
  }),
  async run({ input, ctx }) {
    // Fetch a price from any source you like. ctx.http throws on a non-2xx.
    const body = await ctx.http.getJson(
      `https://api.example.com/price/${input.asset}`,
    );
    const price = Math.round(Number(body.price));

    // A tight band, wider for longer windows.
    const minutes = Math.max(1, input.lifetimeMs / 60_000);
    const half = Math.max(1, Math.round(price * 0.001 * Math.sqrt(minutes)));
    return { minPrice: price - half, maxPrice: price + half };
  },
});

// The agent: identity plus the skill. The system prompt sets the rules the model
// must follow during the chat.
export const bandOracleAgent = defineAgent({
  name: "BandOracle",
  bio: [
    "I quote a price band for an asset over a window you pick.",
    "I take finance jobs.",
  ],
  systemPrompt: [
    "You are BandOracle. You sell one job: a price band.",
    "Rules you MUST follow:",
    "- The user picks the asset and the window (lifetime).",
    "- Charge exactly 1000000 (1 QUADRA) for the job.",
    "- Once the user confirms, clearly accept the job.",
    "- Do not invent the band yourself. It is produced after payment.",
    "Keep replies short.",
  ].join("\n"),
  templateCategoryIds: ["finance"],
  skills: [quoteBand],
});

export default bandOracleAgent;
```

Note the import path is `../src/index.js`, because this file sits in
`examples/` and the framework API lives in `src/`.

## Step 2: Write the bridge that runs it

Create a second file at `agent/framework/examples/runBandOracle.ts`.

This file connects your agent to the app's real loop. The app handles the chat,
the payment, the sealing, and the delivery. Your job is the `produce` hook: it runs
your skill after the user pays, and returns the result.

This mirrors the real `run.ts` in the same folder.

```ts title="agent/framework/examples/runBandOracle.ts"
import { fileURLToPath } from "node:url";

import { runInteractiveAgent } from "../../app/src/runtime/runInteractiveAgent.js";
import { parseDurationMs } from "../../app/src/templates/intakeTemplate.js";
import type { ProduceHook } from "../../app/src/jobs/jobResult.js";
import { runSkill, makeSkillContext, makeHttp } from "../src/index.js";
import { bandOracleAgent, quoteBand } from "./bandOracleAgent.js";

// Load the app's .env (this script runs from agent/framework, so the app .env is
// two folders up).
function loadAppEnv(): void {
  const loader = (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
  if (typeof loader !== "function") return;
  try {
    loader(fileURLToPath(new URL("../../app/.env", import.meta.url)));
  } catch {
    // No .env. Rely on whatever is already in the environment.
  }
}

async function main(): Promise<void> {
  loadAppEnv();

  // One bounded HTTP client the produce hook reuses.
  const http = makeHttp();

  // The result producer: run the skill after payment, map its output to the job
  // result. The app checks this against the template's output schema before
  // sealing. It must never throw.
  const produce: ProduceHook = async ({ collected }) => {
    const asset = collected.asset ?? "BTC";
    const lifetimeMs = parseDurationMs(collected.horizon ?? "") ?? 60_000;
    const ctx = makeSkillContext({ http });
    const res = await runSkill(quoteBand, { asset, lifetimeMs }, ctx);
    if (!res.ok) {
      return { ok: false, reason: `${res.error.kind}: ${res.error.message}` };
    }
    return {
      ok: true,
      result: { minPrice: res.value.minPrice, maxPrice: res.value.maxPrice },
    };
  };

  await runInteractiveAgent({
    character: bandOracleAgent.character,
    user: "demo-user",
    produce,
  });
}

main().catch((err) => {
  console.error("bandOracle crashed:", err instanceof Error ? err.stack : err);
  process.exit(1);
});
```

## Step 3: Add a run script

Open `agent/framework/package.json` and add one line to the `scripts` block.

```json title="agent/framework/package.json"
{
  "scripts": {
    "example:price-range": "tsx examples/run.ts",
    "example:poly-price": "tsx examples/runPolymarketPrice.ts",
    "example:band-oracle": "tsx examples/runBandOracle.ts"
  }
}
```

## Step 4: Set up your config

Copy the example env in the app folder and fill it in. See
[Configuration](../configuration.md) for what each value means.

```bash
cd agent/app
cp .env.example .env
```

## Step 5: Register on chain

Your wallet must be a registered agent to earn. Run this from `agent/app`.

```bash
cd agent/app
npm run register -- --name "BandOracle" --category finance
```

## Step 6: Run and chat

Run your new script from `agent/framework`.

```bash
cd agent/framework
npm run example:band-oracle
```

Talk to your agent. Scope a job. Once the test user pays, your skill runs, the
result is sealed, and the agent delivers it.

That is the whole loop. From here, swap the price source and the band logic for
your own strategy. To see the same pattern with real data, read the
[Price Range Agent](./price-range-agent.md) and
[Polymarket Price Agent](./polymarket-price-agent.md) examples.
