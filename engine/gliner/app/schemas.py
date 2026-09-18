from pydantic import BaseModel, Field
from typing import List

class GlinerRequest(BaseModel):
    """
    Data structure defining what the L.A.C.E. backend must send to this service.
    """
    text: str = Field(
        ..., 
        description="The raw unformatted text stream extracted from the OCR engine.",
        json_schema_extra={"example": "M.R.P. ₹120.00 Net Quantity 500 g Batch No. B1234"}
    )
    labels: List[str] = Field(
        default=["MRP", "quantity", "date", "batch number", "address"],
        description="The target zero-shot labels GLiNER should hunt for within the text stream."
    )
    threshold: float = Field(
        default=0.4,
        description="The confidence filter. Keeping it slightly lower allows overlapping tokens through for deterministic cleanup.",
        ge=0.0,
        le=1.0
    )

class EntityPrediction(BaseModel):
    """
    A single target slice extracted from the OCR stream.
    """
    label: str = Field(..., description="The matched entity category.")
    text: str = Field(..., description="The explicit slice of text isolated by the model.")
    start: int = Field(..., description="The absolute starting character coordinate within the string.")
    end: int = Field(..., description="The absolute ending character coordinate within the string.")
    score: float = Field(..., description="Confidence score showing how sure the model is.")

class GlinerResponse(BaseModel):
    """
    The structured contract returned back to the Rust orchestration backend.
    """
    entities: List[EntityPrediction] = Field(
        ..., 
        description="Collection of candidate entities found. Upstream code will filter and finalize compliance decisions."
    )
