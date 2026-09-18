# Multi-stage build for the Rust Axum backend (`apis`).
#
# Build context is the `APIs/` directory (see ../docker-compose.yml).

FROM rust:1.85-slim-bookworm AS builder
WORKDIR /app

# build-essential/pkg-config cover crates that need to compile native code
# (e.g. transitive `cc` usage in some dependencies). reqwest uses the
# `rustls-tls` feature, so no OpenSSL headers are required.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/apis /app/apis

EXPOSE 3000

CMD ["/app/apis"]
