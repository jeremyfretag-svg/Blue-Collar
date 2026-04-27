# BlueCollar Contract Event Indexing Guide

## Overview

This guide documents all events emitted by BlueCollar smart contracts for efficient off-chain indexing. Events are optimized with indexed parameters to enable fast filtering and querying.

## Event Structure

All events follow the Soroban event format:
```
env.events().publish((event_name, indexed_param1, indexed_param2, ...), data_payload)
```

- **Event name**: Short symbol (max 7 characters) for efficient encoding
- **Indexed parameters**: Searchable fields (typically addresses, symbols, IDs)
- **Data payload**: Additional context (amounts, timestamps, status)

## Registry Contract Events

### Role Management

#### RlGrnt (Role Granted)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None
- **Emitted by**: `grant_role()`
- **Use case**: Track role assignments for access control audits

#### RlRvkd (Role Revoked)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None
- **Emitted by**: `revoke_role()`
- **Use case**: Track role removals for security monitoring

### Delegation Management

#### DlgAdd (Delegate Added)
- **Indexed**: `worker_id` (Symbol), `delegate` (Address)
- **Data**: `expires_at` (u64)
- **Emitted by**: `add_delegate()`
- **Use case**: Track worker profile delegation grants

#### DlgRem (Delegate Removed)
- **Indexed**: `worker_id` (Symbol), `delegate` (Address)
- **Data**: None
- **Emitted by**: `remove_delegate()`
- **Use case**: Track delegation revocations

### Contract State

#### Paused
- **Indexed**: `admin` (Address)
- **Data**: None
- **Emitted by**: `pause()`
- **Use case**: Monitor contract pause events

#### Unpaused
- **Indexed**: `admin` (Address)
- **Data**: None
- **Emitted by**: `unpause()`
- **Use case**: Monitor contract resume events

### Curator Management

#### CurAdd (Curator Added)
- **Indexed**: `admin` (Address), `curator` (Address)
- **Data**: None
- **Emitted by**: `add_curator()`
- **Use case**: Track curator onboarding

#### CurRem (Curator Removed)
- **Indexed**: `admin` (Address), `curator` (Address)
- **Data**: None
- **Emitted by**: `remove_curator()`
- **Use case**: Track curator offboarding

### Worker Registration

#### WrkReg (Worker Registered)
- **Indexed**: `worker_id` (Symbol)
- **Data**: `(owner: Address, category: Symbol)`
- **Emitted by**: `register()`, `batch_register()`
- **Use case**: Index new worker listings by ID, owner, and category

#### WrkTgl (Worker Toggled)
- **Indexed**: `worker_id` (Symbol)
- **Data**: `is_active` (bool)
- **Emitted by**: `toggle()`
- **Use case**: Track worker availability status changes

#### WrkUpd (Worker Updated)
- **Indexed**: `worker_id` (Symbol)
- **Data**: `(name: String, category: Symbol)` or `(name: String, category: Symbol, wallet: Address)`
- **Emitted by**: `update()`, `update_worker()`
- **Use case**: Index worker profile updates

#### WrkDrg (Worker Deregistered)
- **Indexed**: `worker_id` (Symbol), `caller` (Address)
- **Data**: None
- **Emitted by**: `deregister()`
- **Use case**: Track worker removal from registry

### Reputation

#### RepUpd (Reputation Updated)
- **Indexed**: `worker_id` (Symbol)
- **Data**: `score` (u32)
- **Emitted by**: `update_reputation()`
- **Use case**: Index reputation score changes

### Category Verification

#### CatVfy (Category Verified)
- **Indexed**: `worker_id` (Symbol), `category` (Symbol)
- **Data**: `(curator: Address, expires_at: u64)`
- **Emitted by**: `verify_category()`
- **Use case**: Track category verification records

### Staking

#### Staked
- **Indexed**: `worker_id` (Symbol), `caller` (Address)
- **Data**: `(amount: i128, total_staked: i128)`
- **Emitted by**: `stake()`
- **Use case**: Track staking activity and total staked amounts

#### UnstakeRq (Unstake Requested)
- **Indexed**: `worker_id` (Symbol), `caller` (Address)
- **Data**: `unstake_requested_at` (u64)
- **Emitted by**: `request_unstake()`
- **Use case**: Track unstake request initiation

#### Unstaked
- **Indexed**: `worker_id` (Symbol), `caller` (Address)
- **Data**: `(staked: i128, rewards: i128)`
- **Emitted by**: `unstake()`
- **Use case**: Track unstake completion and reward distribution

## Market Contract Events

### Role Management

#### RlGrnt (Role Granted)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None
- **Emitted by**: `grant_role()`

#### RlRvkd (Role Revoked)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None
- **Emitted by**: `revoke_role()`

### Contract State

#### Paused
- **Indexed**: `admin` (Address)
- **Data**: None
- **Emitted by**: `pause()`

#### Unpaused
- **Indexed**: `admin` (Address)
- **Data**: None
- **Emitted by**: `unpause()`

### Payments

#### Tip
- **Indexed**: `from` (Address), `to` (Address)
- **Data**: `(token: Address, amount: i128, fee: i128)`
- **Emitted by**: `tip()`
- **Use case**: Track direct tip transfers

### Escrow

#### EscrowCreated
- **Indexed**: `id` (Symbol), `from` (Address), `to` (Address)
- **Data**: `(token: Address, amount: i128, expiry: u64)`
- **Emitted by**: `create_escrow()`
- **Use case**: Track escrow creation

#### EscrowReleased
- **Indexed**: `id` (Symbol), `to` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `release_escrow()`
- **Use case**: Track escrow fund releases

