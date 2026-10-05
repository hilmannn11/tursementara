(() => {
  const section = document.querySelector('#archiveSpread');
  if (!section) return;

  const cards = [...section.querySelectorAll('.archive-spread-card')];
  const copy = section.querySelector('.archive-spread-copy');
  const hint = section.querySelector('.archive-spread-hint');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function render() {
    frame = 0;
    if (section.closest('[hidden]')) return;

    const bounds = section.getBoundingClientRect();
    const available = Math.max(1, bounds.height - innerHeight);
    const scroll = clamp(-bounds.top / available, 0, 1);
    const progress = reducedMotion.matches ? 1 : clamp((scroll - .12) / .78, 0, 1);
    const small = innerWidth < 701;

    cards.forEach((card, index) => {
      const x = Number(card.dataset[small ? 'smallX' : 'x']);
      const y = Number(card.dataset[small ? 'smallY' : 'y']);
      const startX = Number(card.dataset.startX);
      const startY = Number(card.dataset.startY);
      const rotation = Number(card.dataset.startRotate);
      const depth = .55 + index / Math.max(1, cards.length - 1) * .75;
      const driftX = !small && !reducedMotion.matches ? pointerX * depth * progress * 2.6 : 0;
      const driftY = !small && !reducedMotion.matches ? pointerY * depth * progress * 2.2 : 0;
      const tx = startX + (x - startX) * progress - driftX;
      const ty = startY + (y - startY) * progress - driftY;
      const angle = rotation * (1 - progress);
      const scale = .82 + .18 * progress;
      card.style.transform = `translate(calc(-50% + ${tx}vw), calc(-50% + ${ty}vh)) rotate(${angle}deg) scale(${scale})`;
    });

    copy.style.opacity = String(clamp((progress - .35) / .45, 0, 1));
    copy.style.transform = reducedMotion.matches ? '' : `scale(${.88 + .12 * progress})`;
    hint.style.opacity = String(reducedMotion.matches ? 0 : 1 - clamp(scroll / .12, 0, 1));
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('pointermove', event => {
    if (coarsePointer.matches) return;
    pointerX = event.clientX / innerWidth * 2 - 1;
    pointerY = event.clientY / innerHeight * 2 - 1;
    schedule();
  }, { passive: true });
  document.addEventListener('pointerleave', () => {
    pointerX = 0;
    pointerY = 0;
    schedule();
  });
  reducedMotion.addEventListener('change', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#archive'), { attributes: true, attributeFilter: ['hidden'] });
  schedule();
})();
