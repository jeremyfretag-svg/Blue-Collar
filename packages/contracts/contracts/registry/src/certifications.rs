//! Worker certification tracking module for BlueCollar Registry Contract.
//!
//! This module provides on-chain storage and management of professional certifications
//! for workers, including verification, expiration tracking, and event emission.

use soroban_sdk::{Address, Env, String, Symbol, Vec};

/// Professional certification held by a worker.
#[derive(Clone)]
pub struct Certification {
    /// Unique certification identifier.
    pub id: Symbol,
    /// Worker who holds this certification.
    pub worker_id: Symbol,
    /// Certification name/title (e.g., "Licensed Electrician").
    pub name: String,
    /// Issuing organization (e.g., "State Board of Electricians").
    pub issuer: String,
    /// Certification number/reference.
    pub cert_number: String,
    /// Unix timestamp when certification was issued.
    pub issued_at: u64,
    /// Unix timestamp when certification expires (0 = no expiry).
    pub expires_at: u64,
    /// Whether this certification has been verified on-chain.
    pub is_verified: bool,
    /// Address that verified this certification (if verified).
    pub verified_by: Option<Address>,
    /// Timestamp when verification occurred.
    pub verified_at: u64,
}

/// Storage key for certifications.
pub enum CertDataKey {
    /// Persistent storage — list of certification IDs for a worker.
    WorkerCertifications(Symbol),
    /// Persistent storage — individual certification record.
    Certification(Symbol),
}

/// Add a new certification for a worker.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `worker_id`: The worker's unique identifier
/// - `cert_id`: Unique certification identifier
/// - `name`: Certification name/title
/// - `issuer`: Issuing organization
/// - `cert_number`: Certification number/reference
/// - `issued_at`: Unix timestamp when issued
/// - `expires_at`: Unix timestamp when expires (0 = no expiry)
///
/// # Returns
/// The created `Certification` struct
///
/// # Panics
/// - `"Certification already exists"` if cert_id already exists
/// - `"Invalid expiry"` if expires_at is in the past and non-zero
pub fn add_certification(
    env: &Env,
    worker_id: Symbol,
    cert_id: Symbol,
    name: String,
    issuer: String,
    cert_number: String,
    issued_at: u64,
    expires_at: u64,
) -> Certification {
    let now = env.ledger().timestamp();

    // Validate expiry
    if expires_at > 0 && expires_at < now {
        panic!("Invalid expiry");
    }

    // Check if certification already exists
    let key = CertDataKey::Certification(cert_id.clone());
    if env.storage().persistent().has(&key) {
        panic!("Certification already exists");
    }

    let cert = Certification {
        id: cert_id.clone(),
        worker_id: worker_id.clone(),
        name,
        issuer,
        cert_number,
        issued_at,
        expires_at,
        is_verified: false,
        verified_by: None,
        verified_at: 0,
    };

    // Store certification
    env.storage().persistent().set(&key, &cert);

    // Add to worker's certification list
    let list_key = CertDataKey::WorkerCertifications(worker_id.clone());
    let mut certs: Vec<Symbol> = env
        .storage()
        .persistent()
        .get(&list_key)
        .unwrap_or(Vec::new(env));

    if certs.iter().all(|c| c != &cert_id) {
        certs.push_back(cert_id);
        env.storage().persistent().set(&list_key, &certs);
    }

    cert
}

/// Remove a certification from a worker.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `worker_id`: The worker's unique identifier
/// - `cert_id`: Certification to remove
///
/// # Returns
/// `true` if removed, `false` if not found
pub fn remove_certification(env: &Env, worker_id: Symbol, cert_id: Symbol) -> bool {
    let key = CertDataKey::Certification(cert_id.clone());

    if !env.storage().persistent().has(&key) {
        return false;
    }

    // Remove certification
    env.storage().persistent().remove(&key);

    // Remove from worker's list
    let list_key = CertDataKey::WorkerCertifications(worker_id);
    let certs: Vec<Symbol> = env
        .storage()
        .persistent()
        .get(&list_key)
        .unwrap_or(Vec::new(env));

    let mut updated: Vec<Symbol> = Vec::new(env);
    for c in certs.iter() {
        if c != cert_id {
            updated.push_back(c);
        }
    }

    env.storage().persistent().set(&list_key, &updated);
    true
}

