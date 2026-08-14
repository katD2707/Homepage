(() => {
  const canvas = document.querySelector('[data-diffusion-canvas]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!canvas || reduceMotion.matches) {
    if (canvas) canvas.hidden = true;
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let frameId = 0;
  let particles = [];
  let pageVisible = true;

  const pointer = {
    x: 0,
    y: 0,
    previousX: 0,
    previousY: 0,
    lastMove: 0,
    active: false,
    speed: 0
  };

  const palette = [
    [59, 101, 145],
    [91, 123, 151],
    [79, 130, 137]
  ];

  const createParticle = () => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    return {
      x,
      y,
      homeX: x,
      homeY: y,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      radius: 0.75 + Math.random() * 1.25,
      drift: Math.random() * Math.PI * 2,
      color: palette[Math.floor(Math.random() * palette.length)]
    };
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = width < 620 ? 42 : Math.min(82, Math.max(58, Math.round(width / 20)));
    particles = Array.from({ length: count }, createParticle);
  };

  const scatterFromPointer = () => {
    particles.forEach((particle) => {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const reach = Math.max(0, 1 - distance / 460);
      if (reach <= 0) return;

      const impulse = (0.25 + Math.min(pointer.speed, 2.5) * 0.35) * reach;
      particle.vx += (dx / distance) * impulse + (Math.random() - 0.5) * impulse * 0.5;
      particle.vy += (dy / distance) * impulse + (Math.random() - 0.5) * impulse * 0.5;
    });
  };

  const handlePointerMove = (event) => {
    const now = performance.now();
    const elapsed = Math.max(8, now - pointer.lastMove);

    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.speed = Math.hypot(pointer.x - pointer.previousX, pointer.y - pointer.previousY) / elapsed;
    pointer.lastMove = now;
    pointer.active = true;

    scatterFromPointer();
  };

  const releasePointer = () => {
    pointer.active = false;
    pointer.speed = 0;
  };

  const draw = (now) => {
    context.clearRect(0, 0, width, height);

    const idleFor = now - pointer.lastMove;
    const gathering = pointer.active && idleFor > 190;
    const gatherProgress = gathering ? Math.min(1, (idleFor - 190) / 1800) : 0;

    particles.forEach((particle) => {
      particle.drift += 0.006;

      if (gathering) {
        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const pull = 0.00022 + gatherProgress * 0.00058;

        particle.vx += dx * pull;
        particle.vy += dy * pull;

        if (distance < 18) {
          particle.vx += (-dy / distance) * 0.018;
          particle.vy += (dx / distance) * 0.018;
        }
      } else {
        const homePull = pointer.active ? 0.00018 : 0.00055;
        particle.vx += (particle.homeX - particle.x) * homePull;
        particle.vy += (particle.homeY - particle.y) * homePull;
        particle.vx += Math.cos(particle.drift) * 0.002;
        particle.vy += Math.sin(particle.drift) * 0.002;

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const reach = Math.max(0, 1 - distance / 320);
          particle.vx += (dx / distance) * reach * 0.035;
          particle.vy += (dy / distance) * reach * 0.035;
        }
      }

      const damping = gathering ? 0.91 : 0.945;
      particle.vx *= damping;
      particle.vy *= damping;

      const velocity = Math.hypot(particle.vx, particle.vy);
      if (velocity > 4.5) {
        particle.vx = (particle.vx / velocity) * 4.5;
        particle.vy = (particle.vy / velocity) * 4.5;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -15) particle.x = width + 15;
      if (particle.x > width + 15) particle.x = -15;
      if (particle.y < -15) particle.y = height + 15;
      if (particle.y > height + 15) particle.y = -15;

      const distanceToPointer = pointer.active
        ? Math.hypot(pointer.x - particle.x, pointer.y - particle.y)
        : 999;
      const nearPointer = gathering ? Math.max(0, 1 - distanceToPointer / 180) : 0;
      const opacity = 0.11 + nearPointer * 0.13;

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius + nearPointer * 0.45, 0, Math.PI * 2);
      context.fillStyle = `rgba(${particle.color[0]}, ${particle.color[1]}, ${particle.color[2]}, ${opacity})`;
      context.fill();

      if (gathering && distanceToPointer < 85) {
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(pointer.x, pointer.y);
        context.strokeStyle = `rgba(72, 111, 146, ${(1 - distanceToPointer / 85) * 0.035})`;
        context.lineWidth = 0.5;
        context.stroke();
      }
    });

    if (pageVisible) frameId = requestAnimationFrame(draw);
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', releasePointer);
  window.addEventListener('blur', releasePointer);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    cancelAnimationFrame(frameId);
    if (pageVisible) frameId = requestAnimationFrame(draw);
  });

  resize();
  frameId = requestAnimationFrame(draw);

  const navLinks = [...document.querySelectorAll('.site-nav a')];
  const sections = [...document.querySelectorAll('main section[id]')];

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!current) return;
      navLinks.forEach((link) => {
        const active = link.hash === `#${current.target.id}`;
        link.toggleAttribute('aria-current', active);
      });
    }, { rootMargin: '-20% 0px -68% 0px', threshold: [0, 0.25] });

    sections.forEach((section) => sectionObserver.observe(section));
  }
})();
