'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const consentKey = 'myday-cookie-notice';

export function SiteUtilities() {
  const progress = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showCookieNotice, setShowCookieNotice] = useState(false);

  useEffect(() => {
    const consentFrame = requestAnimationFrame(() => {
      setShowCookieNotice(localStorage.getItem(consentKey) !== 'acknowledged');
    });
    let frame = 0;
    const update = () => {
      frame = 0;
      const maximum = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maximum > 0 ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0;
      if (progress.current) progress.current.style.transform = `scaleX(${ratio})`;
      setShowBackToTop(window.scrollY > 640);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(consentFrame); if (frame) cancelAnimationFrame(frame); };
  }, []);

  function acknowledgeCookies() {
    localStorage.setItem(consentKey, 'acknowledged');
    setShowCookieNotice(false);
  }

  return <>
    <div className="scroll-progress" aria-hidden="true"><div ref={progress} /></div>
    <Link className="floating-support" href="/contact" aria-label="Contact MYDAY support">Support</Link>
    <button className={`back-to-top${showBackToTop ? ' visible' : ''}`} type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button>
    {showCookieNotice ? <aside className="cookie-notice" aria-label="Cookie notice"><p>MYDAY uses essential browser storage for your theme and this notice. <Link href="/privacy">Privacy details ↗</Link></p><button className="button button-primary" type="button" onClick={acknowledgeCookies}>Got it</button></aside> : null}
  </>;
}
