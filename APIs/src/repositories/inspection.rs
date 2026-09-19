use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::{PgPool, Postgres, Row, Transaction};
use uuid::Uuid;

use crate::models::inspection::{
    Declarations, Inspection, InspectionListItem, InspectionStatus, InspectionSummary, Measurement,
    Product, ProductSummary, RuleResult, RuleStatus,
};

pub const DEMO_USER_ID: Uuid = Uuid::from_u128(0x00000000000000000000000000000001);

pub async fn ensure_demo_user(
    pool: &PgPool,
) -> Result<(Uuid, String, String, String), sqlx::Error> {
    let row = sqlx::query(
        "INSERT INTO app_users (id, display_name, email, role)
         VALUES ($1, 'Demo Inspector', 'demo@lace.local', 'inspector')
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
         RETURNING id, display_name, email, role",
    )
    .bind(DEMO_USER_ID)
    .fetch_one(pool)
    .await?;
    Ok((
        row.get("id"),
        row.get("display_name"),
        row.get("email"),
        row.get("role"),
    ))
}

pub async fn create_inspection(
    pool: &PgPool,
    filename: Option<&str>,
    content_type: &str,
    size: i64,
    category: &str,
    product_name: Option<&str>,
    brand: Option<&str>,
) -> Result<(String, String), sqlx::Error> {
    let mut tx: Transaction<'_, Postgres> = pool.begin().await?;
    ensure_demo_user_tx(&mut tx).await?;
    let product_id = if let Some(name) = product_name.filter(|v| !v.is_empty()) {
        Some(
            sqlx::query(
                "INSERT INTO products (name, brand, category) VALUES ($1,$2,$3)
             ON CONFLICT DO NOTHING RETURNING id",
            )
            .bind(name)
            .bind(brand)
            .bind(category)
            .fetch_optional(&mut *tx)
            .await?
            .map(|r| r.get::<Uuid, _>("id")),
        )
    } else {
        None
    };
    let public_id = Uuid::new_v4().to_string();
    let inspection_id: Uuid = sqlx::query(
        "INSERT INTO inspections (public_id, inspector_id, product_id, category, source_filename)
         VALUES ($1,$2,$3,$4,$5) RETURNING id",
    )
    .bind(&public_id)
    .bind(DEMO_USER_ID)
    .bind(product_id)
    .bind(category)
    .bind(filename)
    .fetch_one(&mut *tx)
    .await?
    .get("id");
    sqlx::query(
        "INSERT INTO inspection_images (inspection_id, storage_key, content_type, size_bytes)
                 VALUES ($1,$2,$3,$4)",
    )
    .bind(inspection_id)
    .bind(format!("uploads/{public_id}"))
    .bind(content_type)
    .bind(size)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "INSERT INTO inspection_events (inspection_id, stage, status, message)
                 VALUES ($1,'uploaded','processing','Inspection image uploaded')",
    )
    .bind(inspection_id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok((public_id, "processing".to_string()))
}

async fn ensure_demo_user_tx(tx: &mut Transaction<'_, Postgres>) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO app_users (id, display_name, email, role)
                 VALUES ($1,'Demo Inspector','demo@lace.local','inspector')
                 ON CONFLICT (email) DO NOTHING",
    )
    .bind(DEMO_USER_ID)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn calibrate(
    pool: &PgPool,
    public_id: &str,
    reference_mm: f64,
    pixel_length: f64,
) -> Result<bool, sqlx::Error> {
    let measurement = json!({"referenceMm": reference_mm, "scaleMmPerPx": reference_mm / pixel_length,
        "detectedTextPx": pixel_length, "physicalTextMm": reference_mm});
    let result = sqlx::query(
        "UPDATE inspections SET measurement=$1, updated_at=now()
        WHERE public_id=$2",
    )
    .bind(measurement)
    .bind(public_id)
    .execute(pool)
    .await?;
    Ok(result.rows_affected() > 0)
}

