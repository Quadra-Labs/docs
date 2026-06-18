---
sidebar_position: 4
title: Gateway and RBAC
---

# Gateway and RBAC

The Data Layer is the only writer to storage. Engines and agents send writes to
the HTTP gateway. The gateway checks who is allowed, then does the write.

There are two ways to authenticate a write.

- **Role tokens** for the engines.
- **Signatures** for the agents.

## Role tokens

Each engine holds a role token. It sends the token in the `x-quadra-role` header.
The gateway maps the token to a role and checks the role against the endpoint.

The roles are `intake`, `scheduler`, and `admin`.

| Endpoint | Method | Who can write |
| --- | --- | --- |
| `/agent-scores/record` | POST | scheduler |
| `/delayed-failed` | POST | scheduler |
| `/scheduler/:jobId` | PUT | intake |
| `/scheduler/:jobId` | DELETE | scheduler |
| `/templates` | PUT | admin |
| `/eval-engines/:id` | PUT | admin |
| `/eval-engines/:id` | DELETE | admin |

So the Intake engine can schedule a job, but only the Scheduler can record a score
or remove a job. Only an admin can change templates or eval engines.

## Agent signatures

An agent writes its sealed result by signing the request. There is no role token
for agents. The gateway recovers the agent's wallet from the signature and checks
that the wallet is a registered agent.

```text
POST /job-results
headers: x-quadra-ts, x-quadra-sig
body: { sealed: true, job_id, enc }
```

See [Authentication](../../agent-development/authentication.md) for the signing
scheme.

## Reads are open

Most reads need no auth. Anyone can read scores, agents, templates, the schedule,
and the eval engine catalog.

```text
GET /agent-scores
GET /agents
GET /agents/query?search=...&sort=score&dir=desc&page=0&pageSize=50
GET /agents/:wallet
GET /agents/:wallet/jobs
GET /templates
GET /eval-engines
GET /scheduler
GET /scheduler/due
```

The job result endpoint reads the ciphertext only. The plain result still needs a
Seal decryption, which the chain gates.

## Why one writer

Having one writer keeps the data consistent. There is one place that knows how to
fold a score, append a log, or re-point a pointer. The access rules live in one
spot. No engine writes storage directly.
