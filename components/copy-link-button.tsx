'use client';

import { useState } from 'react';

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return <button className="button" type="button" onClick={() => void copy()} aria-live="polite">{copied ? 'Link copied ✓' : 'Copy date link'}</button>;
}