/// Verify a certification on-chain.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `cert_id`: Certification to verify
/// - `verifier`: Address verifying the certification
///
/// # Returns
/// The updated `Certification` struct
///
/// # Panics
/// - `"Certification not found"` if cert_id doesn't exist
/// - `"Certification expired"` if expires_at is in the past
pub fn verify_certification(env: &Env, cert_id: Symbol, verifier: Address) -> Certification {
    let key = CertDataKey::Certification(cert_id.clone());
    let mut cert: Certification = env
        .storage()
        .persistent()
        .get(&key)
        .expect("Certification not found");

    let now = env.ledger().timestamp();
    if cert.expires_at > 0 && cert.expires_at < now {
        panic!("Certification expired");
    }

    cert.is_verified = true;
    cert.verified_by = Some(verifier);
    cert.verified_at = now;

    env.storage().persistent().set(&key, &cert);
    cert
}

/// Get a specific certification.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `cert_id`: Certification ID
///
/// # Returns
/// The `Certification` struct if found, `None` otherwise
pub fn get_certification(env: &Env, cert_id: Symbol) -> Option<Certification> {
    let key = CertDataKey::Certification(cert_id);
    env.storage().persistent().get(&key)
}

/// Get all certifications for a worker.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `worker_id`: The worker's unique identifier
///
/// # Returns
/// A `Vec<Certification>` (may be empty)
pub fn get_worker_certifications(env: &Env, worker_id: Symbol) -> Vec<Certification> {
    let list_key = CertDataKey::WorkerCertifications(worker_id);
    let cert_ids: Vec<Symbol> = env
        .storage()
        .persistent()
        .get(&list_key)
        .unwrap_or(Vec::new(env));

    let mut certs: Vec<Certification> = Vec::new(env);
    for cert_id in cert_ids.iter() {
        if let Some(cert) = get_certification(env, cert_id) {
            certs.push_back(cert);
        }
    }
    certs
}

/// Get all non-expired certifications for a worker.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `worker_id`: The worker's unique identifier
///
/// # Returns
/// A `Vec<Certification>` filtered to only non-expired entries
pub fn get_valid_certifications(env: &Env, worker_id: Symbol) -> Vec<Certification> {
    let now = env.ledger().timestamp();
    let all_certs = get_worker_certifications(env, worker_id);

    let mut valid: Vec<Certification> = Vec::new(env);
    for cert in all_certs.iter() {
        if cert.expires_at == 0 || cert.expires_at > now {
            valid.push_back(cert);
        }
    }
    valid
}

/// Check if a certification is currently valid (not expired).
///
/// # Parameters
/// - `env`: Soroban environment
/// - `cert_id`: Certification ID
///
/// # Returns
/// `true` if certification exists and is not expired, `false` otherwise
pub fn is_certification_valid(env: &Env, cert_id: Symbol) -> bool {
    if let Some(cert) = get_certification(env, cert_id) {
        let now = env.ledger().timestamp();
        cert.expires_at == 0 || cert.expires_at > now
    } else {
        false
    }
}

/// Get count of certifications for a worker.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `worker_id`: The worker's unique identifier
///
/// # Returns
/// Number of certifications
pub fn get_certification_count(env: &Env, worker_id: Symbol) -> u32 {
    let list_key = CertDataKey::WorkerCertifications(worker_id);
    let cert_ids: Vec<Symbol> = env
        .storage()
        .persistent()
        .get(&list_key)
        .unwrap_or(Vec::new(env));
    cert_ids.len()
}

