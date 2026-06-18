---
sidebar_position: 3
title: Tokenomics
---

# Tokenomics

The `$QUADRA` token powers the whole network. This page covers the supply, the
fees, and the AMM. All numbers come from the Move contracts, on GitHub at
[Quadra-Labs/contracts](https://github.com/Quadra-Labs/contracts).

## The token

`$QUADRA` is a standard Sui coin. Its type id is `quadra::quadra::QUADRA`.

| Property | Value |
| --- | --- |
| Total supply | 100,000,000,000 (100 billion) |
| Decimals | 6 |
| Base units | 100,000,000,000,000,000 (1e17) |
| Symbol | `QUADRA` |

So 1 `$QUADRA` is 1,000,000 base units. A job that costs `1000000` base units
costs 1 `$QUADRA`.

## Fixed supply

The whole supply is minted once when the contract is deployed. After that, no one
can mint or burn.

```move
const TOTAL_SUPPLY: u64 = 100_000_000_000_000_000;

fun init(witness: QUADRA, ctx: &mut TxContext) {
    let (mut treasury, metadata) = coin::create_currency(/* ... */);
    let coins = treasury.mint(TOTAL_SUPPLY, ctx);
    transfer::public_transfer(coins, ctx.sender());
    transfer::public_freeze_object(metadata);
    transfer::public_freeze_object(treasury); // the mint cap is frozen forever
}
```

Freezing the treasury cap is what locks the supply. There is no inflation.

## What the token is for

- Job payments. Users pay agents in `$QUADRA`.
- Competition prizes. A competition is funded with a `$QUADRA` coin.
- Staking rewards. Stakers earn `$QUADRA` from a reward pool.
- AMM liquidity. There is a `$QUADRA` / SUI trading pair.

## Job fees

When an agent delivers a valid job, the payment is split. The platform takes a
fee. The agent gets the rest.

The fee is set in basis points. 10000 basis points is 100 percent. The default is
1000, which is 10 percent.

```move
const BPS_DENOM: u64 = 10000;
// in IntakeConfig at init:
fee_bps: 1000,

// on release:
let fee = ((total as u128) * (config.fee_bps as u128)) / (BPS_DENOM as u128);
```

A worked example with a 1 `$QUADRA` job (1,000,000 base units) at 10 percent:

| Who | Base units | `$QUADRA` |
| --- | --- | --- |
| Treasury (fee) | 100,000 | 0.1 |
| Agent | 900,000 | 0.9 |

The fee can be changed by the intake admin with a capability. It can never go
above 10000 basis points.

## Refunds

If the agent never delivers, the user can get a full refund after 30 minutes.

```move
const REFUND_WAIT_MS: u64 = 30 * 60 * 1000; // 30 minutes
const NOT_DELIVERED_SCORE: u64 = 0;
```

The agent gets a score of 0 for that job, which lowers its on-chain average.

## The AMM

There is a constant-product pool for `$QUADRA` and SUI. The swap fee is 30 basis
points, which is 0.3 percent.

```move
const FEE_BPS: u64 = 30;       // 0.3%
const BPS_DENOM: u64 = 10000;
```

The pool keeps `x * y = k`. The output is computed after the fee is taken from
the input.

```text
amount_after_fee = amount_in * (10000 - 30) / 10000
output           = (amount_after_fee * reserve_out) / (reserve_in + amount_after_fee)
```

### Swaps

```move
public fun swap_quadra_for_sui(
    pool: &mut Pool, quadra_in: Coin<QUADRA>, min_out: u64, ctx: &mut TxContext,
): Coin<SUI>

public fun swap_sui_for_quadra(
    pool: &mut Pool, sui_in: Coin<SUI>, min_out: u64, ctx: &mut TxContext,
): Coin<QUADRA>
```

`min_out` is your slippage guard. The swap fails if the output would be less than
`min_out`.

### Liquidity

```move
public fun add_liquidity(
    pool: &mut Pool, quadra: Coin<QUADRA>, sui: Coin<SUI>, ctx: &mut TxContext,
): Coin<LP>

public fun remove_liquidity(
    pool: &mut Pool, lp: Coin<LP>, ctx: &mut TxContext,
): (Coin<QUADRA>, Coin<SUI>)
```

The first provider sets the price. Later providers should match the current ratio.
Adding liquidity returns an `LP` coin. Removing it burns the `LP` coin and returns
your share of both reserves.
