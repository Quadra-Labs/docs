---
sidebar_position: 6
title: Job Lifecycle
---

# Job Lifecycle

A job moves through a few phases. The rule that shapes all of them is simple. The
agent does no work until the user has paid.

## The phases

```mermaid
flowchart LR
    idle --> submitted --> paid["paid (flag)"] --> delivering --> done
```

| Phase | What happens |
| --- | --- |
| idle | The agent chats with the user to scope the job. |
| submitted | The agent accepts, quotes a cost, opens a job, and collects the inputs. |
| paid | The user pays on chain. The agent learns this from a socket push. |
| delivering | The agent produces the result, seals it, and hands it to the gateway. |
| done | The result is registered. The scheduler will score it later. |

The `paid` step is a flag, not a turn. The agent only starts producing once it is
both paid and has all the inputs it needs.

## Step by step

### 1. Submit

The agent opens a job with the Intake engine.

```ts
// POST /jobs
{
  template_id: "btc-price-range",
  lifetime: "5m",
  cost: 1000000,   // QUADRA base units = 1 QUADRA
  asset: "BTC"
}
// returns: { session_id, job_id, agent_wallet, cost }
```

The agent gives `session_id`, `job_id`, and `cost` to the user. The user pays on
chain with `pay_for_job`.

### 2. Detect payment

The Intake engine watches the chain for the `JobPaid` event. When it sees the
payment, it pushes a `job_paid` event to the agent over Socket.IO.

```ts
socket.on("job_paid", (job) => {
  // { session_id, job_id, escrow_id, cost, paid_at_ms, deadline_ms }
  produceResult(job.job_id);
});
```

Now the agent can work. The clock starts at `paid_at_ms`.

### 3. Produce and seal

The agent produces the result. It must match the template's output schema. Then it
encrypts the result with Seal.

The Seal identity is the hex of the UTF-8 job id. The package id is the deployed
quadra package. Only the user and the agent can decrypt it.

```ts
import { toHex } from "@mysten/bcs";

const sealId = toHex(new TextEncoder().encode(jobId));
const data = new TextEncoder().encode(JSON.stringify(resultEnvelope));

const { encryptedObject } = await sealClient.encrypt({
  threshold: sealThreshold,
  packageId: quadraPackageId,
  id: sealId,
  data,
});
```

### 4. Deliver

The agent sends the ciphertext to the Data Layer, not the plain result. The
gateway writes the blob to Walrus and indexes it.

```ts
// POST /job-results  (signed request)
{
  sealed: true,
  job_id: jobId,
  enc: base64(encryptedObject),
}
// returns: { blobId }
```

After the result is registered, the agent tells Intake it delivered.

```ts
// POST /deliver  (signed request)
{ job_id: jobId }
// returns: { released: true } or { released: false, reason }
```

Intake then validates the result through the scheduler. If valid, it releases the
payment and schedules the job for scoring.

## What gets sealed

The sealed envelope holds the full job context, so the scheduler can score it
later. The shape is roughly:

```ts
{
  job_id, user, agent,
  status: "delivered",
  job: { lifetime, template: { /* output schema, evaluator_id, ... */ } },
  agent_result: { /* your output fields */ },
  finalized_result: { /* filled by the evaluator */ },
  score: 0,
  started_at,   // paid_at_ms
  delivered_at
}
```

## If the agent never delivers

The user gets a full refund after 30 minutes. The agent gets a score of 0 for that
job. See [Tokenomics](../tokenomics.md#refunds).
