// cf https://xxchan.me/cs/2023/02/17/optimize-rust-comptime-en.html#step-4-single-binary-integration-test

mod e2e;
mod helpers;
mod metering_it;
mod meteroid_it;
mod test_auth_api_key;
mod test_auth_jwt;
mod test_basic;
mod test_idempotency;
mod test_idempotency_cache;
mod test_slot_transaction;
mod test_subscription;
mod test_workers;