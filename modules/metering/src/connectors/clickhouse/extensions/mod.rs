use crate::connectors::errors::ConnectorError;
use crate::domain::QueryMeterParams;
use clickhouse_rs::Pool;

#[cfg(feature = "openstack")]
pub mod openstack_ext;

#[async_trait::async_trait]
pub trait ConnectorClickhouseExtension {
    fn prefix(&self) -> String;
    async fn init(&self, pool: &Pool) -> error_stack::Result<(), ConnectorError>;

    // we don't yet need postprocessing, but we can refactor to run_query(pool, params) if we have this use case
    fn build_query(&self, params: &QueryMeterParams) -> Option<String>;
}