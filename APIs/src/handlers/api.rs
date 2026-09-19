use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::{Column, PgPool, Row};

use crate::handlers::check::extract_image_request;
use crate::{
    models::inspection::{
        CalibrationRequest, InspectionCreated, InspectionStatus, InspectionStatusResponse,
    },
    repositories::inspection,
    services::check::check_service,
};

type ApiResult<T> = Result<Json<T>, (StatusCode, Json<Value>)>;
fn err(code: StatusCode, message: impl Into<String>) -> (StatusCode, Json<Value>) {
    (code, Json(json!({"error":message.into()})))
}
fn db<T>(r: Result<T, sqlx::Error>) -> ApiResult<T> {
    r.map(Json)
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn create_inspection(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> ApiResult<InspectionCreated> {
    let request = extract_image_request(&mut multipart).await?;
    let content_type = request.content_type.clone();
    let image_bytes = request.image.clone();

    let check_res = check_service(request)
        .await
        .map_err(|e| err(StatusCode::UNPROCESSABLE_ENTITY, e.message()))?;

    let (id, status_str) =
        inspection::create_inspection(&pool, &check_res, &image_bytes, &content_type)
            .await
            .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = match status_str.as_str() {
        "compliant" => InspectionStatus::Compliant,
        "warning" => InspectionStatus::Warning,
        "noncompliant" => InspectionStatus::Noncompliant,
        "failed" => InspectionStatus::Failed,
        _ => InspectionStatus::Processing,
    };

    Ok(Json(InspectionCreated { id, status }))
}

pub async fn calibrate(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
    Json(request): Json<CalibrationRequest>,
) -> ApiResult<Value> {
    if request.reference_mm <= 0.0 || request.pixel_length <= 0.0 {
        return Err(err(
            StatusCode::BAD_REQUEST,
            "referenceMm and pixelLength must be positive",
        ));
    }
    if !inspection::calibrate(&pool, &id, request.reference_mm, request.pixel_length)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    {
        return Err(err(StatusCode::NOT_FOUND, "Inspection not found"));
    }
    Ok(Json(
        json!({"id":id,"status":"processing","measurement":{"referenceMm":request.reference_mm,"pixelLength":request.pixel_length}}),
    ))
}

pub async fn inspection_status(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> ApiResult<InspectionStatusResponse> {
    let row = sqlx::query("SELECT status,pipeline_stage FROM inspections WHERE public_id=$1")
        .bind(&id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Inspection not found"))?;
    let status = match row.get::<String, _>("status").as_str() {
        "compliant" => InspectionStatus::Compliant,
        "warning" => InspectionStatus::Warning,
        "noncompliant" => InspectionStatus::Noncompliant,
        "failed" => InspectionStatus::Failed,
        _ => InspectionStatus::Processing,
    };
    Ok(Json(InspectionStatusResponse {
        id,
        status,
        stage: row.get("pipeline_stage"),
    }))
}
pub async fn get_inspection(
    State(pool): State<PgPool>,
    Path(id): Path<String>,
) -> ApiResult<crate::models::inspection::Inspection> {
    inspection::get_inspection(&pool, &id)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .map(Json)
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "Inspection not found"))
}
#[derive(Deserialize)]
pub struct Limit {
    pub limit: Option<i64>,
}
pub async fn list_inspections(
    State(pool): State<PgPool>,
    Query(q): Query<Limit>,
) -> ApiResult<Vec<crate::models::inspection::InspectionListItem>> {
    db(inspection::list_inspections(&pool, q.limit.unwrap_or(20).clamp(1, 100)).await)
}
pub async fn products(
    State(pool): State<PgPool>,
) -> ApiResult<Vec<crate::models::inspection::Product>> {
    db(inspection::products(&pool).await)
}

pub async fn violations(
    State(pool): State<PgPool>,
    Query(q): Query<StatusQuery>,
) -> ApiResult<Vec<Value>> {
    let status = q.status.unwrap_or_else(|| "open".into());
    let rows=sqlx::query("SELECT id,inspection_id,rule_key,severity,status,title,description,created_at FROM violations WHERE status=$1 ORDER BY created_at DESC")
        .bind(status).fetch_all(&pool).await.map_err(|e|err(StatusCode::INTERNAL_SERVER_ERROR,e.to_string()))?;
    Ok(Json(rows.into_iter().map(|r|json!({"id":r.get::<uuid::Uuid,_>("id"),"inspectionId":r.get::<uuid::Uuid,_>("inspection_id"),"ruleKey":r.get::<String,_>("rule_key"),"severity":r.get::<String,_>("severity"),"status":r.get::<String,_>("status"),"title":r.get::<String,_>("title"),"description":r.get::<Option<String>,_>("description"),"createdAt":r.get::<chrono::DateTime<chrono::Utc>,_>("created_at")})).collect()))
}
#[derive(Deserialize)]
pub struct StatusQuery {
    pub status: Option<String>,
}
pub async fn dashboard_metrics(State(pool): State<PgPool>) -> ApiResult<Value> {
    let row=sqlx::query("SELECT count(*) total, count(*) FILTER (WHERE status='compliant') compliant, count(*) FILTER (WHERE status='warning') warnings, count(*) FILTER (WHERE status='noncompliant') failed FROM inspections").fetch_one(&pool).await.map_err(|e|err(StatusCode::INTERNAL_SERVER_ERROR,e.to_string()))?;
    Ok(Json(
        json!({"total":row.get::<i64,_>("total"),"compliant":row.get::<i64,_>("compliant"),"warnings":row.get::<i64,_>("warnings"),"failed":row.get::<i64,_>("failed")}),
    ))
}
pub async fn analytics_trend(State(pool): State<PgPool>) -> ApiResult<Vec<Value>> {
    analytics_rows(&pool,"SELECT date_trunc('day',created_at) day,count(*) total FROM inspections GROUP BY 1 ORDER BY 1").await
}
pub async fn analytics_by_category(State(pool): State<PgPool>) -> ApiResult<Vec<Value>> {
    analytics_rows(
        &pool,
        "SELECT category,count(*) total FROM inspections GROUP BY category ORDER BY total DESC",
    )
    .await
}
async fn analytics_rows(pool: &PgPool, sql: &'static str) -> ApiResult<Vec<Value>> {
    let rows = sqlx::query(sql)
        .fetch_all(pool)
        .await
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(
        rows.into_iter()
            .map(|r| {
                let mut o = serde_json::Map::new();
                for col in r.columns() {
                    let n = col.name();
                    if n == "day" {
                        o.insert(
                            "date".into(),
                            json!(r.get::<chrono::DateTime<chrono::Utc>, _>(n)),
                        );
                    } else if n == "category" {
                        o.insert("category".into(), json!(r.get::<String, _>(n)));
                    } else {
                        o.insert(n.into(), json!(r.get::<i64, _>(n)));
                    }
                }
                Value::Object(o)
            })
            .collect(),
    ))
}
pub async fn analytics_summary(State(pool): State<PgPool>) -> ApiResult<Value> {
    let row = sqlx::query(
        "SELECT count(*) total, count(*) FILTER (WHERE status='compliant') compliant,
         count(*) FILTER (WHERE status='warning') warnings,
         count(*) FILTER (WHERE status='noncompliant') failed FROM inspections",
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({
        "total": row.get::<i64, _>("total"),
        "compliant": row.get::<i64, _>("compliant"),
        "warnings": row.get::<i64, _>("warnings"),
        "failed": row.get::<i64, _>("failed")
    })))
}
