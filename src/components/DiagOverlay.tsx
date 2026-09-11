import { useEffect, useState } from 'react';

/**
 * Hidden diagnostics overlay for remote debugging (phones we can't touch).
 * Open any page with ?diag=1 — shows real viewport/DPR/SW state on screen.
 * Renders nothing otherwise. Remove before any security audit if desired.
 */
export default function DiagOverlay() {
  const [show, setShow] = useState(false);
  const [info, setInfo] = useState('');

  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    if (params.get('diag') !== '1') return;
    const update = () => {
      setInfo(
        `w=${window.innerWidth} h=${window.innerHeight} dpr=${window.devicePixelRatio} ` +
          `sw=${'serviceWorker' in navigator ? 'yes' : 'no'} `
      );
    };
    update();
    setShow(true);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      dir="ltr"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#111827',
        color: '#F9FAFB',
        fontSize: 12,
        padding: '8px 12px',
        fontFamily: 'monospace',
        textAlign: 'left',
      }}
    >
      DIAG {info} ua={navigator.userAgent.slice(0, 80)}
    </div>
  );
}
