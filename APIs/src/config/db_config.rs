use sqlx::{PgPool, postgres::PgPoolOptions};
use std::{env, error::Error, time::Duration};

pub async fn connect_db() -> Result<PgPool, Box<dyn Error + 'static>> {
    dotenvy::dotenv().ok();

    let url = env::var("DATABASE_URL").expect("DATABASE URL NOT FOUND");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(30))
        .connect(&url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}
