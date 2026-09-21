(() => {
  // Use issue years, not the conflicting 2024 dates on the journal portal.
  const references = {
    kendenglembu: {
      apa: "Noerwidi, S., & Sulistyarto, P. H. (2011). Awal kolonisasi Austronesia di tenggara Pulau Jawa: Perspektif Situs Kendenglembu. AMERTA, 29(1), 45–60. https://ejournal.brin.go.id/amerta/article/view/3521",
      mla: 'Noerwidi, Sofwan, and Priyatno Hadi Sulistyarto. "Awal Kolonisasi Austronesia di Tenggara Pulau Jawa: Perspektif Situs Kendenglembu." AMERTA, vol. 29, no. 1, 2011, pp. 45–60. https://ejournal.brin.go.id/amerta/article/view/3521.'
    },
    malangsari: {
      apa: "Kasnowihardjo, G. (2017). Hasil ekskavasi Situs Malangsari, Banyuwangi: Data baru dolmen di Jawa Timur. Berkala Arkeologi, 37(1), 1–14. https://doi.org/10.30883/jba.v37i1.108",
      mla: 'Kasnowihardjo, Gunadi. "Hasil Ekskavasi Situs Malangsari, Banyuwangi: Data Baru Dolmen di Jawa Timur." Berkala Arkeologi, vol. 37, no. 1, 2017, pp. 1–14. https://doi.org/10.30883/jba.v37i1.108.'
    }
  };
  const modal = document.querySelector("#citationModal");
  const output = document.querySelector("#citationOutput");
  const status = document.querySelector("#citationStatus");
  let sourceId;
  function updateCitation() {
    const style = modal.querySelector("input:checked").value;
    output.value = references[sourceId][style];
    status.textContent = "Sitasi teks polos; nama jurnal dicetak miring dalam dokumen akhir.";
  }
  document.querySelectorAll("[data-cite]").forEach((button) => {
    button.addEventListener("click", () => {
      sourceId = button.dataset.cite;
      updateCitation();
      modal.showModal();
    });
  });
  modal.querySelectorAll("input").forEach((input) => input.addEventListener("change", updateCitation));
  document.querySelector("#closeCitationButton").addEventListener("click", () => modal.close());
  document.querySelector("#copyCitationButton").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Sitasi disalin.";
    } catch {
      // Local files and denied clipboard permissions still allow manual copying.
      output.focus();
      output.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { /* Selection remains available. */ }
      status.textContent = copied ? "Sitasi disalin." : "Teks dipilih. Gunakan Salin pada perangkatmu.";
    }
  });

  let activeTerm;
  let pinned = false;
  let hideTimer;
  function closeGlossary() {
    clearTimeout(hideTimer);
    if (!activeTerm) return;
    document.getElementById(activeTerm.getAttribute("aria-describedby")).hidden = true;
    activeTerm.setAttribute("aria-expanded", "false");
    activeTerm = null;
    pinned = false;
  }
  function openGlossary(button) {
    clearTimeout(hideTimer);
    if (activeTerm !== button) closeGlossary();
    activeTerm = button;
    const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
    tooltip.hidden = false;
    button.setAttribute("aria-expanded", "true");
    const rect = button.getBoundingClientRect();
    const left = Math.max(16, Math.min(rect.left, document.documentElement.clientWidth - tooltip.offsetWidth - 16));
    const top = rect.bottom + tooltip.offsetHeight + 12 < innerHeight
      ? rect.bottom + 6 : Math.max(8, rect.top - tooltip.offsetHeight - 6);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  function scheduleClose() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!pinned && document.activeElement !== activeTerm) closeGlossary();
    }, 180);
  }
  document.querySelectorAll(".glossary-term").forEach((button) => {
    const tooltip = document.getElementById(button.getAttribute("aria-describedby"));
    // A body-level tooltip is not displaced by the page transition's transform.
    document.body.append(tooltip);
    button.addEventListener("pointerenter", (event) => { if (event.pointerType !== "touch") openGlossary(button); });
    button.addEventListener("focus", () => {
      if (button.matches(":focus-visible")) openGlossary(button);
    });
    button.addEventListener("click", () => {
      if (activeTerm === button && pinned) closeGlossary();
      else { openGlossary(button); pinned = true; }
    });
    button.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "touch") scheduleClose();
    });
    button.addEventListener("blur", closeGlossary);
    tooltip.addEventListener("pointerenter", () => clearTimeout(hideTimer));
    tooltip.addEventListener("pointerleave", scheduleClose);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".glossary-entry, .glossary-tooltip")) closeGlossary();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeGlossary(); });
  window.addEventListener("scroll", () => {
    if (!activeTerm) return;
    const rect = activeTerm.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) closeGlossary();
    else openGlossary(activeTerm);
  }, { passive: true });
  window.addEventListener("resize", closeGlossary);
})();
