"""

Rust calls POST /validate with a ValidationRequest (see models.py) once it has
finished OCR, deskewing, and barcode-based mm calibration. This service is
stateless per-request except for the loaded model and rules.json, so it's
safe to scale horizontally behind the Rust gateway.
"""

from __future__ import annotations
import logging

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from models import ValidationRequest, ValidationResponse
from engine import ValidationEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("validation_engine.main")

app = FastAPI(title="LMPC Validation Engine", version="0.1.0")
# testing. Not required for the Rust -> Python leg of your pipeline.
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # tighten to your actual frontend URL before production
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
engine = ValidationEngine()  # loaded once at startup, reused across requests


@app.get("/health")
def health():
    return {"status": "ok", "extractor": type(engine.extractor).__name__}


@app.post("/reload-rules")
def reload_rules():
    """Lets the team tweak rules.json during the hackathon without a redeploy."""
    engine.reload_rules()
    return {"status": "reloaded"}


@app.post("/validate", response_model=ValidationResponse)
def validate(request: ValidationRequest):
    if not request.raw_ocr_text or not request.raw_ocr_text.strip():
        raise HTTPException(status_code=422, detail="raw_ocr_text is empty — nothing to validate.")

    try:
        return engine.run(request)
    except Exception as e:  # noqa: BLE001
        logger.exception("Validation failed for image_id=%s", request.image_id)
        return JSONResponse(
            status_code=500,
            content={"error": "validation_engine_internal_error", "detail": str(e), "image_id": request.image_id},
        )
