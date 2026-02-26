'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function TopRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const runningRef = useRef(false);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const hideRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (hideRef.current != null) {
      window.clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    clearTimers();
    runningRef.current = true;
    startedAtRef.current = Date.now();
    setVisible(true);
    setProgress(12);
    tickRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        return prev + (prev < 45 ? 8 : 3);
      });
    }, 140);
  }, [clearTimers]);

  const done = useCallback(() => {
    if (!runningRef.current && !visible) return;
    const finalize = () => {
      runningRef.current = false;
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setProgress(100);
      hideRef.current = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 260);
    };

    const minVisibleMs = 520;
    const elapsed = Date.now() - startedAtRef.current;
    const wait = Math.max(0, minVisibleMs - elapsed);

    hideRef.current = window.setTimeout(() => {
      // Route paint sonrası kapanması için bir frame beklet.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          finalize();
        });
      });
    }, wait);
  }, [visible]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.dataset.noLoader === 'true') return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const nextPath = `${url.pathname}${url.search}`;
        const currentPath = `${window.location.pathname}${window.location.search}`;
        if (nextPath === currentPath) return;
        start();
      } catch {
        // ignore malformed URLs
      }
    };

    const onPopState = () => start();

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [start]);

  useEffect(() => {
    if (!runningRef.current) return;
    done();
  }, [pathname, searchParams, done]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 top-0 z-[80] h-[2px] w-full bg-primary transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transform: `scaleX(${progress / 100})`,
        transformOrigin: 'left center',
        transitionProperty: 'transform, opacity',
        transitionDuration: '180ms, 200ms',
      }}
    />
  );
}
