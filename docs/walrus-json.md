---
sidebar_position: 8
title: walrus-json
---

# walrus-json

`walrus-json` is the library that stores Quadra's databases. It gives you an easy
way to work with JSON on Walrus, plus a stable on-chain pointer to the latest
version.

The code is on GitHub at
[Quadra-Labs/walrus-json](https://github.com/Quadra-Labs/walrus-json).

## The idea

Walrus blobs are immutable and content-addressed. A `blobId` is a hash of the
content. So any change to the JSON makes a new `blobId`.

`walrus-json` works with that, not against it. Every change reads the current blob,
edits it in memory, writes a new blob, and re-points an on-chain `JsonPointer` at
the new blob. Nothing is ever rewritten in place.

```mermaid
flowchart LR
    Mutate[Edit JSON in memory] --> Write[writeBlob = new blobId]
    Write --> Point["pointer::update(blobId) on Sui"]
    Point --> Read[Readers resolve the latest]
```

This is the storage primitive behind the Quadra Indexer.

## Install

```bash
npm install walrus-json @mysten/walrus @mysten/sui
```

## Quick start

```ts
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { WalrusJsonClient } from "walrus-json";

const wj = new WalrusJsonClient({
  network: "testnet",
  signer: Ed25519Keypair.generate(),
  packageId: "0x...", // the published walrus_json Move package
});

// Create a document and commit it as a Walrus blob.
const doc = wj.create({ users: [], meta: { count: 0 } });
doc
  .append("users", { id: 1, name: "ada" })
  .set("meta.updatedAt", Date.now())
  .increment("meta.count");

const { blobId } = await doc.commit({ epochs: 5, deletable: true });

// Open an existing blob, edit it, write a new blob.
const next = await wj.open(blobId);
next.merge("meta", { tag: "release" });
const { blobId: newBlobId } = await next.commit({ epochs: 5 });

// A pointer: one id that always resolves to the latest blob.
const pointerId = await wj.createPointer(newBlobId);
const live = await wj.openPointer(pointerId);
live.append("users", { id: 2, name: "linus" });
await live.commit({ epochs: 5 }); // writes a new blob AND updates the pointer

const latest = await wj.resolvePointer(pointerId); // the latest JSON
```

## JSON operations

A path can be a dot-path like `users[0].name` or a JSON Pointer like
`/users/0/name`.

| Method | What it does |
| --- | --- |
| `get(path)` | Read a value at a path. |
| `has(path)` | Whether a path exists. |
| `set(path, value)` | Set or replace a value, creating intermediates. |
| `merge(path, partial, { deep })` | Shallow or deep merge an object. |
| `append(path, ...items)` | Push items onto an array. |
| `prepend(path, ...items)` | Unshift items onto an array. |
| `insert(path, index, item)` | Insert into an array at an index. |
| `remove(path)` | Delete a key or array element. |
| `increment(path, by?)` / `decrement(path, by?)` | Add or subtract from a number. |
| `move(from, to)` / `copy(from, to)` | Move or copy a value. |
| `rename(path, key)` | Rename a key in place. |
| `replace(value)` | Replace the whole document. |
| `patch(ops)` | Apply a batch of operations. |

Mutations are chainable and stay in memory. Nothing touches Walrus until you call
`commit()`.

## Batch with patch

```ts
doc.patch([
  { op: "set", path: "users[0].status", value: "active" },
  { op: "increment", path: "meta.count", by: 1 },
  { op: "append", path: "logs", values: [{ ts: Date.now(), msg: "updated" }] },
]);
```

## The pointer

The `JsonPointer` Move object stores the current `blobId` and a version that goes
up by one on each update. It emits `PointerCreated` and `PointerUpdated` events,
which the Indexer subscribes to.

You read pointer state like this:

```ts
const state = await wj.readPointer(pointerId);
// { pointerId, blobId, version, updatedAtMs, owner }
```

## Requirements

Writing blobs uses the `@mysten/walrus` SDK with a Sui keypair. The signer's
address needs SUI for transactions and WAL for storage on the target network.

Pointer operations also need the published `walrus_json` package id, passed as
`packageId` to the client.

## Development

```bash
npm install
npm run build      # tsup, builds dist (ESM and d.ts)
npm test           # vitest, pure path and ops tests, no network
npm run typecheck  # tsc --noEmit
```

The `JsonPointer` Move package lives in `move/walrus_json`. Build and publish it
with `sui move build` and `sui client publish`, then pass the resulting package id
to the client.
