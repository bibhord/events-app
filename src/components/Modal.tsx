import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Hand-rolled rather than pulled from a library: this needs a backdrop,
 * Escape, focus on open and a portal, which is about forty lines, and a
 * modal dependency would have been more code to explain than to write.
 */
export function Modal({ title, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  // Callers pass an inline arrow, so `onClose` is a new function every parent
  // render. Depending on it directly would re-run this effect each time and
  // yank focus back to the panel mid-typing. The ref keeps the effect running
  // once while still calling the latest callback.
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });

  useEffect(() => {
    panel.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') latestClose.current();
    }
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panel}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
