use crate::adapters::stripe::Stripe;
use crate::workers::metrics::record_call;
use crate::{errors, singletons};
use common_utils::timed::TimedExt;
use error_stack::{Result, ResultExt};
use fang::{AsyncQueueable, AsyncRunnable, Deserialize, FangError, Scheduled, Serialize};
use futures::future::join_all;
use meteroid_store::domain::CursorPaginationRequest;
use meteroid_store::repositories::InvoiceInterface;
use meteroid_store::{Store, domain};
use std::sync::Arc;
use tokio::sync::Semaphore;

const BATCH_SIZE: usize = 100;
const MAX_CONCURRENT_REQUESTS: usize = 10;

#[derive(Serialize, Deserialize)]
#[serde(crate = "fang::serde")]
pub struct IssueWorker;

#[async_trait::async_trait]
#[typetag::serde]
impl AsyncRunnable for IssueWorker {
    #[tracing::instrument(skip(self, _queue))]
    async fn run(&self, _queue: &mut dyn AsyncQueueable) -> core::result::Result<(), FangError> {
        issue_worker(singletons::get_store().await, Stripe::get())
            .timed(|res, elapsed| record_call("issue", res, elapsed))
            .await
            .map_err(|err| {
                log::error!("Error in issue worker: {}", err);
                FangError {
                    description: err.to_string(),
                }
            })
    }

    fn cron(&self) -> Option<Scheduled> {
        let expression = "0 4/10 * * * * *"; // every 10 minutes
        Some(Scheduled::CronPattern(expression.to_string()))
    }

    fn uniq(&self) -> bool {
        true
    }

    fn max_retries(&self) -> i32 {
        0
    }
}

#[tracing::instrument(skip_all)]
async fn issue_worker(store: &Store, stripe_adapter: &Stripe) -> Result<(), errors::WorkerError> {
    // fetch all invoices with issued=false, should_issue & ready_to_issue, attempts < max and send by mail
    // TODO

    let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_REQUESTS));

    let mut tasks = Vec::new();

    let mut last_processed_id = None;

    // TODO optimize (semaphore + parallelism)
    loop {
        let paginated_vec = store
            .list_invoices_to_issue(
                5,
                CursorPaginationRequest {
                    limit: Some(BATCH_SIZE as u32),
                    cursor: last_processed_id,
                },
            )
            .await
            .change_context(errors::WorkerError::DatabaseError)?;

        for invoice in paginated_vec.items.into_iter() {
            let permit = semaphore
                .clone()
                .acquire_owned()
                .await
                .change_context(errors::WorkerError::DatabaseError)?;

            let store = store.clone();
            let stripe_adapter = stripe_adapter.clone();

            let task = tokio::spawn(async move {
                let _permit = permit; // Moves permit into the async block

                let issue_result = issue_invoice(&invoice, &stripe_adapter, &store).await;

                match issue_result {
                    Ok(_) => {
                        let res = store
                            .invoice_issue_success(invoice.id, invoice.tenant_id)
                            .await;

                        if let Err(e) = res {
                            log::error!(
                                "Failed to mark as issue_success invoice with id {} : {}",
                                &invoice.id,
                                e
                            )
                        }
                    }
                    Err(e) => {
                        let res = store
                            .invoice_issue_error(
                                invoice.id,
                                invoice.tenant_id,
                                e.to_string().as_str(),
                            )
                            .await;

                        if let Err(e) = res {
                            log::error!(
                                "Failed to mark as issue_error invoice with id {} : {}",
                                &invoice.id,
                                e
                            )
                        }
                    }
                }

                //  drop(_permit) should not be necessary, TODO validate
            });
            tasks.push(task);
        }

        last_processed_id = paginated_vec.next_cursor;

        if paginated_vec.next_cursor.is_none() {
            break;
        }
    }

    join_all(tasks).await;

    Ok(())
}

#[tracing::instrument(skip_all)]
async fn issue_invoice(
    _invoice: &domain::Invoice,
    _stripe_adapter: &Stripe,
    _store: &Store,
) -> Result<(), errors::WorkerError> {
    todo!()
    // what happens when we issue an invoice :

    // we check the subscription mode
    // - IF AUTO (aka if defined payment method) & if collect = true
    // - then do we collect then issue, or issue then collect ?
    // I would try collecting, then send with a pay button TODO check

    // - IF MANUAL
    // we send by email (put in kafka)

    // TODO should we consider that this worker is only responsible for issuing (mail) ?
    // and we have another worker for billing via PP ?
    // ex: ready_to_issue or date TODO

    //
    // match invoice.payment_provider {
    //     PaymentProviderEnum::Stripe => {
    //         let customer = store
    //             .find_customer_by_id(Identity::UUID(invoice.customer_id), invoice.tenant_id)
    //             .await
    //             .change_context(errors::WorkerError::DatabaseError)?;
    //         let api_key = store
    //             .find_provider_config(PaymentProviderEnum::Stripe, invoice.tenant_id)
    //             .await
    //             .change_context(errors::WorkerError::DatabaseError)?
    //             .api_security
    //             .api_key;
    //
    //         stripe_adapter
    //             .send_invoice(invoice, &customer, SecretString::new(api_key))
    //             .await
    //             .change_context(errors::WorkerError::ProviderError)?;
    //
    //         Ok(())
    //     }
    //     PaymentProviderEnum::Manual => {
    //         log::warn!("Invoice has Manual provider so shouldn't be picked-up by issue_worker");
    //         Ok(())
    //     }
    // }
}
