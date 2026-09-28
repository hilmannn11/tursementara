// Add subtle depth to decorative imagery without changing the 360-degree tour.
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (reducedMotion.matches || !finePointer.matches) return;

  const home = document.getElementById("home");
  const image = home?.querySelector(".home-image-space");
  if (!home || !image) return;

  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;

  const updateHero = () => {
    frame = 0;
    if (home.hidden) return;
    const scroll = Math.min(Math.max(-home.getBoundingClientRect().top, 0), innerHeight);
    image.style.setProperty("--hero-x", `${pointerX.toFixed(1)}px`);
    image.style.setProperty("--hero-y", `${(pointerY + scroll * .035).toFixed(1)}px`);
  };

  const scheduleHero = () => {
    if (!frame) frame = requestAnimationFrame(updateHero);
  };

  home.addEventListener("pointermove", (event) => {
    const bounds = home.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - .5) * -18;
    pointerY = ((event.clientY - bounds.top) / Math.min(bounds.height, innerHeight) - .5) * -12;
    pointerX = Math.max(-9, Math.min(9, pointerX));
    pointerY = Math.max(-6, Math.min(6, pointerY));
    scheduleHero();
  }, { passive: true });

  home.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    scheduleHero();
  });

  window.addEventListener("scroll", scheduleHero, { passive: true });
  window.addEventListener("resize", scheduleHero, { passive: true });
  scheduleHero();

  document.querySelectorAll(".discovery-card").forEach((card) => {
    const art = card.querySelector(".discovery-art");
    if (!art) return;
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      art.style.setProperty("--art-rotate-x", `${(-y * 3).toFixed(2)}deg`);
      art.style.setProperty("--art-rotate-y", `${(x * 3).toFixed(2)}deg`);
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      art.style.removeProperty("--art-rotate-x");
      art.style.removeProperty("--art-rotate-y");
    });
  });
})();
