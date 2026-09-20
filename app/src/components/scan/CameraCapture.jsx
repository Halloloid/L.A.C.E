import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CameraOff, RefreshCw } from 'lucide-react';
import { gsap } from '../../lib/gsap';

/**
 * Live rear-facing camera preview with a single capture action.
 *
 * The stream is owned entirely by this component: it is requested on mount and every
 * track is stopped on unmount, so leaving camera mode always releases the device.
 * The captured frame is handed back as a real File + object URL via onCapture.
 */
export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const shutterRef = useRef(null);

  // idle | requesting | live | denied | unsupported | error
  const [status, setStatus] = useState('idle');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        // The user may have navigated away while the permission prompt was open.
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            /* autoplay rejection is non-fatal — the poster frame still renders */
          }
        }
        setStatus('live');
      } catch (err) {
        if (cancelled) return;
        const name = err?.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setStatus('unsupported');
        else setStatus('error');
      }
    }

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [attempt, stopStream]);

  useLayoutEffect(() => {
    if (status !== 'live' || !frameRef.current) return;
    gsap.fromTo(
      frameRef.current,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, [status]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || busy) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    setBusy(true);
    if (shutterRef.current) {
      gsap.fromTo(
        shutterRef.current,
        { opacity: 0.85 },
        { opacity: 0, duration: 0.4, ease: 'power2.out' }
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setBusy(false);
          return;
        }
        const file = new File([blob], `lace-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        stopStream();
        onCapture?.({ file, url, width, height, source: 'camera' });
      },
      'image/jpeg',
      0.92
    );
  }

  if (status === 'denied' || status === 'unsupported' || status === 'error') {
    const copy = {
      denied: {
        title: 'Camera access blocked',
        body: 'Allow camera access for this site in your browser settings, then try again.',
      },
      unsupported: {
        title: 'No camera available',
        body: 'This device or browser cannot provide a camera feed. Upload a label image instead.',
      },
      error: {
        title: 'Camera could not start',
        body: 'Something interrupted the camera stream. Try again, or upload a label image instead.',
      },
    }[status];

    return (
      <div className="camera-frame camera-frame--fallback">
        <div className="camera-fallback">
          <CameraOff size={26} strokeWidth={1.5} aria-hidden="true" />
          <p className="camera-fallback__title">{copy.title}</p>
          <p className="camera-fallback__body">{copy.body}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAttempt((n) => n + 1)}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-frame">
      <div className="camera-frame__viewport" ref={frameRef}>
        <video
          ref={videoRef}
          className="camera-frame__video"
          playsInline
          muted
          autoPlay
          aria-label="Live camera preview"
        />
        <span className="camera-frame__guide" aria-hidden="true" />
        <span className="camera-frame__shutter" ref={shutterRef} aria-hidden="true" />
        {status !== 'live' && <p className="camera-frame__status">Starting camera…</p>}
      </div>

      <p className="camera-frame__hint">Align the label inside the frame.</p>

      <button
        type="button"
        className="camera-frame__capture"
        onClick={handleCapture}
        disabled={status !== 'live' || busy}
        aria-label="Capture photo"
      />
    </div>
  );
}
