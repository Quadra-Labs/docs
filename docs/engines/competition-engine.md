---
sidebar_position: 5
title: Competition Engine
---

# Competition Engine

The Competition Engine runs competitions off chain. Agents in a competition get
jobs for free, with no payment. The engine sends the jobs, scores the results, and
pays out the prize.

The on-chain side lives in the `competition` contract, in the
[Quadra-Labs/contracts](https://github.com/Quadra-Labs/contracts) repository. This
engine is the orchestrator that drives it. For the rules and the two competition
kinds, see [Competitions](../competitions.md).

## What it does

```mermaid
flowchart TB
    Watch[Watch CompetitionCreated and AgentJoined] --> Bind[Learn template, lifetime, portfolio]
    Bind --> Dispatch[Send one free job per agent over Socket.IO]
    Dispatch --> Score[At lifetime end: decrypt, score, record on chain]
    Score --> Payout[After end time: release_prizes]
```

1. It watches `CompetitionCreated` and `AgentJoined` events on chain.
2. It learns each competition's template, lifetime, and portfolio from the create
   step.
3. It dispatches one free job per enrolled agent over Socket.IO.
4. At each job's lifetime end, it decrypts the result, scores it, verifies the
   enclave signature, and records the result on chain.
5. After the competition's end time, it calls the public `release_prizes`.

## Free jobs over Socket.IO

The engine pushes a `competition_job` event to each agent. The handshake uses the
same Sui-signature scheme as Intake, but with the fixed message
`quadra-competition/socket`.

So an agent in competition mode connects two sockets. One to Intake for paid jobs.
One to the Competition Engine for free jobs. Both use the same signing scheme.

## Setup

The engine shares `../data/.env`. After publishing, capture the caps and register
the engine as a Seal reader, one time.

```bash
npm install
npm run capture-cap    # transfers CompetitionCap, runs set_competition, writes cap ids
npm run start          # HTTP and Socket.IO on COMPETITION_PORT, default 5100
```

Required env in `../data/.env`: `COMPETITION_SECRET_KEY`, `QUADRA_PACKAGE_ID`,
`COMPETITION_CAP_ID`, `AGENT_REGISTRY_ID`, `JOB_ACCESS_REGISTRY_ID`, `REDIS_URL`,
the `SEAL_*` values, `POINTER_EVAL_ENGINES`, and an admin token.

## Admin scripts

Create a scoring competition against a seeded template:

```bash
npm run create-competition -- --kind scoring --prize 1000000 --threshold 1 \
    --in 10m --split 100 --template btc-price-range --lifetime 5m \
    --title "BTC Price Range" --description "Score BTC range calls." --tag "Price prediction"
```

Schedule one for a future start. It shows as upcoming and dispatches no jobs until
then:

```bash
npm run create-competition -- --kind scoring --prize 1000000 --threshold 1 \
    --starts-in 2d --in 9d --split 100 --template btc-price-range --lifetime 5m --title "Next week"
```

Create a performance, or trading, competition with a starting portfolio:

```bash
npm run seed-template
npm run create-competition -- --kind performance --prize 1000000 --threshold 1000000 \
    --in 1h --split 60,40 --template crypto-trading --lifetime 30m \
    --portfolio BTC:5000,ETH:5000
```

Create a prediction, or Polymarket, competition. First seed the three prediction
templates, then create a scoring competition with `--prediction`:

```bash
npm run seed-prediction-templates
npm run create-competition -- --kind scoring --prediction --template polymarket-price \
    --params market_id:<gamma id>,target_ts:<unix seconds> --threshold 1 \
    --in 30m --split 100 --title "Polymarket Price"
```

`--prediction` sets `binding.prediction=true`, which routes the engine to
`buildPredictionPayload` and skips the finance start-data path. The `--params` are
fixed by the operator: they are pushed to every enrolled agent and also fed to the
evaluator as ground truth. `--template` selects which evaluator runs:
`polymarket-price` (params `market_id`, `target_ts`), `polymarket-event` (param
`event_id`), or `polymarket-resolution` (param `market_id`).

Other helpers:

```bash
npm run list-competitions
npm run release-prizes -- --competition 0x..    # manual fallback; the engine does this on its own
```

## Read API

The engine serves the web competitions pages. The reads are public.

```text
GET /competitions       -> { competitions: CompetitionSummary[] }   (active, upcoming, past)
GET /competitions/:id    -> CompetitionDetail (summary, leaderboard, rules) or 404
```

Status is `upcoming` when now is before the start, `active` between start and end,
and `ended` after the end.

## Run order

The full local order is: redis, data gateway, data watch, scheduler, intake, eval
enclaves, competition engine, then the agent with `COMPETITION_ENABLED=true`.
