//! BlueCollar Registry Contract
//! Deployed on Stellar (Soroban) — manages worker registrations on-chain.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Worker {
    pub id: Symbol,
    pub owner: Address,
    pub name: String,
    pub category: Symbol,
    pub is_active: bool,
    pub wallet: Address,
}

#[contracttype]
pub enum DataKey {
    Worker(Symbol),
    WorkerList,
}

#[contract]
pub struct RegistryContract;

#[contractimpl]
impl RegistryContract {
    /// Register a new worker on-chain
    /// Emits: WorkerRegistered(id, owner, category)
    pub fn register(env: Env, id: Symbol, owner: Address, name: String, category: Symbol) {
        owner.require_auth();

        let worker = Worker {
            id: id.clone(),
            owner: owner.clone(),
            name,
            category: category.clone(),
            is_active: true,
            wallet: owner.clone(),
        };

        env.storage().persistent().set(&DataKey::Worker(id.clone()), &worker);

        let mut list: Vec<Symbol> = env
            .storage()
            .persistent()
            .get(&DataKey::WorkerList)
            .unwrap_or(Vec::new(&env));
        list.push_back(id.clone());
        env.storage().persistent().set(&DataKey::WorkerList, &list);

        // Event: WorkerRegistered
        // topics: ["WorkerRegistered", id]
        // data:   (owner, category)
        env.events().publish(
            (symbol_short!("WrkReg"), id),
            (owner, category),
        );
    }

    /// Get a worker by id
    pub fn get_worker(env: Env, id: Symbol) -> Option<Worker> {
        env.storage().persistent().get(&DataKey::Worker(id))
    }

    /// Toggle a worker's active status (owner only)
    /// Emits: WorkerToggled(id, is_active)
    pub fn toggle(env: Env, id: Symbol, caller: Address) {
        caller.require_auth();
        let mut worker: Worker = env
            .storage()
            .persistent()
            .get(&DataKey::Worker(id.clone()))
            .expect("Worker not found");
        assert!(worker.owner == caller, "Not authorized");
        worker.is_active = !worker.is_active;
        let new_status = worker.is_active;
        env.storage().persistent().set(&DataKey::Worker(id.clone()), &worker);

        // Event: WorkerToggled
        // topics: ["WrkTgl", id]
        // data:   is_active (bool)
        env.events().publish(
            (symbol_short!("WrkTgl"), id),
            new_status,
        );
    }

    /// Update a worker's name and/or category (owner only)
    /// Emits: WorkerUpdated(id, name, category)
    pub fn update(env: Env, id: Symbol, caller: Address, name: String, category: Symbol) {
        caller.require_auth();
        let mut worker: Worker = env
            .storage()
            .persistent()
            .get(&DataKey::Worker(id.clone()))
            .expect("Worker not found");
        assert!(worker.owner == caller, "Not authorized");
        worker.name = name.clone();
        worker.category = category.clone();
        env.storage().persistent().set(&DataKey::Worker(id.clone()), &worker);

        // Event: WorkerUpdated
        // topics: ["WrkUpd", id]
        // data:   (name, category)
        env.events().publish(
            (symbol_short!("WrkUpd"), id),
            (name, category),
        );
    }

    /// Deregister a worker (owner only)
    /// Emits: WorkerDeregistered(id)
    pub fn deregister(env: Env, id: Symbol, caller: Address) {
        caller.require_auth();
        let worker: Worker = env
            .storage()
            .persistent()
            .get(&DataKey::Worker(id.clone()))
            .expect("Worker not found");
        assert!(worker.owner == caller, "Not authorized");
        env.storage().persistent().remove(&DataKey::Worker(id.clone()));

        // Remove from list
        let mut list: Vec<Symbol> = env
            .storage()
            .persistent()
            .get(&DataKey::WorkerList)
            .unwrap_or(Vec::new(&env));
        if let Some(pos) = list.iter().position(|x| x == id) {
            list.remove(pos as u32);
        }
        env.storage().persistent().set(&DataKey::WorkerList, &list);

        // Event: WorkerDeregistered
        // topics: ["WrkDrg", id]
        // data:   caller (owner address)
        env.events().publish(
            (symbol_short!("WrkDrg"), id),
            caller,
        );
    }

    /// List all registered worker ids
    pub fn list_workers(env: Env) -> Vec<Symbol> {
        env.storage()
            .persistent()
            .get(&DataKey::WorkerList)
            .unwrap_or(Vec::new(&env))
    }
}
