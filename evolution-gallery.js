(() => {
  const gallery = document.querySelector('#evolutionJourney');
  if (!gallery) return;
  const chooser = document.querySelector('#siteChooser');
  const slots = [...gallery.querySelectorAll('.evolution-slot')];
  const buttons = [...gallery.querySelectorAll('.evolution-figure')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const inView = new Set();
  const loaded = new Set();
  let scrollFrame = 0;
  const routeVisible = () => !chooser.hidden && !chooser.closest('[hidden]');

  function reveal() {
    scrollFrame = 0;
    if (!routeVisible()) return;
    // Short pages reveal immediately; otherwise the entrance follows the first scroll.
    const hasScrolled = window.scrollY > 12 || document.documentElement.scrollHeight <= window.innerHeight + 1;
    if (!motion.matches && !hasScrolled) return;
    slots.forEach(slot => {
      if (loaded.has(slot) && (motion.matches || inView.has(slot))) slot.classList.add('is-revealed');
    });
  }

  function scheduleReveal() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(reveal);
  }

  if ('IntersectionObserver' in window) {
    gallery.classList.toggle('has-motion', !motion.matches);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) inView.add(entry.target);
        else inView.delete(entry.target);
      });
      scheduleReveal();
    }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    slots.forEach(slot => observer.observe(slot));
  }

  slots.forEach(slot => {
    const img = slot.querySelector('img');
    const ready = () => { loaded.add(slot); scheduleReveal(); };
    if (img.complete && img.naturalWidth) ready();
    else img.addEventListener('load', ready, { once: true });
    img.addEventListener('error', () => {
      slot.querySelector('button').disabled = true;
      slot.style.visibility = 'hidden';
    }, { once: true });
  });

  function resetZoom() {
    buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const wasSelected = button.getAttribute('aria-pressed') === 'true';
      resetZoom();
      button.setAttribute('aria-pressed', String(!wasSelected));
    });
    button.addEventListener('focus', () => button.closest('.evolution-slot').classList.add('is-revealed'));
  });
  gallery.addEventListener('keydown', event => {
    if (event.key === 'Escape') resetZoom();
  });
  document.addEventListener('pointerdown', event => {
    if (!gallery.contains(event.target)) resetZoom();
  });
  window.addEventListener('scroll', scheduleReveal, { passive: true });
  window.addEventListener('resize', scheduleReveal, { passive: true });
  motion.addEventListener('change', () => {
    gallery.classList.toggle('has-motion', !motion.matches && 'IntersectionObserver' in window);
    scheduleReveal();
  });
  new MutationObserver(() => {
    if (!routeVisible()) {
      slots.forEach(slot => slot.classList.remove('is-revealed'));
      resetZoom();
    } else scheduleReveal();
  }).observe(chooser, { attributes: true, attributeFilter: ['hidden'] });
})();
