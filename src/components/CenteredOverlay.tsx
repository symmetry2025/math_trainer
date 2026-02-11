'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function CenteredOverlay(props: { children: React.ReactNode; open: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!props.open) return null;
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      {/* Full-screen backdrop */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />

      {/* Center content relative to the working area (exclude sidebar width on md+) */}
      <div className="absolute inset-y-0 left-0 right-0 md:left-[var(--smmtry-sidebar-w,0px)] grid place-items-center">
        {props.children}
      </div>
    </div>,
    document.body,
  );
}

