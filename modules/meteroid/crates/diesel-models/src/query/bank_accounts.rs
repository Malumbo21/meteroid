use crate::bank_accounts::{BankAccountRow, BankAccountRowNew, BankAccountRowPatch};
use crate::errors::IntoDbResult;

use crate::{DbResult, PgConn};
use diesel::{debug_query, ExpressionMethods, QueryDsl};
use diesel_async::RunQueryDsl;
use error_stack::ResultExt;
use tap::TapFallible;

impl BankAccountRowNew {
    pub async fn insert(&self, conn: &mut PgConn) -> DbResult<BankAccountRow> {
        use crate::schema::bank_account::dsl as ba_dsl;

        let query = diesel::insert_into(ba_dsl::bank_account).values(self);

        log::debug!("{}", debug_query::<diesel::pg::Pg, _>(&query).to_string());

        query
            .get_result(conn)
            .await
            .attach_printable("Error while inserting bank_account")
            .into_db_result()
    }
}

impl BankAccountRow {
    pub async fn get_by_id(
        conn: &mut PgConn,
        tenant_id: uuid::Uuid,
        id: uuid::Uuid,
    ) -> DbResult<BankAccountRow> {
        use crate::schema::bank_account::dsl as ba_dsl;

        let query = ba_dsl::bank_account
            .filter(ba_dsl::id.eq(id))
            .filter(ba_dsl::tenant_id.eq(tenant_id));

        log::debug!("{}", debug_query::<diesel::pg::Pg, _>(&query).to_string());

        query
            .first(conn)
            .await
            .attach_printable("Error while getting bank_account")
            .into_db_result()
    }

    pub async fn get_by_local_id(
        conn: &mut PgConn,
        tenant_id: uuid::Uuid,
        id: String,
    ) -> DbResult<BankAccountRow> {
        use crate::schema::bank_account::dsl as ba_dsl;

        let query = ba_dsl::bank_account
            .filter(ba_dsl::local_id.eq(id))
            .filter(ba_dsl::tenant_id.eq(tenant_id));

        log::debug!("{}", debug_query::<diesel::pg::Pg, _>(&query).to_string());

        query
            .first(conn)
            .await
            .attach_printable("Error while getting bank_account")
            .into_db_result()
    }

    pub async fn list_by_tenant_id(
        conn: &mut PgConn,
        tenant_id: uuid::Uuid,
    ) -> DbResult<Vec<BankAccountRow>> {
        use crate::schema::bank_account::dsl as ba_dsl;

        let query = ba_dsl::bank_account.filter(ba_dsl::tenant_id.eq(tenant_id));

        log::debug!("{}", debug_query::<diesel::pg::Pg, _>(&query).to_string());

        query
            .get_results(conn)
            .await
            .tap_err(|e| log::error!("Error while fetching bank_accounts: {:?}", e))
            .attach_printable("Error while fetching bank_accounts")
            .into_db_result()
    }

    pub async fn delete(
        conn: &mut PgConn,
        tenant_id: uuid::Uuid,
        id: uuid::Uuid,
    ) -> DbResult<usize> {
        use crate::schema::bank_account::dsl as ba_dsl;

        let query = diesel::delete(ba_dsl::bank_account)
            .filter(ba_dsl::id.eq(id))
            .filter(ba_dsl::tenant_id.eq(tenant_id));

        log::debug!("{}", debug_query::<diesel::pg::Pg, _>(&query).to_string());

        query
            .execute(conn)
            .await
            .attach_printable("Error while deleting bank_account")
            .into_db_result()
    }

    pub async fn list_by_ids(
        conn: &mut PgConn,
        ids: &[uuid::Uuid],
        tenant_id: &uuid::Uuid,
    ) -> DbResult<Vec<BankAccountRow>> {
        use crate::schema::bank_account::dsl as ba_dsl;

        let query = ba_dsl::bank_account
            .filter(ba_dsl::id.eq_any(ids))
            .filter(ba_dsl::tenant_id.eq(tenant_id));

        log::debug!("{}", debug_query::<diesel::pg::Pg, _>(&query).to_string());

        query
            .get_results(conn)
            .await
            .tap_err(|e| log::error!("Error while fetching bank_accounts: {:?}", e))
            .attach_printable("Error while fetching bank_accounts")
            .into_db_result()
    }
}

impl BankAccountRowPatch {
    pub async fn patch(&self, conn: &mut PgConn) -> DbResult<BankAccountRow> {
        use crate::schema::bank_account::dsl as ba_dsl;

        let query = diesel::update(ba_dsl::bank_account)
            .filter(ba_dsl::id.eq(self.id))
            .filter(ba_dsl::tenant_id.eq(self.tenant_id))
            .set(self);

        log::debug!("{}", debug_query::<diesel::pg::Pg, _>(&query).to_string());

        query
            .get_result(conn)
            .await
            .attach_printable("Error while updating bank_account")
            .into_db_result()
    }
}