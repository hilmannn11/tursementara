(() => {
  const section = document.querySelector('#archiveSpread');
  if (!section) return;
  const cards = [...section.querySelectorAll('.archive-spread-card')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const viewer = document.createElement('dialog');
  viewer.className = 'archive-photo-viewer';
  viewer.setAttribute('aria-label', 'Foto arsip diperbesar');
  viewer.innerHTML = '<div class="archive-photo-scrim"></div><figure class="archive-photo-frame"><img alt="" draggable="false" /></figure><button class="archive-photo-close" type="button" aria-label="Tutup foto" autofocus>×</button><p class="archive-photo-caption"></p>';
  document.body.append(viewer);
  const panel = viewer.querySelector('.archive-photo-frame');
  const image = panel.querySelector('img');
  const scrim = viewer.querySelector('.archive-photo-scrim');
  const closeButton = viewer.querySelector('.archive-photo-close');
  const caption = viewer.querySelector('.archive-photo-caption');
  let activeCard = null;
  let closing = false;
  let photoAnimation;
  let sourceVisibility;
  let savedOverflow;
  let savedGutter;

  // Keep the starting rectangle and angle aligned with the scroll animation.
  function geometry(element) {
    const rect = element.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    const scale = Math.hypot(matrix.a, matrix.b);
    const width = element.offsetWidth * scale;
    const height = element.offsetHeight * scale;
    return {
      left: `${rect.left + (rect.width - width) / 2}px`,
      top: `${rect.top + (rect.height - height) / 2}px`,
      width: `${width}px`,
      height: `${height}px`,
      transform: `rotate(${Math.atan2(matrix.b, matrix.a) * 180 / Math.PI}deg)`,
      borderWidth: `${parseFloat(getComputedStyle(element).borderWidth) * scale}px`,
    };
  }

  function expandedGeometry() {
    const border = innerWidth < 701 ? 4 : 6;
    const ratio = image.naturalWidth / image.naturalHeight || 3 / 4;
    const photoWidth = Math.max(1, Math.min(innerWidth - 40 - border * 2, (innerHeight - 104 - border * 2) * ratio, 900));
    const width = photoWidth + border * 2;
    const height = photoWidth / ratio + border * 2;
    return { left: `${(innerWidth - width) / 2}px`, top: `${(innerHeight - height) / 2}px`, width: `${width}px`, height: `${height}px`, transform: 'rotate(0deg)', borderWidth: `${border}px` };
  }

  function movePhoto(from, to) {
    photoAnimation?.cancel();
    Object.assign(panel.style, to);
    photoAnimation = panel.animate([from, to], { duration: reducedMotion.matches ? 0 : 480, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    return photoAnimation.finished.catch(() => {});
  }

  function fade(element, from, to) {
    element.style.opacity = String(to);
    return element.animate([{ opacity: from }, { opacity: to }], { duration: reducedMotion.matches ? 0 : 220, easing: 'ease-out' }).finished.catch(() => {});
  }

  function openPhoto(card, index) {
    if (viewer.open) return;
    const source = card.querySelector('img');
    if (!source.complete || !source.naturalWidth) return;
    const from = geometry(card);
    activeCard = card;
    closing = false;
    sourceVisibility = card.style.visibility;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    caption.textContent = `Foto arsip ${index + 1} / ${cards.length}`;
    savedOverflow = document.documentElement.style.overflow;
    savedGutter = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = 'stable';
    document.documentElement.style.overflow = 'hidden';
    section.dataset.photoOpen = 'true';
    viewer.showModal();
    card.style.visibility = 'hidden';
    movePhoto(from, expandedGeometry());
    fade(scrim, 0, 1);
    fade(closeButton, 0, 1);
    fade(caption, 0, 1);
  }

  async function closePhoto() {
    if (!viewer.open || closing) return;
    closing = true;
    const from = geometry(panel);
    await Promise.all([
      movePhoto(from, geometry(activeCard)),
      fade(scrim, Number(getComputedStyle(scrim).opacity), 0),
      fade(closeButton, Number(getComputedStyle(closeButton).opacity), 0),
      fade(caption, Number(getComputedStyle(caption).opacity), 0),
    ]);
    activeCard.style.visibility = sourceVisibility;
    viewer.close();
    document.documentElement.style.overflow = savedOverflow;
    document.documentElement.style.scrollbarGutter = savedGutter;
    delete section.dataset.photoOpen;
    activeCard.focus({ preventScroll: true });
    activeCard = null;
    closing = false;
  }

  cards.forEach((card, index) => {
    card.setAttribute('aria-label', `Perbesar foto arsip ${index + 1}`);
    card.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('click', () => openPhoto(card, index));
  });
  closeButton.addEventListener('click', closePhoto);
  viewer.addEventListener('click', event => {
    if (event.target === viewer || event.target === scrim) closePhoto();
  });
  viewer.addEventListener('cancel', event => {
    event.preventDefault();
    closePhoto();
  });
  addEventListener('resize', () => {
    if (!viewer.open || closing) return;
    photoAnimation?.cancel();
    Object.assign(panel.style, expandedGeometry());
  });
})();
