'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Origin = { x: number; y: number };
type Burst = { id: number; x: number; y: number; sparks: Spark[] };
type Spark = { dx: number; dy: number; size: number; dur: number; delay: number; color: string };

const COLORS = ['#ff6a13', '#ff9a2e', '#f4bd4f', '#ff7d2a'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Une petite gerbe de braises : 16 points qui montent doucement et s'éteignent. */
function makeSparks(): Spark[] {
  return Array.from({ length: 16 }, () => ({
    dx: rand(-70, 70),
    dy: -rand(90, 210),
    size: rand(3, 7),
    dur: rand(1.1, 1.9),
    delay: rand(0, 0.28),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

const EmberContext = createContext<(origin?: Origin) => void>(() => {});

/**
 * Animation « braise » : à appeler quand quelque chose de bien arrive
 * (compte créé, coupe réservée, place prise). Sans position, la gerbe part
 * de là où la personne vient d'appuyer. Rien ne s'affiche si le système
 * demande moins d'animations.
 */
export function EmberProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const last = useRef<Origin | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      last.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, []);

  const burst = useCallback((origin?: Origin) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = origin ?? last.current ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
    const id = ++counter.current;
    setBursts((list) => [...list, { id, x: from.x, y: from.y, sparks: makeSparks() }]);
    window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 2400);
  }, []);

  return (
    <EmberContext.Provider value={burst}>
      {children}
      <div className="ember-layer" aria-hidden="true">
        {bursts.map((b) => (
          <div key={b.id} className="ember-burst" style={{ left: b.x, top: b.y }}>
            <i className="ember-glow" />
            {b.sparks.map((s, i) => (
              <i
                key={i}
                className="ember"
                style={
                  {
                    '--dx': `${s.dx}px`,
                    '--dy': `${s.dy}px`,
                    '--s': `${s.size}px`,
                    '--d': `${s.dur}s`,
                    '--dl': `${s.delay}s`,
                    '--c': s.color,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>
    </EmberContext.Provider>
  );
}

export const useEmbers = () => useContext(EmberContext);
