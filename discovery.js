const archiveTabs = [...document.querySelectorAll('.archive-tabs [role="tab"]')];

function selectArchiveTab(selected) {
  archiveTabs.forEach((tab) => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
}

archiveTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectArchiveTab(tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % archiveTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + archiveTabs.length) % archiveTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = archiveTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectArchiveTab(archiveTabs[next]);
    archiveTabs[next].focus();
  });
});

const discoveryObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('discovery-entered');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('[data-reveal]').forEach((element) => discoveryObserver.observe(element));