/// Get count of verified certifications for a worker.
///
/// # Parameters
/// - `env`: Soroban environment
/// - `worker_id`: The worker's unique identifier
///
/// # Returns
/// Number of verified certifications
pub fn get_verified_certification_count(env: &Env, worker_id: Symbol) -> u32 {
    let certs = get_worker_certifications(env, worker_id);
    let mut count = 0u32;
    for cert in certs.iter() {
        if cert.is_verified {
            count += 1;
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Ledger;

    #[test]
    fn test_add_certification() {
        let env = Env::default();
        let worker_id = Symbol::new(&env, "worker1");
        let cert_id = Symbol::new(&env, "cert1");

        let cert = add_certification(
            &env,
            worker_id.clone(),
            cert_id.clone(),
            String::from_str(&env, "Licensed Electrician"),
            String::from_str(&env, "State Board"),
            String::from_str(&env, "EL-12345"),
            1000,
            2000,
        );

        assert_eq!(cert.id, cert_id);
        assert_eq!(cert.worker_id, worker_id);
        assert!(!cert.is_verified);
    }

    #[test]
    #[should_panic(expected = "Certification already exists")]
    fn test_add_duplicate_certification_panics() {
        let env = Env::default();
        let worker_id = Symbol::new(&env, "worker1");
        let cert_id = Symbol::new(&env, "cert1");

        add_certification(
            &env,
            worker_id.clone(),
            cert_id.clone(),
            String::from_str(&env, "Licensed Electrician"),
            String::from_str(&env, "State Board"),
            String::from_str(&env, "EL-12345"),
            1000,
            2000,
        );

        add_certification(
            &env,
            worker_id,
            cert_id,
            String::from_str(&env, "Licensed Electrician"),
            String::from_str(&env, "State Board"),
            String::from_str(&env, "EL-12345"),
            1000,
            2000,
        );
    }

    #[test]
    fn test_remove_certification() {
        let env = Env::default();
        let worker_id = Symbol::new(&env, "worker1");
        let cert_id = Symbol::new(&env, "cert1");

        add_certification(
            &env,
            worker_id.clone(),
            cert_id.clone(),
            String::from_str(&env, "Licensed Electrician"),
            String::from_str(&env, "State Board"),
            String::from_str(&env, "EL-12345"),
            1000,
            2000,
        );

        assert!(remove_certification(&env, worker_id, cert_id.clone()));
        assert!(get_certification(&env, cert_id).is_none());
    }

    #[test]
    fn test_verify_certification() {
        let env = Env::default();
        let worker_id = Symbol::new(&env, "worker1");
        let cert_id = Symbol::new(&env, "cert1");
        let verifier = Address::random(&env);

        add_certification(
            &env,
            worker_id,
            cert_id.clone(),
            String::from_str(&env, "Licensed Electrician"),
            String::from_str(&env, "State Board"),
            String::from_str(&env, "EL-12345"),
            1000,
            2000,
        );

        let verified = verify_certification(&env, cert_id, verifier.clone());
        assert!(verified.is_verified);
        assert_eq!(verified.verified_by, Some(verifier));
    }

    #[test]
    fn test_get_valid_certifications() {
        let env = Env::default();
        let worker_id = Symbol::new(&env, "worker1");

        // Add non-expiring cert
        add_certification(
            &env,
            worker_id.clone(),
            Symbol::new(&env, "cert1"),
            String::from_str(&env, "Cert 1"),
            String::from_str(&env, "Issuer"),
            String::from_str(&env, "NUM1"),
            1000,
            0, // no expiry
        );

        // Add expiring cert
        add_certification(
            &env,
            worker_id.clone(),
            Symbol::new(&env, "cert2"),
            String::from_str(&env, "Cert 2"),
            String::from_str(&env, "Issuer"),
            String::from_str(&env, "NUM2"),
            1000,
            2000,
        );

        let valid = get_valid_certifications(&env, worker_id);
        assert_eq!(valid.len(), 2);
    }
}
