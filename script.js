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
  const speedMultiplier = 1.2;

  const pointer = {
    x: 0,
    y: 0,
    previousX: 0,
    previousY: 0,
    lastMove: 0,
    active: false,
    speed: 0
  };

  const clusterPalettes = [
    [[48, 91, 139], [70, 111, 157], [96, 133, 170]],
    [[48, 112, 116], [72, 134, 133], [99, 151, 143]],
    [[99, 82, 148], [122, 104, 166], [145, 128, 183]],
    [[139, 83, 106], [158, 106, 125], [176, 130, 144]]
  ];

  const clusterOffsets = [
    [-62, -40],
    [58, -34],
    [-48, 54],
    [62, 50]
  ];

  const clusterShapes = ['circle', 'square', 'diamond', 'triangle'];

  const gaussianRandom = () => {
    const u = Math.max(Number.EPSILON, Math.random());
    const v = Math.max(Number.EPSILON, Math.random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const createParticle = (index) => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const cluster = index % clusterOffsets.length;
    const palette = clusterPalettes[cluster];
    return {
      x,
      y,
      homeX: x,
      homeY: y,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      radius: (width < 620 ? 3.6 : 4.35) + Math.random() * 4.95,
      drift: Math.random() * Math.PI * 2,
      cluster,
      shape: clusterShapes[cluster],
      roundness: 1,
      clusterAngle: Math.random() * Math.PI * 2,
      clusterRadius: 7 + Math.random() * 20,
      spreadX: x,
      spreadY: y,
      color: palette[Math.floor(Math.random() * palette.length)]
    };
  };

  const setGaussianSpread = (originX, originY) => {
    const sigmaX = Math.max(180, width * 0.34);
    const sigmaY = Math.max(150, height * 0.32);

    particles.forEach((particle) => {
      let targetX = originX;
      let targetY = originY;
      let attempts = 0;

      do {
        targetX = originX + clamp(gaussianRandom(), -2.35, 2.35) * sigmaX;
        targetY = originY + clamp(gaussianRandom(), -2.35, 2.35) * sigmaY;
        attempts += 1;
      } while (
        attempts < 16 &&
        (targetX < 18 || targetX > width - 18 || targetY < 18 || targetY > height - 18)
      );

      particle.spreadX = clamp(targetX, 18, width - 18);
      particle.spreadY = clamp(targetY, 18, height - 18);
    });
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = width < 620 ? 96 : Math.min(210, Math.max(144, Math.round(width / 8)));
    particles = Array.from({ length: count }, (_, index) => createParticle(index));
    setGaussianSpread(width / 2, height / 2);
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
    const beginningSpread = !pointer.active || now - pointer.lastMove > 190;

    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.speed = Math.hypot(pointer.x - pointer.previousX, pointer.y - pointer.previousY) / elapsed;
    pointer.lastMove = now;
    pointer.active = true;

    if (beginningSpread) setGaussianSpread(pointer.x, pointer.y);
    scatterFromPointer();
  };

  const releasePointer = () => {
    pointer.active = false;
    pointer.speed = 0;
  };

  const tracePolygon = (particle, radius, sides, rotation) => {
    context.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + index * Math.PI * 2 / sides;
      const x = particle.x + Math.cos(angle) * radius;
      const y = particle.y + Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  };

  const drawParticle = (particle, radius, opacity) => {
    const color = `${particle.color[0]}, ${particle.color[1]}, ${particle.color[2]}`;

    if (particle.shape === 'circle' || particle.roundness > 0.01) {
      context.beginPath();
      context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      const circleOpacity = particle.shape === 'circle' ? opacity : opacity * particle.roundness;
      context.fillStyle = `rgba(${color}, ${circleOpacity})`;
      context.fill();
    }

    if (particle.shape === 'circle' || particle.roundness >= 0.99) return;

    if (particle.shape === 'triangle') {
      tracePolygon(particle, radius * 1.15, 3, -Math.PI / 2);
    } else {
      const rotation = particle.shape === 'square' ? Math.PI / 4 : 0;
      tracePolygon(particle, radius, 4, rotation);
    }

    context.fillStyle = `rgba(${color}, ${opacity * (1 - particle.roundness)})`;
    context.fill();
  };

  const draw = (now) => {
    context.clearRect(0, 0, width, height);

    const idleFor = now - pointer.lastMove;
    const gathering = pointer.active && idleFor > 190;
    const gatherProgress = gathering ? Math.min(1, (idleFor - 190) / 1800) : 0;

    particles.forEach((particle) => {
      particle.drift += 0.006;

      const clusterScale = width < 620 ? 0.72 : 1;
      const clusterOffset = clusterOffsets[particle.cluster];
      const orbit = particle.clusterAngle + now * (0.00012 + particle.cluster * 0.000015);
      const targetX = pointer.x + clusterOffset[0] * clusterScale + Math.cos(orbit) * particle.clusterRadius;
      const targetY = pointer.y + clusterOffset[1] * clusterScale + Math.sin(orbit) * particle.clusterRadius;

      if (gathering) {
        const dx = targetX - particle.x;
        const dy = targetY - particle.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const pull = 0.00022 + gatherProgress * 0.00058;

        particle.vx += dx * pull;
        particle.vy += dy * pull;

        if (distance < particle.clusterRadius + 8) {
          particle.vx += (-dy / distance) * 0.018;
          particle.vy += (dx / distance) * 0.018;
        }
      } else {
        const destinationX = pointer.active ? particle.spreadX : particle.homeX;
        const destinationY = pointer.active ? particle.spreadY : particle.homeY;
        const destinationPull = pointer.active ? 0.00072 : 0.00055;
        particle.vx += (destinationX - particle.x) * destinationPull;
        particle.vy += (destinationY - particle.y) * destinationPull;
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

      particle.x += particle.vx * speedMultiplier;
      particle.y += particle.vy * speedMultiplier;

      if (particle.x < -15) particle.x = width + 15;
      if (particle.x > width + 15) particle.x = -15;
      if (particle.y < -15) particle.y = height + 15;
      if (particle.y > height + 15) particle.y = -15;

      const distanceToCluster = pointer.active
        ? Math.hypot(targetX - particle.x, targetY - particle.y)
        : 999;
      const nearCluster = gathering ? Math.max(0, 1 - distanceToCluster / 120) : 0;
      const opacity = 0.075 + nearCluster * 0.16;
      const roundnessTarget = gathering ? 0 : 1;
      particle.roundness += (roundnessTarget - particle.roundness) * 0.055;
      drawParticle(particle, particle.radius + nearCluster * 0.55, opacity);

      if (gathering && distanceToCluster < 62) {
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(targetX, targetY);
        context.strokeStyle = `rgba(${particle.color[0]}, ${particle.color[1]}, ${particle.color[2]}, ${(1 - distanceToCluster / 62) * 0.035})`;
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
