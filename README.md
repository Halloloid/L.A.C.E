```
[Frontend]
   │
   │ 1. Uploads Image
   ▼
[Rust API Gateway & Math Engine]
   │
   ├─► 2. Calls Google Cloud Vision API directly (`reqwest` async)
   ├─► 3. Quality Gate: Evaluates OCR confidence scores (Blur Check)
   ├─► 4. Spatial Geometry: Deskews bounding boxes using trigonometry
   ├─► 5. Physical Scale Math: Calculates font height vs. Barcode ruler
   │
   │ 6. Sends Cleaned Text Spans to Python (HTTP POST)
   ▼
[Python AI Microservice]
   │
   ├─► 7. GLiNER Model: Extracts entities (`mrp`, `net_qty`, `date`, `address`)
   └─► 8. Validation Engine: Runs RapidFuzz string rules against `rules.json`
   │
   │ 9. Returns Extracted Entities + String Compliance Verdict
   ▼
[Rust API Gateway]
   │
   ├─► 10. Combines Spatial Compliance + Entity Compliance
   ▼
[Frontend Dashboard]
```