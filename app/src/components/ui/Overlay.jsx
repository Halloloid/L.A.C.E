import { useEffect } from 'react';
import { X } from 'lucide-react';

function useEscapeKey(open, onClose) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, footer }) {
  useEscapeKey(open, onClose);
  if (!open) return null;

  return (
    <div
      className="overlay-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h3 className="modal__title">{title}</h3>
          <button className="overlay-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function BottomSheet({ open, onClose, title, children, footer }) {
  useEscapeKey(open, onClose);
  if (!open) return null;

  return (
    <div
      className="overlay-backdrop overlay-backdrop--sheet"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="bottom-sheet__handle" aria-hidden="true" />
        <div className="bottom-sheet__head">
          <h3 className="bottom-sheet__title">{title}</h3>
          <button className="overlay-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="bottom-sheet__body">{children}</div>
        {footer && <div className="bottom-sheet__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function FilterSheet({ open, onClose, onApply, onReset, children }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={onReset}>
            Reset
          </button>
          <button className="btn btn--primary btn--md" onClick={onApply}>
            Apply Filters
          </button>
        </>
      }
    >
      <div className="filter-sheet__fields">{children}</div>
    </BottomSheet>
  );
}
