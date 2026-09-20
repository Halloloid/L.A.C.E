# L.A.C.E - Design Architecture

## Overview

L.A.C.E (Legal Automated Compliance Engine) is an intelligent inspection and compliance validation system designed to automate the verification of legal documents and compliance artifacts. The system combines computer vision, optical character recognition (OCR), and deterministic legal validation to ensure accuracy and compliance in document inspection workflows.

---

## System Architecture
<img width="1751" height="809" alt="white_architecture drawio" src="https://github.com/user-attachments/assets/5dda8db6-3d78-463b-a9b7-f0a4867efa4d" />

### Architecture Layers

The system is organized into **7 distinct layers**, each handling a specific aspect of the inspection pipeline:

#### 1. **User/Inspection Interface Layer**
- **Purpose**: Provides user interaction and image input management
- **Components**:
  - Inspector/Officer Dashboard
  - Capture/Upload Image functionality
  - Preview and Submit interface
  - Display Compliance Results
- **Responsibility**: Manages user input and displays validation results

#### 2. **Application/Request Handling Layer**
- **Purpose**: Routes and processes requests through the L.A.C.E processing pipeline
- **Components**:
  - Receive Product Image
  - Route Image to Compliance Pipeline
  - L.A.C.E Compliance Processing Pipeline
- **Responsibility**: Acts as the orchestrator between UI and processing engine

#### 3. **Image Quality Control Layer**
- **Purpose**: Ensures image quality before processing
- **Components**:
  - Convert to Greyscale
  - Detect Blur (Laplacian filter)
  - Compute Variance
  - HTTP 422 Response (if quality fails)
- **Responsibility**: Validates image quality and rejects poor-quality images early in the pipeline

#### 4. **Vision/OCR Processing Layer**
- **Purpose**: Extracts text and visual data from images
- **Components**:
  - Product Image input
  - Google Cloud Vision (MVP)
  - OCR Vision Engine
  - PaddleOCR + ONNX (Production)
  - Package OCR Result Process
  - OCR Results output
- **Responsibility**: Converts images to machine-readable text data

#### 5. **Deterministic Legal Validation Engine**
- **Purpose**: Core validation logic for legal compliance checking
- **Components**:
  - **RAW OCR String Analysis**
  - **Query Zero-Shot Span Extraction**: Identifies specific information
  - **Structured Legal Parse Span**: Organizes extracted data
  - **Validation Checkers**:
    - MRP Validation
    - Address Validation Checker
    - Date Validation Checker
    - Regex Validation Checker
  - **Declaration Validation**
  - **Font Size Validation**
- **Decision Logic**: 
  - If validation passes → Continue to next layer
  - If validation fails → HUMAN REVIEW needed
  - If all rules pass → Proceed to Compliance Report
- **Responsibility**: Implements deterministic rules for legal compliance verification

#### 6. **Geometry Processing/Deskewing Layer**
- **Purpose**: Corrects image orientation and measures physical dimensions
- **Components**:
  - **Rotated Text Augmentation**
  - **Apply 3D Inverse Rotation Matrix**: Corrects orientation
  - **Calculate Correct Height**
  - **Input Barcode Length**
  - **Calibrated Measurements**
  - **Scale Calibration/Physical Measurement Layer**:
    - Scale Calibration
    - Calculate Principal Distance (from Scale Factor)
    - Calculate Panel Area
    - Convert Font Height (px → mm)
    - Axis-Aligned Bounding Box & HPX Calculation
- **Responsibility**: Ensures geometric accuracy for physical measurements

#### 7. **Verdict Reporting and Trust Layers**
- **Purpose**: Final validation and compliance certification
- **Components**:
  - **Pre-Filing Validation Results**
  - **Compliance Inspection Results**
  - **Compliance Status check**:
    - Pass: Proceed to PDF export
    - Fail: Require Human Review/Inspection
- **Responsibility**: Final decision gate for compliance certification

---

## Process Flow Diagram

```
┌─────────────────┐
│  Capture Image  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Image Quality Check     │
│ (Blur Detection)        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│      OCR        │
│ (Text Extract)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Text Extract            │
│ (NLP Processing)        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Geometry and Scale      │
│ (Deskewing & Rotation)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ LMPC Validation         │
│ (Legal Rules)           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Compliance Report       │
│ (Generate Results)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Export as PDF           │
│ (Final Output)          │
└─────────────────────────┘
```

---

## Technology Stack

