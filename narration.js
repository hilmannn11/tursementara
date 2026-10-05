(() => {
  const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const synth = supported ? window.speechSynthesis : null;
  const records = new Set();
  const mounted = new WeakMap();
  let active = null;
  let version = 0;
  let pendingSync = false;

  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor"/></svg>';

  function spokenText(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('[data-narration-ui], .sr-only, [hidden], [aria-hidden="true"], .glossary-tooltip, script, style, svg').forEach((node) => node.remove());
    // Glossary buttons contain a term that belongs to the sentence.
    copy.querySelectorAll('button:not(.glossary-term), input, select, textarea').forEach((node) => node.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

  function speechText(text) {
    return text
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\b\d+(?:[/.]\d+)*(?:\/KEP)?(?:\/[\d.]+)+\b/gi, (number) => number.replace(/\//g, ", ").replace(/KEP/gi, "Keputusan").replace(/\./g, " titik "))
      .replace(/\bSK\b/g, "Surat Keputusan")
      .replace(/\b3D\b/g, "tiga dimensi")
      .replace(/\bhlm\./gi, "halaman")
      .replace(/&/g, " dan ")
      .replace(/\s+/g, " ").trim();
  }

  function chunks(text) {
    const output = [];
    let remaining = speechText(text);
    while (remaining.length > 200) {
      const sample = remaining.slice(0, 201);
      const sentence = Math.max(sample.lastIndexOf(". "), sample.lastIndexOf("? "), sample.lastIndexOf("! "));
      const split = sentence >= 70 ? sentence + 1 : sample.lastIndexOf(" ");
      const end = split > 0 ? split : 200;
      output.push(remaining.slice(0, end).trim());
      remaining = remaining.slice(end).trim();
    }
    if (remaining) output.push(remaining);
    return output;
  }

  function collect(record) {
    const nodes = record.selector ? [...record.root.querySelectorAll(record.selector)] : [record.root];
    const blocks = nodes
      .filter((node) => !node.closest('[data-narration-ui], .stone-inline-source, .stone-quiz-invitation, .glossary-tooltip') && !node.matches('.eyebrow, .stone-model-caption, .plaque-photo-caption'))
      .map((element) => ({ element, text: spokenText(element) }))
      .filter((block) => block.text);
    if (record.glossary) {
      record.root.querySelectorAll('.glossary-term[aria-describedby]').forEach((term) => {
        const definition = document.getElementById(term.getAttribute('aria-describedby'));
        if (definition) blocks.push({ element: term.closest('p'), text: `Istilah ${term.textContent.trim()}. ${spokenText(definition)}` });
      });
    }
    return blocks.flatMap((block) => chunks(block.text).map((text) => ({ text, element: block.element })));
  }

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
    const record = active.record;
    unhighlight();
    active = null;
    version += 1;
    synth.cancel();
    setStatus(record, message);
    updateControls(record);
  }

  function chooseVoice() {
    const voices = synth.getVoices().filter((voice) => /^id(?:[-_]|$)/i.test(voice.lang));
    return voices.find((voice) => voice.localService) || voices[0] || null;
  }

  function speakChunk() {
    const session = active;
    if (!session || session.state !== "playing") return;
    const chunk = session.queue[session.index];
    if (!chunk) {
      stop("Selesai dibacakan. Kamu bisa mendengarkannya lagi.");
      return;
    }
    const token = ++version;
    const startOffset = session.offset;
    const utterance = new SpeechSynthesisUtterance(chunk.text.slice(startOffset));
    utterance.lang = "id-ID";
    utterance.voice = chooseVoice();
    utterance.rate = Number(session.record.rate.value);
    utterance.pitch = 1;
    utterance.volume = 1;
    session.utterance = utterance;
    chunk.element?.classList.add("narration-reading");
    const current = () => active === session && version === token;
    utterance.onstart = () => {
      if (current()) setStatus(session.record, "Sedang membacakan penjelasan.");
    };
    utterance.onboundary = (event) => {
      if (current() && event.name === "word") session.offset = startOffset + event.charIndex;
    };
    utterance.onend = () => {
      if (!current()) return;
      unhighlight();
      session.index += 1;
      session.offset = 0;
      speakChunk();
    };
    utterance.onerror = (event) => {
      if (!current()) return;
      stop(event.error === "not-allowed"
        ? "Suara belum diizinkan. Ketuk Dengarkan untuk mencoba lagi."
        : "Suara belum dapat diputar. Coba lagi atau gunakan browser yang mendukung pembacaan suara.");
    };
    // Cancellation can leave a browser's shared speech engine paused.
    synth.resume();
    try { synth.speak(utterance); }
    catch { stop("Suara belum dapat diputar di perangkat ini."); }
  }

  function play(record) {
    if (!supported || !visible(record.root)) return;
    if (active?.record === record && active.state === "paused") {
      active.state = "playing";
      setStatus(record, "Melanjutkan pembacaan.");
      updateControls(record);
      speakChunk();
      return;
    }
    stop();
    const queue = collect(record);
    if (!queue.length) {
      setStatus(record, "Belum ada penjelasan untuk dibacakan.");
      return;
    }
    active = { record, queue, index: 0, offset: 0, state: "playing", utterance: null };
    synth.cancel();
    setStatus(record, "Menyiapkan suara bahasa Indonesia…");
    updateControls(record);
    speakChunk();
  }

  function pause() {
    if (!active || active.state !== "playing") return;
    // Remember the current word and cancel, including on mobile speech engines
    // where native pause/resume do not reliably preserve the utterance.
    unhighlight();
    active.state = "paused";
    version += 1;
    synth.cancel();
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
        <label class="narration-speed">Kecepatan <select aria-label="Kecepatan pembacaan"><option value="0.8">Pelan</option><option value="0.95" selected>Normal</option><option value="1.1">Cepat</option></select></label>
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
      if (active?.record === record && active.state === "playing") {
        version += 1;
        synth.cancel();
        speakChunk();
      }
    });
    setStatus(record, supported ? "Bahasa Indonesia · suara mengikuti perangkat." : "Pembacaan suara belum tersedia di browser ini.");
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
      selector: 'h2, h3, p, dt, dd, .stone-references li',
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
  // Prime the device voice list; the voice is selected again at each chunk.
  if (supported) synth.getVoices();
  sync();
})();
