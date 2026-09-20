# L.A.C.E - Legal Automated Compliance Engine

![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-blue)
![Status](https://img.shields.io/badge/Status-Active-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Problem Statement

In India, regulatory compliance verification for product labels is a critical but manual, time-consuming process. Inspectors must manually verify compliance with standards like FSSAI labeling requirements, including:
- MRP (Maximum Retail Price) declaration
- Expiry dates
- Manufacturing dates
- Nutritional information
- Address validity
- Font sizes and spacing

**Current Pain Points:**
- High error rates due to manual inspection
- Inconsistent compliance verification
- Slow processing times
- Lack of audit trails
- Resource-intensive manual review

## Solution: L.A.C.E

**L.A.C.E** (Legal Automated Compliance Engine) is an AI-powered inspection platform that automates compliance verification for product labels and documents. It combines **computer vision**, **OCR**, and **deterministic legal validation rules** to ensure consistent, accurate, and auditable compliance checks.

### Key Differentiators:
- Deterministic Validation - Rule-based, reproducible compliance checks (no ML bias)
- High Accuracy - Multi-stage processing pipeline with quality gates
- Human-in-the-Loop - Escalation to inspectors for edge cases
- Audit Trail - Complete documentation of all inspections
- Fast Processing - Asynchronous backend for handling high volumes
- Scalable - Cloud-ready architecture with horizontal scaling

---

## Features

### 1. **Image Quality Validation**
- Automated blur detection using Laplacian filters
- Image clarity scoring
- Early rejection of poor-quality images

### 2. **Multi-Stage OCR Processing**
- Google Cloud Vision API (development)
- PaddleOCR + ONNX (production)
- Fallback mechanisms for robustness
- Confidence scoring for OCR results

### 3. **Intelligent Text Extraction**
- Query-based zero-shot span extraction
- Entity recognition (MRP, quantity, date, address, batch number)
- Structured parsing of legal information

### 4. **Deterministic Legal Validation**
- MRP format validation
- Address format and completeness checking
- Date format validation (DD/MM/YYYY)
- Font size compliance checks
- Regex-based pattern matching
- LMPC (Legal Mandatory Label Components) declaration validation

### 5. **Geometric Processing & Deskewing**
- 3D inverse rotation matrix corrections
- Physical measurement calibration
- Barcode-based scale calibration
- Font height conversion (pixels → mm)
- Axis-aligned bounding box calculations

### 6. **Compliance Reporting**
- Detailed compliance verdicts
- Pass/Fail decision gates
- PDF report generation
- Audit trail documentation

### 7. **Inspector Dashboard**
- User-friendly interface for image upload
- Real-time compliance results
- Manual review capability for failed validations
- Export compliance reports

---

## Architecture

### System Layers
<img width="1751" height="809" alt="white_architecture drawio" src="https://github.com/user-attachments/assets/6c1a4de0-0ec6-4f24-87e4-5d4d6de4b2a1" />

### Process Flow

```
Image Upload → Quality Check → OCR → Text Extraction 
    → Geometry Processing → Legal Validation 
    → Compliance Report → PDF Export
```

---

## Technology Stack

### Frontend
- **React + Vite** - Interactive inspector dashboard
- **Modern UI** - Responsive design for desktop and tablet

### Backend (Primary)
- **Rust + Axum** - High-performance async web framework
- **Tokio** - Asynchronous runtime for concurrent processing
- **reqwest** - Async HTTP client for external API calls

### Image Processing & Math
- **Rust nalgebra** - Matrix mathematics for geometry processing

### Vision & OCR
- **Google Cloud Vision API** - MVP development
- **PaddleOCR + ONNX** - Production on-device OCR

### Entity Extraction & Text Validation
- **GLiNER** - Zero-shot entity recognition (Python microservice)
- **RapidFuzz** - Fuzzy string matching for validation rules

### Data & Database
- **PostgreSQL** - Audit logs and inspection history

### Local database setup

The API uses SQLx migrations and PostgreSQL. Start the complete local stack with:

```powershell
docker compose up --build
```

The Compose stack creates a persistent `lace-postgres-data` volume and runs the
migrations automatically when the API starts. For running the Rust API outside
Compose, set `DATABASE_URL` to a local PostgreSQL instance before starting it.

The inspection schema stores:

- Inspection identity, status, pipeline stage, and timestamps.
- Product and inspector references.
- Flexible declarations and measurement JSON.
- Individual rule results and violations.
- Uploaded-image metadata and processing-stage events.

The database is deliberately separate from the frontend response format:
PostgreSQL stores normalized queryable records plus JSON fields for evolving OCR
and validation details, while the API assembles the `Inspection` response
expected by the dashboard and report screens.


---

## Security & Compliance

- Deterministic Validation - No ML bias, reproducible results
- Audit Trails - Complete inspection history logged
- Role-Based Access - Inspector-only dashboard access
- Data Privacy - GDPR compliant local processing (on-device OCR available)
- Image Handling - Temporary storage with automatic cleanup
- Error Handling - Graceful degradation and fallback mechanisms

---

## Performance Metrics

- **Average Processing Time**: ~2-5 seconds per image
- **OCR Accuracy**: 95%+ (with quality images)
- **Validation Accuracy**: 99%+ (deterministic rules)
- **Throughput**: Up to 100 images/minute with horizontal scaling
- **Availability**: 99.5% uptime target

---

### Development Standards
- Follow Rust idioms (backend)
- Follow React best practices (frontend)
- Write unit tests for new features
- Update documentation accordingly
- Ensure CI/CD checks pass

---

## License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## Team

**L.A.C.E** is developed as part of **Smart India Hackathon 2026**.

### Team Members
- Architecture & Backend Design
- Frontend & UI/UX
- AI/ML & Entity Extraction
- Testing & QA
