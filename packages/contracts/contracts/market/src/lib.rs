//! BlueCollar Market Contract
//! Handles tip/payment escrow between users and workers on Stellar (Soroban).

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub token: Address,
    pub released: bool,
    pub cancelled: bool,
}

#[contracttype]
pub enum DataKey {
    Escrow(Symbol),
}

#[contract]
pub struct MarketContract;

#[contractimpl]
impl MarketContract {
    /// Send a tip to a worker — transfers tokens directly
    /// Emits: TipSent(from, to, token, amount)
    pub fn tip(env: Env, from: Address, to: Address, token_addr: Address, amount: i128) {
        from.require_auth();
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&from, &to, &amount);

        // Event: TipSent
        // topics: ["TipSent", from, to]
        // data:   (token_addr, amount)
        env.events().publish(
            (symbol_short!("TipSent"), from, to),
            (token_addr, amount),
        );
    }

    /// Create an escrow between a payer and a worker
    /// Emits: EscrowCreated(id, from, to, amount)
    pub fn create_escrow(
        env: Env,
        id: Symbol,
        from: Address,
        to: Address,
        token_addr: Address,
        amount: i128,
    ) {
        from.require_auth();

        let contract_addr = env.current_contract_address();
        let client = token::Client::new(&env, &token_addr);
        // Lock funds in the contract
        client.transfer(&from, &contract_addr, &amount);

        let escrow = Escrow {
            from: from.clone(),
            to: to.clone(),
            amount,
            token: token_addr.clone(),
            released: false,
            cancelled: false,
        };
        env.storage().persistent().set(&DataKey::Escrow(id.clone()), &escrow);

        // Event: EscrowCreated
        // topics: ["EscCrt", id, from]
        // data:   (to, token_addr, amount)
        env.events().publish(
            (symbol_short!("EscCrt"), id, from),
            (to, token_addr, amount),
        );
    }

    /// Release escrow funds to the worker (payer only)
    /// Emits: EscrowReleased(id, to, amount)
    pub fn release_escrow(env: Env, id: Symbol, caller: Address) {
        caller.require_auth();
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(id.clone()))
            .expect("Escrow not found");

        assert!(escrow.from == caller, "Not authorized");
        assert!(!escrow.released, "Already released");
        assert!(!escrow.cancelled, "Escrow cancelled");

        let contract_addr = env.current_contract_address();
        let client = token::Client::new(&env, &escrow.token);
        client.transfer(&contract_addr, &escrow.to, &escrow.amount);

        escrow.released = true;
        env.storage().persistent().set(&DataKey::Escrow(id.clone()), &escrow);

        // Event: EscrowReleased
        // topics: ["EscRel", id, escrow.to]
        // data:   escrow.amount
        env.events().publish(
            (symbol_short!("EscRel"), id, escrow.to),
            escrow.amount,
        );
    }

    /// Cancel escrow and refund the payer (payer only)
    /// Emits: EscrowCancelled(id, from, amount)
    pub fn cancel_escrow(env: Env, id: Symbol, caller: Address) {
        caller.require_auth();
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(id.clone()))
            .expect("Escrow not found");

        assert!(escrow.from == caller, "Not authorized");
        assert!(!escrow.released, "Already released");
        assert!(!escrow.cancelled, "Already cancelled");

        let contract_addr = env.current_contract_address();
        let client = token::Client::new(&env, &escrow.token);
        client.transfer(&contract_addr, &escrow.from, &escrow.amount);

        escrow.cancelled = true;
        env.storage().persistent().set(&DataKey::Escrow(id.clone()), &escrow);

        // Event: EscrowCancelled
        // topics: ["EscCnl", id, escrow.from]
        // data:   escrow.amount
        env.events().publish(
            (symbol_short!("EscCnl"), id, escrow.from),
            escrow.amount,
        );
    }

    /// Get escrow details by id
    pub fn get_escrow(env: Env, id: Symbol) -> Option<Escrow> {
        env.storage().persistent().get(&DataKey::Escrow(id))
    }
}
