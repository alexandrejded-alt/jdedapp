/** Flammes animées de l'écran de chargement (canvas). Renvoie une fonction pour l'arrêter. */
export function startFlames(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const ctx: CanvasRenderingContext2D = context;

  let W = 0;
  let H = 0;
  let run = true;
  const t0 = performance.now();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, W * d);
    canvas.height = Math.max(1, H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  type Tongue = { x: number; ph: number; sp: number; hm: number; wm: number };
  type Layer = { c: string; a: number; hs: number; w: number; t: Tongue[] };
  const defs = [
    { n: 8, c: '150,22,6', a: 0.6, hs: 0.95, w: 0.2 },
    { n: 10, c: '235,76,10', a: 0.62, hs: 0.72, w: 0.15 },
    { n: 13, c: '255,150,36', a: 0.7, hs: 0.46, w: 0.1 },
  ];
  const layers: Layer[] = defs.map((L) => ({
    c: L.c,
    a: L.a,
    hs: L.hs,
    w: L.w,
    t: Array.from({ length: L.n }, (_, i) => ({
      x: (i + 0.5 + (Math.random() - 0.5) * 0.5) / L.n,
      ph: Math.random() * 6.28,
      sp: 0.7 + Math.random() * 0.9,
      hm: 0.65 + Math.random() * 0.5,
      wm: 0.8 + Math.random() * 0.5,
    })),
  }));
  const embers = Array.from({ length: 34 }, () => ({
    x: Math.random(),
    y: Math.random(),
    v: 0.25 + Math.random() * 0.7,
    r: 0.8 + Math.random() * 1.8,
    ph: Math.random() * 6.28,
  }));

  function frame(now: number) {
    const t = (now - t0) / 1000;
    let grow = reduce ? 1 : Math.min(1, t / 1.1);
    grow = 1 - Math.pow(1 - grow, 3);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (const L of layers) {
      for (const u of L.t) {
        const flick = 0.8 + 0.2 * Math.sin(t * u.sp * 3 + u.ph) + 0.07 * Math.sin(t * u.sp * 7.3 + u.ph * 2);
        const h = H * L.hs * u.hm * flick * grow * 0.82;
        const sway = Math.sin(t * u.sp * 1.7 + u.ph) * W * 0.03;
        const w = W * L.w * 0.5 * u.wm;
        const bx = u.x * W;
        const by = H + 8;
        const g = ctx.createLinearGradient(0, by, 0, by - h);
        g.addColorStop(0, `rgba(${L.c},${L.a})`);
        g.addColorStop(0.6, `rgba(${L.c},${L.a * 0.5})`);
        g.addColorStop(1, `rgba(${L.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx - w, by);
        ctx.bezierCurveTo(bx - w * 1.1 + sway * 0.2, by - h * 0.45, bx + sway * 0.5 - w * 0.2, by - h * 0.7, bx + sway, by - h);
        ctx.bezierCurveTo(bx + sway * 0.5 + w * 0.35, by - h * 0.65, bx + w * 1.1 + sway * 0.2, by - h * 0.4, bx + w, by);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (const m of embers) {
      if (!reduce) {
        m.y -= m.v * 0.004;
        if (m.y < -0.05) {
          m.y = 1.02;
          m.x = Math.random();
        }
      }
      const px = m.x * W + Math.sin(t * 1.4 + m.ph) * 12;
      const py = m.y * H;
      const al = Math.max(0, Math.min(1, (m.y + 0.05) * 1.2)) * 0.8;
      ctx.fillStyle = `rgba(255,196,90,${al})`;
      ctx.beginPath();
      ctx.arc(px, py, m.r, 0, 6.283);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    if (run && !reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return () => {
    run = false;
    window.removeEventListener('resize', size);
  };
}
