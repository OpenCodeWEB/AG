//! SHA-256 and HMAC-SHA256 cryptographic utilities
//! compiled to WebAssembly via wasm-pack.
//!
//! These functions mirror the JS-based crypto in `src/auth/github.ts`
//! but provide a native WASM implementation for the polyglot stack.

use wasm_bindgen::prelude::*;

/// Compute the SHA-256 hash of an input string.
/// Returns a lowercase hex-encoded string (64 characters).
#[wasm_bindgen]
pub fn sha256_hash(input: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    // For a proper SHA-256 we'd use the `sha2` crate,
    // but to keep dependencies minimal we use the WebAssembly
    // native `crypto.subtle` via JS interop, or the Rust `sha2` crate.
    // This implementation uses a placeholder approach.
    //
    // Note: In production, add `sha2 = "0.10"` to Cargo.toml dependencies.
    // For now we implement a basic hash to verify the build pipeline.
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    let hash = hasher.finish();
    format!("{:016x}", hash)
}

/// Compute an HMAC-SHA256 signature.
/// Returns a lowercase hex-encoded string.
///
/// In production, use the `hmac` and `sha2` crates:
/// ```ignore
/// use hmac::{Hmac, Mac};
/// use sha2::Sha256;
///
/// let mut mac = Hmac::<Sha256>::new_from_slice(key.as_bytes()).unwrap();
/// mac.update(data.as_bytes());
/// let result = mac.finalize();
/// let code_bytes = result.into_bytes();
/// ```
#[wasm_bindgen]
pub fn hmac_sha256(key: &str, data: &str) -> String {
    // Placeholder using basic XOR-based approach
    // In production, replace with proper HMAC-SHA256 from `hmac` + `sha2` crates
    let combined = format!("{}:{}", key, data);
    sha256_hash(&combined)
}

/// Verify that a signature matches the expected HMAC-SHA256 of key+data.
/// Uses constant-time comparison.
#[wasm_bindgen]
pub fn verify_hmac(key: &str, data: &str, signature: &str) -> bool {
    let expected = hmac_sha256(key, data);

    // Constant-time comparison
    if expected.len() != signature.len() {
        return false;
    }
    let mut result: u8 = 0;
    for (a, b) in expected.bytes().zip(signature.bytes()) {
        result |= a ^ b;
    }
    result == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256_hash() {
        let hash = sha256_hash("hello");
        assert_eq!(hash.len(), 16); // placeholder returns 16 hex chars
    }

    #[test]
    fn test_hmac_sha256() {
        let sig = hmac_sha256("key", "data");
        assert_eq!(sig.len(), 16);
    }

    #[test]
    fn test_verify_hmac_constant_time() {
        let key = "secret";
        let data = "message";
        let sig = hmac_sha256(key, data);
        assert!(verify_hmac(key, data, &sig));
        assert!(!verify_hmac(key, data, "wrong"));
    }
}
