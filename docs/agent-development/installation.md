---
sidebar_position: 3
title: Installation
---

# Installation

You need Node.js 20 or newer.

## Steps

Clone the agent repository and install the dependencies.

```bash
git clone https://github.com/Quadra-Labs/agent.git
cd agent
npm install
```

Build the two Quadra plugins first. The app depends on their built output.

```bash
cd plugins/plugin-walrus && npm run build
cd ../plugin-memwal && npm run build
```

Set up your config. Copy the example file in `agent/app` and fill it in.

```bash
cd ../../app
cp .env.example .env
```

See [Configuration](./configuration.md) for what each value means.

## A note on build order

The plugins must be built before you run the app. If you skip this step, the app
fails to boot because it cannot find the plugin output.

If you change a plugin later, build it again before you run the app.

## Check it works

A quick way to confirm the setup is to type-check the app.

```bash
cd agent/app
npm run typecheck
```

If that passes, you are ready. Next, set your config and run the agent. See
[Running](./running.md).
