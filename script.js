(() => {
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-button]');
  const navigation = document.querySelector('[data-navigation]');
  const navLinks = [...document.querySelectorAll('.site-nav a')];
  const sections = [...document.querySelectorAll('main section[id]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const updateHeader = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  const closeMenu = () => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    header?.classList.remove('is-menu-open');
  };

  menuButton?.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    navigation?.classList.toggle('is-open', !isOpen);
    header?.classList.toggle('is-menu-open', !isOpen);
  });

  navLinks.forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });
  updateHeader();

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
    // Never leave content hidden if a browser delays an observer callback
    // (for example when opening a deep link in a background tab).
    window.setTimeout(() => {
      revealItems.forEach((item) => item.classList.add('is-visible'));
    }, 1600);
  }

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.hash === `#${visible.target.id}`);
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0, 0.2, 0.6] });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  const canvas = document.querySelector('[data-field-canvas]');
  if (!canvas || reducedMotion.matches) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let frameId = 0;
  let isVisible = true;
  let particles = [];
  const pointer = { x: -1000, y: -1000 };

  const makeParticle = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    radius: Math.random() * 1.4 + 0.5,
    tone: Math.random() > 0.65 ? 'violet' : Math.random() > 0.5 ? 'acid' : 'cyan'
  });

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(54, Math.max(26, Math.round(width / 25)));
    particles = Array.from({ length: count }, makeParticle);
  };

  const colors = {
    acid: 'rgba(200, 245, 96, 0.72)',
    cyan: 'rgba(105, 230, 245, 0.68)',
    violet: 'rgba(154, 140, 255, 0.62)'
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);

    particles.forEach((particle, index) => {
      const dxPointer = pointer.x - particle.x;
      const dyPointer = pointer.y - particle.y;
      const pointerDistance = Math.hypot(dxPointer, dyPointer);

      if (pointerDistance < 150 && pointerDistance > 0) {
        particle.vx -= (dxPointer / pointerDistance) * 0.0025;
        particle.vy -= (dyPointer / pointerDistance) * 0.0025;
      }

      particle.vx *= 0.998;
      particle.vy *= 0.998;
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -10) particle.x = width + 10;
      if (particle.x > width + 10) particle.x = -10;
      if (particle.y < -10) particle.y = height + 10;
      if (particle.y > height + 10) particle.y = -10;

      for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
        const next = particles[nextIndex];
        const dx = particle.x - next.x;
        const dy = particle.y - next.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 115) {
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(next.x, next.y);
          context.strokeStyle = `rgba(150, 196, 200, ${(1 - distance / 115) * 0.14})`;
          context.lineWidth = 0.6;
          context.stroke();
        }
      }

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = colors[particle.tone];
      context.fill();
    });

    if (isVisible) frameId = requestAnimationFrame(draw);
  };

  const hero = canvas.closest('.hero');
  hero?.addEventListener('pointermove', (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
  });
  hero?.addEventListener('pointerleave', () => {
    pointer.x = -1000;
    pointer.y = -1000;
  });

  if ('IntersectionObserver' in window && hero) {
    const canvasObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      cancelAnimationFrame(frameId);
      if (isVisible) frameId = requestAnimationFrame(draw);
    });
    canvasObserver.observe(hero);
  }

  window.addEventListener('resize', resize);
  resize();
  frameId = requestAnimationFrame(draw);
})();
