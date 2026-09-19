CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'inspector',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id TEXT NOT NULL UNIQUE,
    inspector_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'compliant', 'warning', 'noncompliant', 'failed')),
    pipeline_stage TEXT NOT NULL DEFAULT 'uploaded',
    source_filename TEXT,
    raw_ocr_text TEXT,
    declarations JSONB NOT NULL DEFAULT '{}'::jsonb,
    measurement JSONB,
    summary JSONB NOT NULL DEFAULT '{"passed": 0, "warnings": 0, "failed": 0}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    rule_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pass', 'warning', 'fail', 'missing')),
    extracted TEXT,
    note TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (inspection_id, rule_key)
);

CREATE TABLE IF NOT EXISTS inspection_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    sha256 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_events (
    id BIGSERIAL PRIMARY KEY,
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    rule_key TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning'
        CHECK (severity IN ('warning', 'fail')),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved', 'dismissed')),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS inspections_created_at_idx
    ON inspections (created_at DESC);
CREATE INDEX IF NOT EXISTS inspections_status_idx
    ON inspections (status);
CREATE INDEX IF NOT EXISTS inspections_category_idx
    ON inspections (category);
CREATE INDEX IF NOT EXISTS inspection_rules_inspection_id_idx
    ON inspection_rules (inspection_id);
CREATE INDEX IF NOT EXISTS inspection_events_inspection_id_created_at_idx
    ON inspection_events (inspection_id, created_at);
CREATE INDEX IF NOT EXISTS violations_status_idx
    ON violations (status);