### Frontend
- **React + Vite**: Builds the inspector dashboard and handles user/image input
- **Functionality**: 
  - High-performance interactive dashboard
  - Image capture and upload
  - Real-time compliance results display

### Backend (Primary)
- **Rust + Axum**: High-performance backend that routes requests and manages the inspection pipeline
- **Functionality**:
  - Asynchronous HTTP request handling
  - Pipeline orchestration
  - Request validation and routing

### Async Runtime
- **Tokio**: Handles asynchronous, non-blocking backend operations
- **Functionality**:
  - Concurrent request processing
  - Non-blocking I/O operations

### Image & Geometry Processing
- **Rust nalgebra / Math**: Performs image geometry, coordinate transformations, deskewing, and spatial calculations
- **Functionality**:
  - Image rotation and transformation matrices
  - Spatial coordinate calculations
  - Physical measurement conversions

### External API Requests
- **Rust reqwest**: Sends asynchronous HTTP requests to external AI/OCR services
- **Functionality**:
  - Communication with Google Cloud Vision API
  - External service integration

### Vision & OCR Services
- **Google Cloud Vision API**: Extracts entities (MRP, quantity, date, address, batch number) from OCR text
- **Functionality**:
  - Entity extraction
  - Confidence scoring
  - Bounding box coordinates

- **PaddleOCR + ONNX (Production)**: On-device OCR engine for production deployments
- **Functionality**:
  - Offline OCR capabilities
  - Optimized performance

### Text Matching & Validation
- **RapidFuzz**: Performs fuzzy string matching for LMPC validation
- **Functionality**:
  - Validates mandatory LMPC declarations
  - Handles minor text variations (typos, formatting)

---

## Data Flow

### Input
```
User/Inspector → Capture/Upload Image
                → Route to Backend
                → L.A.C.E Pipeline
```

### Processing
```
Image Quality Check
  ↓ (pass)
Vision/OCR Processing
  ↓
Text Extraction & NLP
  ↓
Geometry Processing
  ↓
Deterministic Legal Validation
  ↓
Compliance Verification
  ↓ (pass)
Report Generation
```

### Output
```
Compliance Status (Pass/Fail)
  → PDF Export
  → Inspector Dashboard Display
  → Audit Trail
```

---

## Key Features

### 1. **Image Quality Validation**
- Automatic blur detection using Laplacian filters
- Variance computation for image clarity
- Rejects low-quality images early to prevent downstream errors

### 2. **Multi-Stage OCR Processing**
- Google Cloud Vision (development/MVP)
- PaddleOCR with ONNX (production deployment)
- Fallback mechanisms for robustness

### 3. **Deterministic Legal Validation**
- Rule-based validation engine (not ML-dependent)
- Ensures reproducibility and legal compliance
- Validators for:
  - MRP (Maximum Retail Price)
  - Address format
  - Date format
  - Regex patterns
  - Font sizes
  - Declaration text

### 4. **Geometric Accuracy**
- 3D inverse rotation matrix for image deskewing
- Physical measurement calibration
- Axis-aligned bounding box calculations
- HPX (Height in Pixels) conversions

### 5. **Human-in-the-Loop**
- Failed validations route to human reviewers
- Inspector dashboard for manual verification
- Compliance decision gate before PDF export

### 6. **PDF Export**
- Generates compliance reports
- Audit trail documentation
- Exportable results for record-keeping

---

## Validation Rules

### Deterministic Legal Validation Engine Rules:

1. **MRP Validation**: Ensures Maximum Retail Price format compliance
2. **Address Validation**: Validates address format and completeness
3. **Date Validation**: Checks date format and validity (DD/MM/YYYY)
4. **Regex Validation**: Pattern matching for specific fields
5. **Font Size Validation**: Ensures font meets legal requirements
6. **LMPC Declaration**: Validates mandatory legal declarations
7. **Barcode/Quantity**: Ensures quantity declaration presence

---

## Error Handling & Fallbacks

- **Image Quality Failure** → HTTP 422 Response, require re-upload
- **OCR Failure** → Fall back to secondary OCR provider
- **Validation Failure** → Route to human review
- **Geometry Processing Error** → Flag for manual inspection

---

## Security & Compliance

- Deterministic validation ensures reproducible results
- No ML model bias in compliance decisions
- Audit trail for all inspections
- Human oversight for failed validations
- GDPR compliant data handling (images processed locally where possible)

---

**Created for Smart India Hackathon 2026 - SIH Idea Submission**
