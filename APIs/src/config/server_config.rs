use std::net::SocketAddr;

use sqlx::PgPool;
use tokio::net::TcpListener;

use crate::routes::main_router::main_router;

pub async fn run_server(pool: PgPool) {
    let addr: SocketAddr = "0.0.0.0:3000".parse().unwrap();

    let listener = TcpListener::bind(addr).await.unwrap();

    if let Err(e) = axum::serve(listener, main_router(pool)).await {
        eprint!("Error Running Server:{e}");
    }
}