#### EscrowCancelled
- **Indexed**: `id` (Symbol), `from` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `cancel_escrow()`
- **Use case**: Track escrow cancellations

### Multi-Signature Escrow

#### MultiSigCreated
- **Indexed**: `id` (Symbol), `from` (Address), `to` (Address)
- **Data**: `(token: Address, amount: i128, threshold: u32)`
- **Emitted by**: `create_multisig_escrow()`
- **Use case**: Track multi-sig escrow creation

#### MultiSigApproved
- **Indexed**: `id` (Symbol), `signer` (Address)
- **Data**: `approvals_count` (u32)
- **Emitted by**: `approve_multisig_release()`
- **Use case**: Track approval progress

#### MultiSigReleased
- **Indexed**: `id` (Symbol), `to` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `approve_multisig_release()` (when threshold reached)
- **Use case**: Track multi-sig fund releases

## Fee Distribution Contract Events

### Role Management

#### RlGrnt (Role Granted)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None

#### RlRvkd (Role Revoked)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None

### Contract State

#### Paused
- **Indexed**: `admin` (Address)
- **Data**: None

#### Unpaused
- **Indexed**: `admin` (Address)
- **Data**: None

### Fee Management

#### FeeRcp (Fee Recipients Set)
- **Indexed**: None
- **Data**: `recipient_count` (u32)
- **Emitted by**: `set_fee_recipients()`
- **Use case**: Track fee recipient configuration changes

#### FeeColl (Fee Collected)
- **Indexed**: `token` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `collect_fees()`
- **Use case**: Track fee collection by token

#### FeeDistr (Fee Distributed)
- **Indexed**: `recipient` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `distribute_fees()`
- **Use case**: Track individual fee distributions

#### FeeWdraw (Fee Withdrawn)
- **Indexed**: `token` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `withdraw_fees()`
- **Use case**: Track emergency fee withdrawals

## Insurance Pool Contract Events

### Role Management

#### RlGrnt (Role Granted)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None

#### RlRvkd (Role Revoked)
- **Indexed**: `role` (Symbol), `account` (Address)
- **Data**: None

### Contract State

#### Paused
- **Indexed**: `admin` (Address)
- **Data**: None

#### Unpaused
- **Indexed**: `admin` (Address)
- **Data**: None

### Pool Management

#### Contrib (Contribution)
- **Indexed**: `contributor` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `contribute()`
- **Use case**: Track pool contributions

#### Rebal (Pool Rebalanced)
- **Indexed**: `token` (Address)
- **Data**: `new_premium_bps` (i128)
- **Emitted by**: `rebalance_pool()`
- **Use case**: Track premium adjustments

### Claims

#### ClmFile (Claim Filed)
- **Indexed**: `claimant` (Address)
- **Data**: `amount` (i128)
- **Emitted by**: `file_claim()`
- **Use case**: Track new claims

#### ClmAppr (Claim Approved)
- **Indexed**: `claim_id` (Symbol)
- **Data**: `amount` (i128)
- **Emitted by**: `approve_claim()`
- **Use case**: Track claim approvals

#### ClmRej (Claim Rejected)
- **Indexed**: `claim_id` (Symbol)
- **Data**: `amount` (i128)
- **Emitted by**: `reject_claim()`
- **Use case**: Track claim rejections

#### ClmPay (Claim Paid)
- **Indexed**: `claim_id` (Symbol)
- **Data**: `amount` (i128)
- **Emitted by**: `pay_claim()`
- **Use case**: Track claim payouts

## Indexing Best Practices

### 1. Event Filtering

Use indexed parameters to efficiently filter events:

```javascript
// Filter all workers registered by a specific curator
registry.events()
  .filter(e => e.name === 'WrkReg' && e.indexed[0] === curator_address)
  .map(e => ({ worker_id: e.indexed[0], owner: e.data[0], category: e.data[1] }))
```

### 2. Time-Series Analysis

Combine events with ledger timestamps for analytics:

```javascript
// Track worker registration trends
const registrations = events
  .filter(e => e.name === 'WrkReg')
  .map(e => ({ timestamp: e.ledger_timestamp, worker_id: e.indexed[0] }))
  .sort((a, b) => a.timestamp - b.timestamp)
```

### 3. State Reconstruction

Use events to reconstruct contract state:

```javascript
// Rebuild worker profile from events
const worker_events = events.filter(e => e.indexed[0] === worker_id)
const profile = {
  registered: worker_events.find(e => e.name === 'WrkReg'),
  updates: worker_events.filter(e => e.name === 'WrkUpd'),
  reputation: worker_events.filter(e => e.name === 'RepUpd').pop(),
  active: worker_events.filter(e => e.name === 'WrkTgl').pop()?.data
}
```

### 4. Audit Trails

Track sensitive operations:

```javascript
// Audit all role changes
const role_changes = events.filter(e => e.name === 'RlGrnt' || e.name === 'RlRvkd')
  .map(e => ({
    action: e.name === 'RlGrnt' ? 'granted' : 'revoked',
    role: e.indexed[0],
    account: e.indexed[1],
    timestamp: e.ledger_timestamp
  }))
```

## Event Completeness Checklist

- [x] All state-mutating functions emit events
- [x] Events include all relevant indexed parameters
- [x] Event names are concise (≤7 characters)
- [x] Data payloads include context not in indexed params
- [x] Events enable full state reconstruction
- [x] Events support audit trail requirements
- [x] Events are documented with use cases

## Storage Considerations

- Events are not stored on-chain; they're emitted to the Stellar network
- Indexers must subscribe to contract events to capture them
- Event data is immutable once emitted
- Use indexed parameters for frequently-queried fields
- Keep data payloads minimal to reduce network overhead
