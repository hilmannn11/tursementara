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
    const session = sessionFor(record);
    const playing = session?.state === "playing";
    const paused = session?.state === "paused";
    record.play.hidden = !!playing;
    record.pause.hidden = !playing;
    record.stop.hidden = !session;
    record.playLabel.textContent = paused ? "Lanjutkan" : record.label;
    if (record.source) record.play.setAttribute("aria-label", paused ? "Lanjutkan" : `Dengarkan bagian: ${record.partTitle}`);
    record.play.disabled = !supported;
    record.rate.disabled = !supported;
    record.timeline.hidden = !session;
    record.ui.dataset.active = String(!!session);
  }

  function sessionFor(record) {
    return active && (active.record === record || active.record.source === record) ? active : null;
  }

  function updateAllControls() { for (const record of records) updateControls(record); }

  function playbackStatus(session, text) {
    setStatus(session.record, text);
    if (session.record.source) setStatus(session.record.source, text);
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  function updateTimeline(session) {
    if (active !== session || !session.audio) return;
    const end = Math.min(session.endTime, session.audio.duration);
    const duration = Math.max(0, end - session.startTime);
    const position = Math.max(0, Math.min(duration, session.audio.currentTime - session.startTime));
    for (const record of [session.record, session.record.source].filter(Boolean)) {
      record.seek.disabled = !Number.isFinite(duration) || duration <= 0;
      record.seek.max = Number.isFinite(duration) ? String(duration) : "0";
      if (!record.seeking) record.seek.value = Number.isFinite(position) ? String(position) : "0";
      record.elapsed.textContent = formatTime(record.seeking ? Number(record.seek.value) : position);
      record.duration.textContent = Number.isFinite(duration) ? formatTime(duration) : "--:--";
      record.seek.setAttribute("aria-valuetext", `${record.elapsed.textContent} dari ${record.duration.textContent}`);
    }
  }

  function unhighlight() {
    active?.queue[active.index]?.element?.classList.remove("narration-reading");
  }

  function stop(message = "Pembacaan dihentikan.") {
    if (!active) return;
    const session = active;
    unhighlight();
    active = null;
    cancelAnimationFrame(session.frame);
    session.audio?.pause();
    if (session.audio) { session.audio.removeAttribute("src"); session.audio.load(); }
    playbackStatus(session, message);
    updateAllControls();
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
    updateTimeline(session);
    const current = () => active === session && session.audio === audio;
    const highlight = () => {
      if (!current() || session.state !== "playing") return;
      const marks = clip.marks || [{ time: 0, index: 0 }];
      let index = 0;
      for (const mark of marks) {
        if (mark.time > audio.currentTime) break;
        index = mark.index;
      }
      if (index !== session.index || !session.queue[index]?.element?.classList.contains("narration-reading")) {
        unhighlight();
        session.index = index;
        session.queue[index]?.element?.classList.add("narration-reading");
      }
    };
    const tick = () => {
      if (!current() || session.state !== "playing") return;
      if (Number.isFinite(session.endTime) && audio.currentTime >= session.endTime) {
        stop("Bagian ini selesai dibacakan. Pilih bagian lain untuk melanjutkan.");
        return;
      }
      highlight();
      updateTimeline(session);
      session.frame = requestAnimationFrame(tick);
    };
    audio.addEventListener("loadedmetadata", () => {
      if (!current()) return;
      audio.currentTime = session.startTime;
      updateTimeline(session);
    }, { once: true });
    audio.addEventListener("playing", () => {
      if (current() && session.state === "playing") {
        playbackStatus(session, `Suara AI ${voiceName} · ${session.record.partTitle || "sedang membacakan penjelasan."}`);
        cancelAnimationFrame(session.frame);
        tick();
      }
    });
    audio.addEventListener("waiting", () => {
      if (current() && session.state === "playing") playbackStatus(session, `Memuat suara AI ${voiceName}…`);
    });
    audio.addEventListener("timeupdate", () => { if (current()) { highlight(); updateTimeline(session); } });
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
    if (sessionFor(record)?.state === "paused") {
      active.state = "playing";
      playbackStatus(active, "Melanjutkan pembacaan.");
      updateAllControls();
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
    const sourceQueue = record.source ? collect(record.source) : queue;
    const text = sourceQueue.map((chunk) => chunk.text).join(" ");
    const clip = audioLibrary[passageKey(text)];
    if (clip?.text !== text) {
      setStatus(record, "Rekaman suara AI belum cocok dengan penjelasan ini. Muat ulang halaman untuk memperbaruinya.");
      return;
    }
    let startIndex = 0;
    let endIndex = sourceQueue.length;
    if (record.source) {
      startIndex = sourceQueue.findIndex((chunk) => chunk.element === queue[0].element && chunk.text === queue[0].text);
      const last = queue[queue.length - 1];
      endIndex = 0;
      for (let index = sourceQueue.length - 1; index >= 0; index--) {
        if (sourceQueue[index].element === last.element && sourceQueue[index].text === last.text) { endIndex = index + 1; break; }
      }
      if (startIndex < 0 || endIndex <= startIndex) { setStatus(record, "Audio bagian ini belum tersedia."); return; }
    }
    const startTime = clip.marks.find((mark) => mark.index === startIndex)?.time ?? 0;
    const endMark = clip.marks.find((mark) => mark.index === endIndex);
    const endTime = record.source && endMark ? Math.max(startTime, endMark.time - .04) : Infinity;
    if (record.source) record.rate.value = record.source.rate.value;
    active = { record, queue: sourceQueue, recordText: queue.map((chunk) => chunk.text).join(" "), sourceText: text, index: startIndex, startTime, endTime, state: "playing", audio: null, frame: 0 };
    playbackStatus(active, `Memuat suara AI ${voiceName}…`);
    updateAllControls();
    playAudio(active, clip);
  }

  function pause() {
    if (!active || active.state !== "playing") return;
    unhighlight();
    active.state = "paused";
    cancelAnimationFrame(active.frame);
    active.audio?.pause();
    playbackStatus(active, "Dijeda. Ketuk Lanjutkan untuk meneruskan pembacaan.");
    updateAllControls();
  }

  function mount(root, options) {
    if (!root) return null;
    if (mounted.has(root)) return mounted.get(root);
    const ui = document.createElement("div");
    ui.className = "narration-player";
    if (options.source) ui.classList.add("narration-part-player");
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
      <div class="narration-timeline" hidden>
        <input type="range" class="narration-seek" min="0" max="0" step="0.1" value="0" aria-label="Posisi bacaan" disabled />
        <div class="narration-times" aria-hidden="true"><span class="narration-elapsed">0:00</span><span class="narration-duration">--:--</span></div>
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
      timeline: ui.querySelector('.narration-timeline'),
      seek: ui.querySelector('.narration-seek'),
      elapsed: ui.querySelector('.narration-elapsed'),
      duration: ui.querySelector('.narration-duration'),
      seeking: false,
    };
    if (options.source) record.play.setAttribute("aria-label", `Dengarkan bagian: ${options.partTitle}`);
    const anchor = options.afterSelf ? root : root.querySelector(options.after);
    if (!anchor) return;
    anchor.after(ui);
    records.add(record);
    mounted.set(root, record);
    record.play.addEventListener("click", () => play(record));
    record.pause.addEventListener("click", pause);
    record.stop.addEventListener("click", () => stop());
    record.rate.addEventListener("change", () => {
      const session = sessionFor(record);
      if (session?.audio) {
        session.audio.playbackRate = Number(record.rate.value);
        for (const related of [session.record, session.record.source].filter(Boolean)) related.rate.value = record.rate.value;
      }
    });
    record.seek.addEventListener("input", () => {
      record.seeking = true;
      record.elapsed.textContent = formatTime(Number(record.seek.value));
      record.seek.setAttribute("aria-valuetext", `${record.elapsed.textContent} dari ${record.duration.textContent}`);
    });
    record.seek.addEventListener("change", () => {
      record.seeking = false;
      const session = sessionFor(record);
      if (session?.audio && Number.isFinite(session.audio.duration)) {
        session.audio.currentTime = session.startTime + Number(record.seek.value);
        updateTimeline(session);
      }
    });
    record.seek.addEventListener("pointercancel", () => {
      record.seeking = false;
      const session = sessionFor(record);
      if (session) updateTimeline(session);
    });
    setStatus(record, supported ? readyStatus() : "Pembacaan suara belum tersedia di browser ini.");
    updateControls(record);
    return record;
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
    const object = mount(document.querySelector('#archiveModalContent'), {
      label: "Dengarkan semua penjelasan", after: '#archiveTitle',
      ...objectOptions,
    });
    if (object) {
      object.root.querySelectorAll('.stone-observation, .stone-lesson-sections > section, .plaque-decree, .stone-references').forEach((root) => {
        const heading = root.querySelector('h3');
        if (!heading) return;
        const title = heading.cloneNode(true);
        title.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
        mount(root, { label: "Dengarkan bagian ini", partTitle: title.textContent.trim(), source: object, after: 'h3', selector: 'p, dt, dd, li' });
      });
    }
    mount(document.querySelector('#quizFeedback'), { label: "Dengarkan pembahasan", afterSelf: true });
    mount(document.querySelector('#aboutPage .about-page-inner'), { label: "Dengarkan tentang Lithera", after: 'h1', selector: 'h1, p' });
    mount(document.querySelector('#siteChooser .site-chooser-inner'), { label: "Dengarkan pengantar tur", after: '.site-chooser-description', selector: 'h2, .site-chooser-description' });
    document.querySelectorAll('.research-entry').forEach((root) => mount(root, {
      label: "Dengarkan ringkasan penelitian", after: 'h4', selector: 'h4, p', glossary: true,
    }));
    for (const record of records) {
      const text = collect(record).map((chunk) => chunk.text).join(" ");
      if (record.ui.hidden !== !text) record.ui.hidden = !text;
      if (sessionFor(record) && (!visible(record.root) || text !== (active.record === record ? active.recordText : active.sourceText))) stop();
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
