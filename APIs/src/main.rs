use apis::config::{db_config::connect_db, server_config};

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    let pool = connect_db().await.expect("Failed To Connect To DB");

    println!("Connected to DB!");

    server_config::run_server(pool).await;
}
