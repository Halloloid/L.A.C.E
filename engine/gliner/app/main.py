import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from app.schemas import GlinerRequest, GlinerResponse, EntityPrediction
from app.model import gliner_container

# Configure clean, uniform application logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gliner_service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the microservice lifecycle. Warms up the model cache
    and registers weights into RAM/VRAM exactly once during startup.
    """
    try:
        gliner_container.load_model("gliner-community/gliner_small-v2.5")
        yield
    except Exception as e:
        logger.critical(f"Microservice failed to initialize model container: {str(e)}")
        raise e
    finally:
        logger.info("Shutting down GLiNER microservice.")

# Initialize the FastAPI instance with our structural lifespan hook
app = FastAPI(
    title="L.A.C.E. GLiNER Microservice",
    description="Zero-shot token extraction API for identifying compliance-relevant target entities from raw label OCR text.",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Liveness and readiness probe for container orchestration.
    Ensures traffic isn't routed to a dead or uninitialized worker thread.
    """
    if gliner_container.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model engine is uninitialized or failed its load sequence."
        )
    return {"status": "healthy", "device": gliner_container.device}

@app.post("/extract", response_model=GlinerResponse, status_code=status.HTTP_200_OK)
async def extract_entities(payload: GlinerRequest):
    """
    Accepts raw unformatted text inputs, extracts target entities using GLiNER,
    and returns a strictly typed collection of structured text spans back to L.A.C.E.
    """
    try:
        raw_predictions = gliner_container.predict(
            text=payload.text,
            labels=payload.labels,
            threshold=payload.threshold
        )
        
        # Explicitly map the dictionary components into Pydantic models
        entities = [
            EntityPrediction(
                label=pred["label"],
                text=pred["text"],
                start=pred["start"],
                end=pred["end"],
                score=round(float(pred["score"]), 4)
            )
            for pred in raw_predictions
        ]
        
        return GlinerResponse(entities=entities)

    except RuntimeError as re:
        logger.error(f"Runtime inference error encountered: {str(re)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=str(re)
        )
    except Exception as e:
        logger.error(f"Unhandled service failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="An error occurred during entity extraction processing."
        )