fn status(v: &str) -> InspectionStatus {
    match v {
        "compliant" => InspectionStatus::Compliant,
        "warning" => InspectionStatus::Warning,
        "noncompliant" => InspectionStatus::Noncompliant,
        "failed" => InspectionStatus::Failed,
        _ => InspectionStatus::Processing,
    }
}
fn summary(v: Value) -> InspectionSummary {
    serde_json::from_value(v).unwrap_or_default()
}
fn declarations(v: Value) -> Declarations {
    serde_json::from_value(v).unwrap_or_default()
}

pub async fn get_inspection(
    pool: &PgPool,
    public_id: &str,
) -> Result<Option<Inspection>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT i.public_id, i.created_at, i.category, i.status, i.declarations, i.measurement, i.summary,
                u.display_name inspector, p.name product_name, p.brand
         FROM inspections i LEFT JOIN app_users u ON u.id=i.inspector_id
         LEFT JOIN products p ON p.id=i.product_id WHERE i.public_id=$1")
        .bind(public_id).fetch_optional(pool).await?;
    let Some(r) = row else { return Ok(None) };
    let id: String = r.get("public_id");
    let rules = sqlx::query(
        "SELECT status, extracted, note, details FROM inspection_rules
        WHERE inspection_id=(SELECT id FROM inspections WHERE public_id=$1) ORDER BY created_at",
    )
    .bind(public_id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|x| RuleResult {
        status: match x.get::<String, _>("status").as_str() {
            "pass" => RuleStatus::Pass,
            "fail" => RuleStatus::Fail,
            "missing" => RuleStatus::Missing,
            _ => RuleStatus::Warning,
        },
        extracted: x.get("extracted"),
        note: x.get("note"),
        details: Some(x.get("details")),
    })
    .collect();
    let created: DateTime<Utc> = r.get("created_at");
    Ok(Some(Inspection {
        id,
        date: created.to_rfc3339(),
        inspector: r.get("inspector"),
        category: r.get("category"),
        product: ProductSummary {
            name: r
                .get::<Option<String>, _>("product_name")
                .unwrap_or_else(|| "Unknown product".into()),
            brand: r.get("brand"),
        },
        declarations: declarations(r.get("declarations")),
        measurement: r.get::<Option<Value>, _>("measurement").map(|v| {
            serde_json::from_value::<Measurement>(v).unwrap_or(Measurement {
                reference_mm: 0.0,
                scale_mm_per_px: 0.0,
                detected_text_px: 0.0,
                physical_text_mm: 0.0,
            })
        }),
        rules,
        summary: summary(r.get("summary")),
        status: status(r.get("status")),
    }))
}

pub async fn list_inspections(
    pool: &PgPool,
    limit: i64,
) -> Result<Vec<InspectionListItem>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT i.public_id,i.created_at,i.category,i.status,i.summary,u.display_name inspector,
        p.name product_name,p.brand FROM inspections i LEFT JOIN app_users u ON u.id=i.inspector_id
        LEFT JOIN products p ON p.id=i.product_id ORDER BY i.created_at DESC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| InspectionListItem {
            id: r.get("public_id"),
            date: r.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
            inspector: r.get("inspector"),
            category: r.get("category"),
            product: ProductSummary {
                name: r
                    .get::<Option<String>, _>("product_name")
                    .unwrap_or_else(|| "Unknown product".into()),
                brand: r.get("brand"),
            },
            summary: summary(r.get("summary")),
            status: status(r.get("status")),
        })
        .collect())
}

pub async fn products(pool: &PgPool) -> Result<Vec<Product>, sqlx::Error> {
    Ok(
        sqlx::query("SELECT id,name,brand,category FROM products ORDER BY name")
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|r| Product {
                id: r.get("id"),
                name: r.get("name"),
                brand: r.get("brand"),
                category: r.get("category"),
            })
            .collect(),
    )
}
