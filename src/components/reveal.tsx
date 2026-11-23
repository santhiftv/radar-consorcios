'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = { children: ReactNode; from?: 'left' | 'right'; className?: string };

/** Entrada animada: o conteúdo desliza da lateral para o lugar quando aparece na tela. */
export function Reveal({ children, from = 'left', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setState('hidden');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState('shown');
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hiddenClass = from === 'left' ? '-translate-x-16 opacity-0' : 'translate-x-16 opacity-0';
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${state === 'hidden' ? hiddenClass : 'translate-x-0 opacity-100'} ${className}`}
    >
      {children}
    </div>
  );
}
