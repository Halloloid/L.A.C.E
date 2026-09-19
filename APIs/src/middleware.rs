use std::{env, future::Future, pin::Pin};

use axum::{
    extract::FromRequestParts,
    http::{StatusCode, header, request::Parts},
    response::Response,
};
use jsonwebtoken::{DecodingKey, Validation, decode};

use crate::models::auth::{AuthUser, Claims};

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = Response;

    fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Pin<Box<dyn Future<Output = Result<Self, Self::Rejection>> + Send + '_>> {
        Box::pin(async move {
            let token = parts
                .headers
                .get(header::AUTHORIZATION)
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.strip_prefix("Bearer "))
                .filter(|value| !value.is_empty())
                .ok_or_else(|| auth_error("Authorization header with Bearer token is required"))?;

            let secret = env::var("JWT_SECRET").map_err(|_| {
                auth_error("JWT_SECRET is not configured")
            })?;
            let claims = decode::<Claims>(
                token,
                &DecodingKey::from_secret(secret.as_bytes()),
                &Validation::default(),
            )
            .map_err(|_| auth_error("Invalid or expired token"))?
            .claims;
            let id = claims
                .sub
                .parse()
                .map_err(|_| auth_error("Token subject is invalid"))?;

            Ok(AuthUser {
                id,
                email: claims.email,
                role: claims.role,
            })
        })
    }
}

fn auth_error(message: &'static str) -> Response {
    (StatusCode::UNAUTHORIZED, message).into_response()
}

trait IntoAuthResponse {
    fn into_response(self) -> Response;
}

impl IntoAuthResponse for (StatusCode, &'static str) {
    fn into_response(self) -> Response {
        Response::builder()
            .status(self.0)
            .header("content-type", "text/plain; charset=utf-8")
            .body(self.1.into())
            .expect("static authentication response is valid")
    }
}
