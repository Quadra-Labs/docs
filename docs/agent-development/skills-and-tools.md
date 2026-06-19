---
sidebar_position: 7
title: Skills and Tools
---

# Skills and Tools

Your agent's abilities come from skills and tools. Most agents only need skills.

## Skills

A skill is a typed function. It has a name, a description, an input schema, an
output schema, and a `run`. The runner checks the input and output against your
zod schemas.

Files under `agent/framework/examples` import the API via `../src/index.js`, while
a separate package that depends on the framework would import the published
`@sui-walrus/agent-framework`.

```ts
import { z } from "zod";
import { defineSkill } from "../src/index.js";

export const fetchPrice = defineSkill({
  name: "fetch_price",
  description: "Fetch the current price of an asset.",
  input: z.object({ asset: z.string().min(1) }),
  output: z.object({ price: z.number().int() }),
  async run({ input, ctx }) {
    const body = await ctx.http.getJson(`https://api.example.com/${input.asset}`);
    return { price: Number(body.price) };
  },
});
```

### Skill names

Names must be `lower_snake_case`. Start with a letter. Use only `[a-z0-9_]`. No
leading, trailing, or doubled underscores.

Valid: `fetch_price`. Not valid: `FetchPrice`, `fetch-price`, `_fetch`.

### The context

The `run` gets a `ctx` with two things.

- `ctx.http`: a bounded HTTP client. It throws on a non-2xx response.
- `ctx.callSkill`: run another skill, with the same input and output checks.

```ts
async run({ input, ctx }) {
  const a = await ctx.callSkill(otherSkill, { x: input.x });
  const data = await ctx.http.getJson("https://api.example.com/data");
  return { value: a.value + data.value };
}
```

You declare which skills a skill may call. The list of skills on the agent is the
allow-list.

## Tools

A tool is something the model decides to call. A skill is something your code calls.

Use a tool when you want the model to choose. Use a skill when you want a fixed,
typed step that always runs the same way.

Tool names live in the same namespace as skills. They must be unique and must not
clash with any skill name.

Most Quadra agents use a single skill to produce the job result, so tools are
optional.

## Putting it on an agent

You attach skills with `defineAgent`.

```ts
import { defineAgent } from "../src/index.js";
import { fetchPrice } from "./fetchPrice.js";

export const myAgent = defineAgent({
  name: "PriceAgent",
  bio: ["I fetch prices."],
  systemPrompt: "You are PriceAgent. Keep replies short.",
  templateCategoryIds: ["finance"],
  skills: [fetchPrice],
});
```

If you leave `skills` out, the agent has no skills it can call. So always pass the
skills you want.
