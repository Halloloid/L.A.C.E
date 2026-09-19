use axum::{
    Router,
    routing::{get, post},
};
use sqlx::PgPool;
use tower_http::trace::TraceLayer;

use crate::handlers::api::*;
use crate::handlers::check::check_image;
use crate::handlers::health::health;

pub fn main_router(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/check", post(check_image))
        .route("/auth/login", post(login))
        .route("/me", get(me))
        .route(
            "/inspections",
            post(create_inspection).get(list_inspections),
        )
        .route("/inspections/{id}/calibrate", post(calibrate))
        .route("/inspections/{id}/status", get(inspection_status))
        .route("/inspections/{id}", get(get_inspection))
        .route("/products", get(products))
        .route("/violations", get(violations))
        .route("/dashboard/metrics", get(dashboard_metrics))
        .route("/analytics/trend", get(analytics_trend))
        .route("/analytics/by-category", get(analytics_by_category))
        .route("/analytics/summary", get(analytics_summary))
        .with_state(pool)
        .layer(TraceLayer::new_for_http())
}
