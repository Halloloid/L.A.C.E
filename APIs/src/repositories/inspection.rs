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
    res: &crate::models::check::CheckImageResponse,
    image_bytes: &[u8],
    content_type: &str,
) -> Result<(String, String), sqlx::Error> {
    let mut tx: Transaction<'_, Postgres> = pool.begin().await?;
    ensure_demo_user_tx(&mut tx).await?;

    let public_id = Uuid::new_v4().to_string();

    let status_str = if res.blur {
        "failed"
    } else if let Some(val) = &res.validation {
        match val.overall_verdict {
            crate::models::validation::OverallVerdict::Pass => "compliant",
            crate::models::validation::OverallVerdict::Warning => "warning",
            _ => "noncompliant",
        }
    } else {
        "processing"
    };

    let measurement_json = if let Some(scale) = &res.scale {
        json!({
            "referenceMm": scale.barcode_length_cm,
            "scaleMmPerPx": scale.pixels_per_cm,
            "detectedTextPx": scale.barcode_length_px,
            "physicalTextMm": scale.barcode_length_cm
        })
    } else {
        json!(null)
    };

    let mut declarations_map = serde_json::Map::new();
    if let Some(val) = &res.validation {
        let manufacturer = val
            .entities
            .get("manufacturer_name")
            .or_else(|| val.entities.get("manufacturer"));

        let brand = val.entities.get("brand").or(manufacturer);

        let product_name = val
            .entities
            .get("product_name")
            .or_else(|| val.entities.get("productName"))
            .or(brand)
            .or(manufacturer);

        if let Some(b) = brand {
            declarations_map.insert("brand".to_string(), json!(b));
        }
        if let Some(p) = product_name {
            declarations_map.insert("productName".to_string(), json!(p));
        }
        if let Some(tagline) = val.entities.get("tagline") {
            declarations_map.insert("tagline".to_string(), json!(tagline));
        }
        if let Some(m) = manufacturer {
            declarations_map.insert("manufacturer".to_string(), json!(m));
        }
        if let Some(net_quantity) = val
            .entities
            .get("net_quantity")
            .or_else(|| val.entities.get("netQuantity"))
        {
            declarations_map.insert("netQuantity".to_string(), json!(net_quantity));
        }
        if let Some(mrp) = val.entities.get("mrp") {
            declarations_map.insert("mrp".to_string(), json!(mrp));
        }
        if let Some(mfg_date) = val
            .entities
            .get("manufacturing_date")
            .or_else(|| val.entities.get("mfgDate"))
        {
            declarations_map.insert("mfgDate".to_string(), json!(mfg_date));
        }
        if let Some(consumer_care) = val
            .entities
            .get("consumer_care_detail")
            .or_else(|| val.entities.get("consumer_care"))
        {
            declarations_map.insert("consumer_care".to_string(), json!(consumer_care));
        }
        if let Some(batch) = val.entities.get("batch") {
            declarations_map.insert("batch".to_string(), json!(batch));
        }
    }
    let declarations_json = serde_json::Value::Object(declarations_map);

    let manufacturer_name = res
        .validation
        .as_ref()
        .and_then(|val| {
            val.entities
                .get("manufacturer_name")
                .or_else(|| val.entities.get("manufacturer"))
        })
        .cloned();

    let brand_name = res
        .validation
        .as_ref()
        .and_then(|val| val.entities.get("brand"))
        .cloned()
        .or_else(|| manufacturer_name.clone());

    let product_name = res
        .validation
        .as_ref()
        .and_then(|val| {
            val.entities
                .get("product_name")
                .or_else(|| val.entities.get("productName"))
        })
        .cloned()
        .or_else(|| brand_name.clone())
        .or_else(|| manufacturer_name.clone());

    let product_id = if let Some(name) = product_name.as_deref().filter(|v| !v.is_empty()) {
        let existing = sqlx::query("SELECT id FROM products WHERE name = $1 LIMIT 1")
            .bind(name)
            .fetch_optional(&mut *tx)
            .await?
            .map(|r| r.get::<Uuid, _>("id"));

        if let Some(id) = existing {
            Some(id)
        } else {
            let new_id: Uuid = sqlx::query(
                "INSERT INTO products (name, brand, category) VALUES ($1, $2, 'general') RETURNING id",
            )
            .bind(name)
            .bind(brand_name.as_deref())
            .fetch_one(&mut *tx)
            .await?
            .get("id");
            Some(new_id)
        }
    } else {
        None
    };

    let mut passed_count = 0;
    let mut warning_count = 0;
    let mut failed_count = 0;

    if let Some(val) = &res.validation {
        let all_verdicts = val
            .field_verdicts
            .iter()
            .chain(&val.declaration_verdicts)
            .chain(&val.font_size_verdicts);
        for v in all_verdicts {
            match v.status {
                crate::models::validation::VerdictStatus::Pass => passed_count += 1,
                crate::models::validation::VerdictStatus::Warning => warning_count += 1,
                crate::models::validation::VerdictStatus::Fail
                | crate::models::validation::VerdictStatus::Missing => failed_count += 1,
            }
        }
    }

    let summary_json = json!({
        "passed": passed_count,
        "warnings": warning_count,
        "failed": failed_count
    });

    let inspection_id: Uuid = sqlx::query(
        "INSERT INTO inspections (public_id, inspector_id, product_id, category, status, pipeline_stage, source_filename, raw_ocr_text, declarations, measurement, summary)
         VALUES ($1, $2, $3, 'general', $4, 'validated', $5, $6, $7, $8, $9) RETURNING id",
    )
    .bind(&public_id)
    .bind(DEMO_USER_ID)
    .bind(product_id)
    .bind(status_str)
    .bind(&res.filename)
    .bind(&res.ocr_text)
    .bind(&declarations_json)
    .bind(&measurement_json)
    .bind(&summary_json)
    .fetch_one(&mut *tx)
    .await?
    .get("id");

    sqlx::query(
        "INSERT INTO inspection_images (inspection_id, storage_key, content_type, size_bytes)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(inspection_id)
    .bind(format!("uploads/{public_id}"))
    .bind(content_type)
    .bind(image_bytes.len() as i64)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO inspection_events (inspection_id, stage, status, message)
         VALUES ($1, 'validated', $2, $3)",
    )
    .bind(inspection_id)
    .bind(status_str)
    .bind(res.message)
    .execute(&mut *tx)
    .await?;

    if let Some(val) = &res.validation {
        let all_verdicts = val
            .field_verdicts
            .iter()
            .chain(&val.declaration_verdicts)
            .chain(&val.font_size_verdicts);
        for v in all_verdicts {
            let rule_status = match v.status {
                crate::models::validation::VerdictStatus::Pass => "pass",
                crate::models::validation::VerdictStatus::Warning => "warning",
                crate::models::validation::VerdictStatus::Fail => "fail",
                crate::models::validation::VerdictStatus::Missing => "missing",
            };
            let _ = sqlx::query(
                "INSERT INTO inspection_rules (inspection_id, rule_key, status, extracted, note)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (inspection_id, rule_key) DO UPDATE SET status = EXCLUDED.status, extracted = EXCLUDED.extracted, note = EXCLUDED.note",
            )
            .bind(inspection_id)
            .bind(&v.field)
            .bind(rule_status)
            .bind(&v.extracted_value)
            .bind(&v.reason)
            .execute(&mut *tx)
            .await;
        }
    }

    tx.commit().await?;
    Ok((public_id, status_str.to_string()))
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
