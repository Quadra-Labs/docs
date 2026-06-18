---
sidebar_position: 1
title: Data Layer Overview
---

# Data Layer

The Data Layer reads, writes, and watches all of Quadra's databases. It is the
only thing that writes to Walrus and Seal.

It is a TypeScript library plus a thin HTTP server. The other engines import the
library to read, and call the HTTP gateway to write.

The code is on GitHub at [Quadra-Labs/data](https://github.com/Quadra-Labs/data).

## What it does

- Stores each public database as one JSON document on Walrus.
- Stores private job results encrypted with Seal.
- Watches the chain for pointer changes and streams them to engines.
- Mirrors the chain into a local SQLite database for fast reads.

## The processes

The Data Layer runs as a few separate processes.

| Process | Command | Job |
| --- | --- | --- |
| Gateway | `npm run serve` | The HTTP writer and reader. Default port 8787. |
| Watch | `npm run watch` | The gRPC watcher and SSE stream. Default port 8788. |
| Indexer | `npm run indexer` | The SQLite mirror for fast reads. |

The gateway and the watcher run apart on purpose. A long gRPC stream and heavy
Walrus writes do not share an event loop well. Keeping them separate keeps both
healthy.

## Setup

```bash
git clone https://github.com/Quadra-Labs/data.git
cd data
npm install
cp .env.example .env      # set DATA_SECRET_KEY (and DATA_NETWORK)
npm run setup             # publishes the Move packages and creates the pointers
```

`npm run setup` signs everything with your `DATA_SECRET_KEY`. That address needs
SUI for gas and WAL for storage. The `sui` CLI must be on your PATH, since it
compiles the Move bytecode.

Setup writes the rest of the config back into `.env`: the package ids, the
registry id, every pointer id, and the Seal key servers.

## Read the rest

- [Databases](./databases.md): the list of databases and how they are stored.
- [Walrus and Seal](./walrus-and-seal.md): public docs versus private results.
- [Gateway and RBAC](./gateway-rbac.md): who can write what.
- [gRPC and Watch](./grpc-and-watch.md): how changes are streamed.
- [Indexer](./indexer.md): the SQLite mirror.
