/**
 * Lightweight, 60fps canvas-based confetti particle burst.
 * Requires zero external dependencies.
 */
export function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set proper high-density canvas resolution
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = window.innerWidth;
  const height = window.innerHeight;

  const particles: any[] = [];
  const colors = ['#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#EC4899', '#06B6D4'];

  // Spawn 140 colorful confetti shapes from bottom-center
  for (let i = 0; i < 140; i++) {
    particles.push({
      x: width / 2,
      y: height + 20,
      vx: (Math.random() - 0.5) * 22,
      vy: -Math.random() * 26 - 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 8 + 6,
      h: Math.random() * 14 + 8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      alpha: 1,
      gravity: 0.65,
      friction: 0.98
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, width, height);
    let active = false;

    particles.forEach(p => {
      if (p.alpha > 0.01) {
        active = true;
        p.vx *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.012; // slow fade
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        // Draw elegant confetti rectangle
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (active) {
      requestAnimationFrame(animate);
    } else {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  };

  requestAnimationFrame(animate);
}
