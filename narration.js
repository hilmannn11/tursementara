(() => {
  const browserSpeechSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const synth = browserSpeechSupported ? window.speechSynthesis : null;
  const audioLibrary = window.LITHERA_NARRATION_AUDIO || {};
  const supported = browserSpeechSupported || Object.keys(audioLibrary).length > 0;
  const records = new Set();
  const mounted = new WeakMap();
  let active = null;
  let version = 0;
  let pendingSync = false;
  const mobileSpeech = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor"/></svg>';

  const { collect, passageKey } = window.LitheraNarrationContent;

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
    version += 1;
    session.audio?.pause();
    if (session.audio) { session.audio.removeAttribute("src"); session.audio.load(); }
    synth?.cancel();
    setStatus(record, message);
    updateControls(record);
  }

  function chooseVoice() {
    if (!synth) return null;
    const voices = synth.getVoices().filter((voice) => /^id(?:[-_]|$)/i.test(voice.lang));
    const score = (voice) => {
      const name = `${voice.name} ${voice.voiceURI}`;
      return (/natural|neural|premium|enhanced/i.test(name) ? 100 : 0)
        + (/gadis|sari/i.test(name) ? 30 : 0)
        + (/google/i.test(name) ? 20 : 0)
        + (!voice.localService ? 10 : 0)
        + (voice.default ? 1 : 0);
    };
    return voices.sort((a, b) => score(b) - score(a))[0] || null;
  }

  function readyStatus() {
    if (Object.keys(audioLibrary).length) return "Suara AI Indonesia · hangat dan natural.";
    const voice = chooseVoice();
    return voice ? `Bahasa Indonesia · ${voice.name}` : "Bahasa Indonesia · suara mengikuti perangkat.";
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
      if (current() && session.state === "playing") { setStatus(session.record, "Sedang membacakan penjelasan."); highlight(); }
    });
    audio.addEventListener("waiting", () => {
      if (current() && session.state === "playing") setStatus(session.record, "Menyiapkan audio…");
    });
    audio.addEventListener("timeupdate", highlight);
    audio.addEventListener("ended", () => { if (current()) stop("Selesai dibacakan. Kamu bisa mendengarkannya lagi."); });
    const failed = () => {
      if (!current() || session.state !== "playing") return;
      // Only fall back before playback starts, to avoid repeating a passage.
      if (audio.currentTime === 0 && browserSpeechSupported) {
        audio.pause();
        session.audio = null;
        setStatus(session.record, "Audio belum tersedia. Menggunakan suara perangkat.");
        speakQueue();
      } else stop("Audio belum dapat diputar. Ketuk Dengarkan untuk mencoba lagi.");
    };
    audio.addEventListener("error", failed);
    audio.play().catch(failed);
  }

  function speakQueue() {
    const session = active;
    if (!session || session.state !== "playing") return;
    if (!session.queue[session.index]) {
      stop("Selesai dibacakan. Kamu bisa mendengarkannya lagi.");
      return;
    }
    const token = ++version;
    const current = () => active === session && version === token;
    session.nativePaused = false;
    session.utterances = session.queue.slice(session.index).map((chunk, relativeIndex) => {
      const index = session.index + relativeIndex;
      const startOffset = relativeIndex === 0 ? session.offset : 0;
      const utterance = new SpeechSynthesisUtterance(chunk.text.slice(startOffset));
      utterance.lang = "id-ID";
      utterance.voice = session.voice;
      utterance.rate = Number(session.record.rate.value);
      // Keep the selected voice's own prosody rather than artificially shifting pitch.
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => {
        if (!current()) return;
        unhighlight();
        session.index = index;
        session.offset = startOffset;
        chunk.element?.classList.add("narration-reading");
        setStatus(session.record, "Sedang membacakan penjelasan.");
      };
      utterance.onboundary = (event) => {
        if (current() && event.name === "word") session.offset = startOffset + event.charIndex;
      };
      utterance.onend = () => {
        if (!current()) return;
        unhighlight();
        session.index = index + 1;
        session.offset = 0;
        if (session.index === session.queue.length) stop("Selesai dibacakan. Kamu bisa mendengarkannya lagi.");
      };
      utterance.onerror = (event) => {
        if (!current()) return;
        stop(event.error === "not-allowed"
          ? "Suara belum diizinkan. Ketuk Dengarkan untuk mencoba lagi."
          : "Suara belum dapat diputar. Coba lagi atau gunakan browser yang mendukung pembacaan suara.");
      };
      return utterance;
    });
    // Cancellation can leave a browser's shared speech engine paused.
    synth.resume();
    // Queue the whole passage together: the engine prepares the next sentence
    // without waiting for JavaScript to restart speech after every short chunk.
    try { session.utterances.forEach((utterance) => synth.speak(utterance)); }
    catch { stop("Suara belum dapat diputar di perangkat ini."); }
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
      } else if (active.nativePaused) {
        active.nativePaused = false;
        active.queue[active.index]?.element?.classList.add("narration-reading");
        synth.resume();
      } else speakQueue();
      return;
    }
    stop();
    const queue = collect(record);
    if (!queue.length) {
      setStatus(record, "Belum ada penjelasan untuk dibacakan.");
      return;
    }
    active = { record, queue, index: 0, offset: 0, state: "playing", voice: chooseVoice(), utterances: [], nativePaused: false };
    synth?.cancel();
    setStatus(record, "Menyiapkan suara bahasa Indonesia…");
    updateControls(record);
    const text = queue.map((chunk) => chunk.text).join(" ");
    const clip = audioLibrary[passageKey(text)];
    if (clip?.text === text) playAudio(active, clip);
    else if (browserSpeechSupported) speakQueue();
    else stop("Audio untuk penjelasan ini belum tersedia.");
  }

  function pause() {
    if (!active || active.state !== "playing") return;
    unhighlight();
    active.state = "paused";
    if (active.audio) {
      active.audio.pause();
    } else if (mobileSpeech) {
      // Mobile engines may not resume a paused utterance. Preserve the word.
      version += 1;
      synth.cancel();
    } else {
      active.nativePaused = true;
      synth.pause();
    }
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
      if (active?.record === record && active.audio) {
        active.audio.playbackRate = Number(record.rate.value);
      } else if (active?.record === record && active.state === "playing") {
        unhighlight();
        version += 1;
        synth.cancel();
        speakQueue();
      } else if (active?.record === record && active.nativePaused) {
        active.nativePaused = false;
        version += 1;
        synth.cancel();
      }
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
  // Voice lists may arrive after the page loads. Freeze one voice per passage.
  if (browserSpeechSupported) {
    synth.getVoices();
    synth.addEventListener("voiceschanged", () => {
      for (const record of records) if (active?.record !== record) setStatus(record, readyStatus());
    });
  }
  sync();
})();
