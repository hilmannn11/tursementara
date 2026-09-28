// Reveal content as it enters the viewport, while respecting motion preferences.
(() => {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || !("IntersectionObserver" in window)) return;

  const targets = document.querySelectorAll(
    ".discovery-inner > .discovery-kicker, .discovery-inner > h2, .discovery-inner > .discovery-lead, " +
    ".discovery-card, .site-chooser-inner > .site-chooser-label, .site-chooser-inner > h2, " +
    ".site-chooser-inner > .site-chooser-description, .site-option, .collection-heading, " +
    ".research-entry, .badge-card, .tour-heading, .mission-copy, .about-page-inner"
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in-view");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -35px 0px", threshold: .08 });

  targets.forEach((element, index) => {
    element.classList.add("modern-reveal");
    if (element.classList.contains("discovery-card") || element.classList.contains("site-option")) {
      element.dataset.stagger = String(index % 2 + 1);
    }
    const rect = element.getBoundingClientRect();
    if (element.getClientRects().length && rect.top < innerHeight * .9 && rect.bottom > 0) {
      element.classList.add("is-in-view");
    } else {
      observer.observe(element);
    }
  });

  document.body.classList.add("modern-ready");
})();
