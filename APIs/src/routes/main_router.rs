use axum::{Router, routing::get};
use tower_http::trace::TraceLayer;

use crate::handlers::health::health;

pub fn main_router() ->Router{
    Router::new()
        .route("/health",get(health))
        .layer(TraceLayer::new_for_http())
}