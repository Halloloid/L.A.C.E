use axum::{
    Router,
    routing::{get, post},
};
use tower_http::trace::TraceLayer;

use crate::handlers::check::check_image;
use crate::handlers::health::health;

pub fn main_router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/check", post(check_image))
        .layer(TraceLayer::new_for_http())
}