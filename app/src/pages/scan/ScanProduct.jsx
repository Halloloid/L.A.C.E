import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ArrowLeft, AlertCircle } from 'lucide-react';
import CameraCapture from '../../components/scan/CameraCapture';
import { MeasurementTool } from '../../components/measurement/MeasurementTool';
import { revealChildren } from '../../lib/gsap';

const TABS = [
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'upload', label: 'Upload', icon: Upload },
];

const MAX_BYTES = 20 * 1024 * 1024;

export default function ScanProduct() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const selectRef = useRef(null);
  const objectUrlRef = useRef(null);

  const [tab, setTab] = useState('camera');
  const [phase, setPhase] = useState('select'); // select | measure
  const [capture, setCapture] = useState(null); // { url, file, source }
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  /* ---------- object URL ownership ---------- */

  const adoptCapture = useCallback((next) => {
    if (objectUrlRef.current && objectUrlRef.current !== next.url) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = next.url;
    setUploadError('');
    setCapture(next);
    setPhase('measure');
  }, []);

  const discardCapture = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setCapture(null);
  }, []);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  /* ---------- upload ---------- */

  function acceptFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('That file is not an image. Choose a JPG, PNG or HEIC photo.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('That image is larger than 20 MB. Choose a smaller photo.');
      return;
    }
    adoptCapture({ file, url: URL.createObjectURL(file), source: 'upload' });
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer?.files?.[0]);
  }

  /* ---------- flow ---------- */

  function goBack() {
    if (phase === 'select') {
      navigate(-1);
      return;
    }
    discardCapture();
    setPhase('select');
  }

  function handleApply(measurement) {
    window.setTimeout(() => navigate('/processing', { state: { measurement } }), 650);
  }

  useLayoutEffect(() => {
    if (phase === 'select') revealChildren(selectRef.current, { y: 12, stagger: 0.07 });
  }, [phase, tab]);

  return (
    <div className="page scan-product">
      <div className="page__head">
        <button className="icon-back" onClick={goBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1>{phase === 'measure' ? 'Measure Barcode' : 'Scan Product'}</h1>
      </div>

      {phase === 'select' && (
        <div ref={selectRef}>
          <div className="scan-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`scan-tabs__tab ${tab === t.id ? 'is-active' : ''}`.trim()}
                onClick={() => {
                  setUploadError('');
                  setTab(t.id);
                }}
              >
                <t.icon size={16} aria-hidden="true" /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'camera' && <CameraCapture onCapture={adoptCapture} />}

          {tab === 'upload' && (
            <div className="upload-block">
              <button
                type="button"
                className={`upload-zone ${isDragging ? 'is-dragging' : ''}`.trim()}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload size={26} strokeWidth={1.5} aria-hidden="true" />
                <span>Drag image here</span>
                <span className="upload-zone__or">or</span>
                <span className="btn btn--secondary btn--sm">Browse Files</span>
                <span className="upload-zone__formats">JPG, PNG, HEIC up to 20 MB</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(e) => {
                  acceptFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />

              {uploadError && (
                <p className="upload-block__error" role="alert">
                  <AlertCircle size={15} aria-hidden="true" /> {uploadError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {phase === 'measure' && capture && (
        <div className="scan-measure">
          <MeasurementTool
            imageSrc={capture.url}
            imageAlt={capture.source === 'camera' ? 'Captured product label' : 'Uploaded product label'}
            onApply={handleApply}
            onRetake={goBack}
          />
        </div>
      )}
    </div>
  );
}
