(() => {
  const audioLibrary = window.LITHERA_NARRATION_AUDIO || {};
  const voiceName = window.LITHERA_NARRATION_VOICE?.label || "Indonesia";
  const supported = typeof Audio === "function" && Object.keys(audioLibrary).length > 0;
  const records = new Set();
  const mounted = new WeakMap();
  let active = null;
  let pendingSync = false;

  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor"/></svg>';

  const { collect, passageKey, objectOptions } = window.LitheraNarrationContent;

  function visible(root) {
    return root.isConnected && !root.closest('[hidden], dialog:not([open])') && root.getClientRects().length > 0;
  }

  function setStatus(record, text) {
    if (record.status.textContent !== text) record.status.textContent = text;
  }

  function updateControls(record) {
    const session = active?.record === record ? active : null;
    const playing = session?.state === "playing";
    const paused = session?.state === "paused";
    record.play.hidden = !!playing;
    record.pause.hidden = !playing;
    record.stop.hidden = !session;
    record.playLabel.textContent = paused ? "Lanjutkan" : record.label;
    record.play.disabled = !supported;
    record.rate.disabled = !supported;
  }

  function unhighlight() {
    active?.queue[active.index]?.element?.classList.remove("narration-reading");
  }

  function stop(message = "Pembacaan dihentikan.") {
    if (!active) return;
    const session = active;
    const record = session.record;
    unhighlight();
    active = null;
    session.audio?.pause();
    if (session.audio) { session.audio.removeAttribute("src"); session.audio.load(); }
    setStatus(record, message);
    updateControls(record);
  }

  function readyStatus() {
    return `Suara AI ${voiceName} · ceria dan natural.`;
  }

  function playAudio(session, clip) {
    const audio = new Audio(clip.src);
    session.audio = audio;
    audio.preload = "auto";
    audio.playbackRate = Number(session.record.rate.value);
    audio.preservesPitch = true;
    const current = () => active === session && session.audio === audio;
    const highlight = () => {
      if (!current() || session.state !== "playing") return;
      const marks = clip.marks || [{ time: 0, index: 0 }];
      let index = 0;
      for (const mark of marks) {
        if (mark.time > audio.currentTime) break;
        index = mark.index;
      }
      unhighlight();
      session.index = index;
      session.queue[index]?.element?.classList.add("narration-reading");
    };
    audio.addEventListener("playing", () => {
      if (current() && session.state === "playing") { setStatus(session.record, `Suara AI ${voiceName} · sedang membacakan penjelasan.`); highlight(); }
    });
    audio.addEventListener("waiting", () => {
      if (current() && session.state === "playing") setStatus(session.record, `Memuat suara AI ${voiceName}…`);
    });
    audio.addEventListener("timeupdate", highlight);
    audio.addEventListener("ended", () => { if (current()) stop("Selesai dibacakan. Kamu bisa mendengarkannya lagi."); });
    const failed = () => {
      if (!current() || session.state !== "playing") return;
      stop("Audio AI belum dapat dimuat. Periksa koneksi, lalu ketuk Dengarkan untuk mencoba lagi.");
    };
    audio.addEventListener("error", failed);
    audio.play().catch(failed);
  }

  function play(record) {
    if (!supported || !visible(record.root)) return;
    if (active?.record === record && active.state === "paused") {
      active.state = "playing";
      setStatus(record, "Melanjutkan pembacaan.");
      updateControls(record);
      if (active.audio) {
        const session = active;
        session.audio.play().catch(() => {
          if (active === session && session.state === "playing") stop("Audio belum dapat diputar. Ketuk Dengarkan untuk mencoba lagi.");
        });
      }
      return;
    }
    stop();
    const queue = collect(record);
    if (!queue.length) {
      setStatus(record, "Belum ada penjelasan untuk dibacakan.");
      return;
    }
    active = { record, queue, index: 0, state: "playing", audio: null };
    setStatus(record, `Memuat suara AI ${voiceName}…`);
    updateControls(record);
    const text = queue.map((chunk) => chunk.text).join(" ");
    const clip = audioLibrary[passageKey(text)];
    if (clip?.text === text) playAudio(active, clip);
    else stop("Rekaman suara AI belum cocok dengan penjelasan ini. Muat ulang halaman untuk memperbaruinya.");
  }

  function pause() {
    if (!active || active.state !== "playing") return;
    unhighlight();
    active.state = "paused";
    active.audio?.pause();
    setStatus(active.record, "Dijeda. Ketuk Lanjutkan untuk meneruskan pembacaan.");
    updateControls(active.record);
  }

  function mount(root, options) {
    if (!root || mounted.has(root)) return;
    const ui = document.createElement("div");
    ui.className = "narration-player";
    ui.setAttribute("data-narration-ui", "");
    ui.setAttribute("role", "group");
    ui.setAttribute("aria-label", options.label);
    ui.innerHTML = `
      <div class="narration-actions">
        <button type="button" class="narration-play" data-audio-action="play">${playIcon}<span>${options.label}</span></button>
        <button type="button" data-audio-action="pause" hidden>Jeda</button>
        <button type="button" data-audio-action="stop" hidden>Hentikan</button>
        <label class="narration-speed">Kecepatan <select aria-label="Kecepatan pembacaan"><option value="0.85">Pelan</option><option value="1" selected>Normal</option><option value="1.1">Cepat</option></select></label>
      </div>
      <p class="narration-status" role="status" aria-live="polite"></p>
    `;
    const record = {
      root, ui, ...options,
      play: ui.querySelector('[data-audio-action="play"]'),
      playLabel: ui.querySelector('.narration-play span'),
      pause: ui.querySelector('[data-audio-action="pause"]'),
      stop: ui.querySelector('[data-audio-action="stop"]'),
      rate: ui.querySelector('select'),
      status: ui.querySelector('.narration-status'),
    };
    const anchor = options.afterSelf ? root : root.querySelector(options.after);
    if (!anchor) return;
    anchor.after(ui);
    records.add(record);
    mounted.set(root, record);
    record.play.addEventListener("click", () => play(record));
    record.pause.addEventListener("click", pause);
    record.stop.addEventListener("click", () => stop());
    record.rate.addEventListener("change", () => {
      if (active?.record === record && active.audio) active.audio.playbackRate = Number(record.rate.value);
    });
    setStatus(record, supported ? readyStatus() : "Pembacaan suara belum tersedia di browser ini.");
    updateControls(record);
  }

  function sync() {
    pendingSync = false;
    for (const record of records) {
      if (!record.root.isConnected || !record.ui.isConnected) {
        if (active?.record === record) stop();
        record.ui.remove();
        records.delete(record);
        mounted.delete(record.root);
      }
    }
    mount(document.querySelector('#archiveModalContent'), {
      label: "Dengarkan semua penjelasan", after: '#archiveTitle',
      ...objectOptions,
    });
    mount(document.querySelector('#quizFeedback'), { label: "Dengarkan pembahasan", afterSelf: true });
    mount(document.querySelector('#aboutPage .about-page-inner'), { label: "Dengarkan tentang Lithera", after: 'h1', selector: 'h1, p' });
    mount(document.querySelector('#siteChooser .site-chooser-inner'), { label: "Dengarkan pengantar tur", after: '.site-chooser-description', selector: 'h2, .site-chooser-description' });
    document.querySelectorAll('.research-entry').forEach((root) => mount(root, {
      label: "Dengarkan ringkasan penelitian", after: 'h4', selector: 'h4, p', glossary: true,
    }));
    for (const record of records) {
      const text = collect(record).map((chunk) => chunk.text).join(" ");
      if (record.ui.hidden !== !text) record.ui.hidden = !text;
      if (active?.record === record && (!visible(record.root) || text !== active.queue.map((chunk) => chunk.text).join(" "))) stop();
    }
  }

  function scheduleSync() {
    if (pendingSync) return;
    pendingSync = true;
    queueMicrotask(sync);
  }

  // Explanation panels and quiz feedback are replaced as the visitor moves.
  new MutationObserver(scheduleSync).observe(document.body, {
    childList: true, characterData: true, subtree: true, attributes: true,
    attributeFilter: ["hidden", "open"],
  });
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('close', () => {
    if (active && dialog.contains(active.record.root)) stop();
  }));
  document.addEventListener("click", (event) => { if (event.target.closest('a[href]')) stop(); }, true);
  window.addEventListener("hashchange", () => stop());
  window.addEventListener("popstate", () => stop());
  window.addEventListener("pagehide", () => stop());
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  sync();
})();
