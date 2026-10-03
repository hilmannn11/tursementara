const STORAGE_KEY = "bentengMissionBadges";
const QUIZ_STORAGE_KEY = "bentengMissionVerifiedQuizzesV2";
const LEGACY_QUIZ_COUNT_KEY = "bentengMissionLegacyBadgeCount";
const ROUTE_FORWARD_YAW = 0;
const ROUTE_BACK_YAW = 180;
const useHdPanoramas = !window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
const panoramaAsset = (number) => `./assets/panoramas/${number}${useHdPanoramas ? "-hd" : ""}.webp`;

const rooms = [
  {
    id: "titik-1",
    title: "Titik 1",
    description: "Awal jalur virtual. Klik panah di lantai untuk berjalan maju ke titik berikutnya.",
    panorama: panoramaAsset(1),
    badge: "The Wanderer",
    badgeImage: "./assets/badges/homo-erectus.webp",
    archive: {
      title: "Arsip Titik 1",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik ini menjadi awal perjalanan virtual. Narasi arsip bisa diganti dengan penjelasan sejarah lokasi, fungsi ruang, atau cerita pengunjung.",
    },
    quiz: {
      question: "Apa peran Titik 1 dalam jalur virtual?",
      options: ["Awal perjalanan virtual", "Titik akhir perjalanan", "Halaman koleksi badge", "Pintu keluar situs"],
      answer: 0,
    },
  },
  {
    id: "titik-2",
    title: "Titik 2",
    description: "Titik lanjutan. Arahkan pandangan ke jalur depan, lalu klik panah untuk maju lagi.",
    panorama: panoramaAsset(2),
    stoneHotspot: { pitch: -7, yaw: -57 },
    badge: "The Survivor",
    badgeImage: "./assets/badges/homo-neanderthal.webp",
    archive: {
      title: "Arsip Titik 2",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik kedua dapat memuat cerita lanjutan, foto pembanding, peta posisi, atau informasi bangunan di sekitar jalur.",
    },
    quiz: {
      question: "Informasi apa yang dapat melengkapi arsip di Titik 2?",
      options: ["Foto pembanding dan peta posisi", "Daftar permainan", "Jadwal pertandingan", "Katalog belanja"],
      answer: 0,
    },
  },
  {
    id: "titik-3",
    title: "Titik 3",
    description: "Titik ketiga jalur virtual. Teruskan perjalanan ke panorama berikutnya.",
    panorama: panoramaAsset(3),
    stoneHotspot: { pitch: -10, yaw: -54 },
    badge: "The Thinker",
    badgeImage: "./assets/badges/homo-sapiens.webp",
    archive: {
      title: "Arsip Titik 3",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik ketiga menyambungkan awal perjalanan dengan bagian jalur berikutnya. Catatan sejarah lokasi dapat ditambahkan setelah diverifikasi.",
    },
    quiz: {
      question: "Ke titik berapa perjalanan berlanjut setelah Titik 3?",
      options: ["Titik 4", "Titik 1", "Titik 7", "Kembali ke awal situs"],
      answer: 0,
    },
  },
  ...[4, 5, 6, 7].map((number) => ({
    id: `titik-${number}`,
    title: `Titik ${number}`,
    description: number === 7
      ? "Titik terakhir dalam rangkaian tujuh panorama. Putar pandangan ke belakang untuk kembali."
      : `Titik ${number} dalam jalur virtual. Lanjutkan ke panorama berikutnya atau kembali ke titik sebelumnya.`,
    panorama: panoramaAsset(number),
    ...(number === 4 ? { stoneHotspot: { pitch: -16, yaw: -44 } } : {}),
    archive: {
      title: `Arsip Titik ${number}`,
      type: "Foto panorama dan catatan lokasi",
      body: `Panorama ke-${number} dalam jalur virtual. Penjelasan sejarah dan identitas lokasi pada titik ini masih perlu dilengkapi dan diverifikasi.`,
    },
  })),
];

const badgeRooms = rooms.filter((room) => room.badge);
const quizRooms = rooms.filter((room) => room.quiz);
const sceneLinks = Object.fromEntries(rooms.map((room, index) => [room.id, {
  ...(index < rooms.length - 1 ? {
    forward: {
      target: rooms[index + 1].id,
      yaw: ROUTE_FORWARD_YAW,
      targetYaw: ROUTE_FORWARD_YAW,
      label: `Maju ke Titik ${index + 2}`,
    },
  } : {}),
  ...(index > 0 ? {
    back: {
      target: rooms[index - 1].id,
      yaw: ROUTE_BACK_YAW,
      targetYaw: ROUTE_BACK_YAW,
      label: `Balik ke Titik ${index}`,
    },
  } : {}),
}]));

let currentRoom = rooms[0];
let viewer;
let tourCreated = false;
let quizTimer;
let quizAnswered = false;
let activeArchiveRoomId = rooms[0].id;
let transitionTimer;

const archiveModal = document.querySelector("#archiveModal");
const quizModal = document.querySelector("#quizModal");
const badgeToast = document.querySelector("#badgeToast");
const badgeToastName = document.querySelector("#badgeToastName");
let badgeToastTimer;
let badgeToastHideTimer;
let pendingBadgeToast = null;
const archiveModalContent = document.querySelector("#archiveModalContent");
const quizContent = document.querySelector("#quizContent");
const viewerShell = document.querySelector(".viewer-shell");
const tourFloorArrow = document.querySelector("#tourFloorArrow");
const tourViewControls = document.querySelector("#tourViewControls");
const explorationContent = document.querySelector("#explorationContent");
const homeScreen = document.querySelector("#home");
const aboutPage = document.querySelector("#aboutPage");
const pageSections = ["tourIntro", "kendenglembu", "archive", "profile"].map((id) => document.querySelector(`#${id}`));
const globalNav = document.querySelector("#globalNav");
const viewerHint = document.querySelector("#viewerHint");
const viewerTools = document.querySelector("#viewerTools");
const viewerError = document.querySelector("#viewerError");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let viewerHintShown = false;
let hintCheckFrame;
let viewerInView = false;
let hintTimer;
let floorPointerStart;
let floorPointerDragged = false;

function getBadges() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    saved = [];
  }
  const earnedCount = Array.isArray(saved) ? badgeRooms.filter((room) => saved.includes(room.id)).length : 0;
  const badges = badgeRooms.slice(0, earnedCount).map((room) => room.id);
  if (JSON.stringify(saved) !== JSON.stringify(badges)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(badges));
  }
  return badges;
}

function getCompletedQuizzes() {
  let saved;
  const stored = localStorage.getItem(QUIZ_STORAGE_KEY);
  try {
    saved = JSON.parse(stored || "null");
  } catch {
    saved = null;
  }
  // Older visits recorded badge count but not which quiz earned each badge.
  // Keep those badges, then require that many distinct verified quizzes
  // before another badge can be earned. Do not guess the old question IDs.
  if (!Array.isArray(saved)) {
    const legacyCount = getBadges().length;
    if (legacyCount) localStorage.setItem(LEGACY_QUIZ_COUNT_KEY, String(legacyCount));
    saved = [];
  }
  const completed = quizRooms.filter((room) => saved.includes(room.id)).map((room) => room.id);
  if (JSON.stringify(saved) !== JSON.stringify(completed)) {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(completed));
  }
  return completed;
}

function saveNextBadge() {
  const badges = getBadges();
  const nextRoom = badgeRooms[badges.length];
  if (!nextRoom) return null;
  badges.push(nextRoom.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(badges));
  renderProfile();
  return nextRoom;
}

function hideBadgeToast() {
  clearTimeout(badgeToastTimer);
  clearTimeout(badgeToastHideTimer);
  badgeToast.classList.remove("is-visible");
  badgeToastHideTimer = window.setTimeout(() => { badgeToast.hidden = true; }, reducedMotion.matches ? 0 : 240);
}

function showBadgeToast(room) {
  clearTimeout(badgeToastTimer);
  clearTimeout(badgeToastHideTimer);
  badgeToastName.textContent = room.badge;
  badgeToast.hidden = false;
  requestAnimationFrame(() => badgeToast.classList.add("is-visible"));
  badgeToastTimer = window.setTimeout(hideBadgeToast, 4000);
}

function updateRoomPanel(roomId) {
  hideFloorArrow();
  currentRoom = rooms.find((room) => room.id === roomId) || rooms[0];
  document.querySelector("#panorama").setAttribute("aria-label", `Viewer panorama 360 derajat, ${currentRoom.title}`);
}

function createTour() {
  if (!window.pannellum) {
    viewerError.hidden = false;
    return;
  }
  viewer = pannellum.viewer("panorama", {
    default: {
      firstScene: rooms[0].id,
      sceneFadeDuration: 450,
      autoLoad: true,
      compass: false,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      hfov: 95,
      yaw: ROUTE_FORWARD_YAW,
    },
    scenes: Object.fromEntries(
      rooms.map((room) => [
        room.id,
        {
          title: room.title,
          type: "equirectangular",
          panorama: room.panorama,
          hotSpots: room.stoneHotspot ? [{
            ...room.stoneHotspot,
            type: "info",
            text: "Buka arsip batu",
            cssClass: "tour-info-hotspot",
            clickHandlerFunc: () => openArchive(room.id),
          }] : [],
        },
      ])
    ),
  });

  viewer.on("scenechange", (sceneId) => updateRoomPanel(sceneId));
  viewer.on("load", () => {
    viewerError.hidden = true;
    viewerTools.hidden = false;
    tourViewControls.hidden = false;
    maybeShowViewerHint();
    viewer.getContainer().querySelectorAll(".tour-info-hotspot").forEach((marker) => {
      marker.tabIndex = 0;
      marker.setAttribute("role", "button");
      const label = "Buka arsip batu pada titik ini";
      marker.setAttribute("aria-label", label);
      marker.title = label;
    });
  });
  viewer.getContainer().addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const marker = event.target.closest(".tour-info-hotspot");
    if (!marker) return;
    event.preventDefault();
    openArchive(currentRoom.id);
  });
  viewer.on("error", () => {
    hideFloorArrow();
    hideViewerHint();
    viewerTools.hidden = true;
    tourViewControls.hidden = true;
    viewerError.hidden = false;
  });
  updateRoomPanel(rooms[0].id);
}

function hideViewerHint() {
  clearTimeout(hintTimer);
  viewerHint.hidden = true;
}

function showViewerHint() {
  if (viewerTools.hidden || document.hidden) return;
  clearTimeout(hintTimer);
  viewerHintShown = true;
  viewerHint.hidden = false;
  hintTimer = setTimeout(hideViewerHint, 3000);
}

function maybeShowViewerHint() {
  if (viewerHintShown || document.body.classList.contains("page-is-exiting")) return;
  if (!viewerInView || explorationContent.hidden || viewerTools.hidden || document.hidden) return;
  if (explorationContent.dataset.view !== "kendenglembu") return;
  const rect = viewerShell.getBoundingClientRect();
  const navBottom = document.fullscreenElement ? 0 : globalNav.getBoundingClientRect().bottom;
  const hintTop = rect.top + parseFloat(getComputedStyle(viewerHint).top);
  if (rect.top > innerHeight * 0.55 || hintTop < navBottom + 8 || hintTop + 120 > innerHeight) return;
  showViewerHint();
}

function scheduleViewerHintCheck() {
  if (viewerHintShown || hintCheckFrame) return;
  hintCheckFrame = requestAnimationFrame(() => {
    hintCheckFrame = null;
    maybeShowViewerHint();
  });
}

function walk(direction) {
  const nextStep = sceneLinks[currentRoom.id]?.[direction];
  if (!nextStep) {
    return;
  }
  hideFloorArrow();
  viewer.loadScene(nextStep.target, null, nextStep.targetYaw);
}

function normalizeYaw(yaw) {
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

function hideFloorArrow() {
  tourFloorArrow.hidden = true;
}

function floorDirection() {
  const links = sceneLinks[currentRoom.id] || {};
  const yaw = viewer.getYaw();
  const closest = Object.entries(links).map(([direction, link]) => {
    const bearing = link.yaw;
    return { direction, distance: Math.abs(normalizeYaw(yaw - bearing)) };
  }).sort((first, second) => first.distance - second.distance)[0];
  return closest?.distance <= 70 ? closest.direction : null;
}

function floorPoint(event) {
  if (!viewer?.isLoaded() || document.hidden || explorationContent.hidden || archiveModal.open || quizModal.open) return null;
  if (!(event.target instanceof Element) || !event.target.closest("#panorama") || event.target.closest(".tour-info-hotspot")) return null;
  const rect = viewerShell.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < 0 || x > rect.width || y < rect.height * 0.52 || y > rect.height - 72) return null;
  return { x, y };
}

function showFloorArrow(event) {
  const point = floorPoint(event);
  const direction = point && floorDirection();
  if (!direction) {
    hideFloorArrow();
    return;
  }
  const centerY = viewerShell.clientHeight / 2;
  const depth = Math.min(1, Math.max(0, (point.y - centerY) / (viewerShell.clientHeight * 0.35)));
  tourFloorArrow.style.setProperty("--floor-scale", String(0.72 + depth * 0.4));
  tourFloorArrow.style.left = `${point.x}px`;
  tourFloorArrow.style.top = `${point.y}px`;
  tourFloorArrow.hidden = false;
}

function openArchive(roomId) {
  const room = rooms.find((item) => item.id === roomId);
  activeArchiveRoomId = room.id;
  clearTimeout(quizTimer);

  archiveModalContent.innerHTML = `
    <p class="eyebrow">${room.title}</p>
    <h2 id="archiveTitle">${room.archive.title}</h2>
    <div class="archive-meta">
      <div class="archive-thumb">ARSIP</div>
      <div>
        <strong>${room.archive.type}</strong>
        <p>${room.archive.body}</p>
      </div>
    </div>
    <p class="provenance-note">Materi demo: narasi dan identitas lokasi foto belum diverifikasi. Referensi jurnal tersedia terpisah di halaman Arsip dan tidak menjadi atribusi foto ini.</p>
  `;

  archiveModal.showModal();
}

function closeArchiveAndScheduleQuiz() {
  archiveModal.close();
  clearTimeout(quizTimer);
  const roomId = activeArchiveRoomId;
  if (rooms.find((room) => room.id === roomId)?.quiz) {
    quizTimer = setTimeout(() => openQuiz(roomId), 650);
  }
}

function openQuiz(roomId) {
  const room = rooms.find((item) => item.id === roomId);
  const alreadyCompleted = getCompletedQuizzes().includes(room.id);
  const legacyUnknown = !alreadyCompleted && Number(localStorage.getItem(LEGACY_QUIZ_COUNT_KEY)) > 0;

  quizAnswered = alreadyCompleted;
  pendingBadgeToast = null;

  quizContent.innerHTML = `
    <div class="dialog-toolbar">
      <h2 id="quizTitle">${room.title}</h2>
      <button id="quizCloseButton" class="quiz-close-button" type="button" aria-label="Tutup kuis" aria-describedby="quizCloseHint" ${alreadyCompleted ? "" : "disabled"}><img src="./assets/icons/x.svg" alt="" width="22" height="22" /></button>
    </div>
    <div class="dialog-body">
    <p class="eyebrow">Kuis Misi</p>
    <p id="quizStatus" class="quiz-status ${alreadyCompleted ? "is-complete" : legacyUnknown ? "is-legacy" : "is-pending"}" role="status">${alreadyCompleted ? "✓ Sudah dijawab" : legacyUnknown ? "Riwayat soal lama belum tercatat" : "○ Belum dijawab"}</p>
    <p id="quizCloseHint" class="quiz-close-hint">${alreadyCompleted ? "Kuis ini sudah selesai. Kamu boleh mencoba lagi, tetapi progres tidak bertambah." : legacyUnknown ? "Badge lama tetap tersimpan. Progres berikutnya bertambah setelah lebih banyak kuis berbeda tercatat." : "Jawab dengan benar untuk mengaktifkan tombol tutup."}</p>
    <p id="quizQuestion">${room.quiz.question}</p>
    <div class="quiz-options">
      ${room.quiz.options
        .map((option, index) => `<button type="button" data-index="${index}">${option}</button>`)
        .join("")}
    </div>
    <p id="quizFeedback" class="quiz-feedback" aria-live="polite"></p>
    </div>
  `;

  quizContent.querySelectorAll("button").forEach((button) => {
    if (button.dataset.index !== undefined) {
      button.addEventListener("click", () => checkAnswer(room, Number(button.dataset.index)));
    }
  });

  quizContent.querySelector("#quizCloseButton").addEventListener("click", () => quizModal.close());

  quizModal.showModal();
}

function checkAnswer(room, selectedIndex) {
  const feedback = document.querySelector("#quizFeedback");
  const options = [...quizContent.querySelectorAll(".quiz-options button")];
  const selectedButton = options[selectedIndex];

  options.forEach((button) => button.classList.remove("is-correct", "is-wrong"));

  if (selectedIndex === room.quiz.answer) {
    quizAnswered = true;
    const completed = getCompletedQuizzes();
    const firstCorrectAnswer = !completed.includes(room.id);
    let unlockedBadge = null;
    if (firstCorrectAnswer) {
      const updated = [...completed, room.id];
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(updated));
      if (updated.length > getBadges().length) unlockedBadge = saveNextBadge();
    }
    if (unlockedBadge) pendingBadgeToast = unlockedBadge;
    selectedButton.classList.add("is-correct");
    options.forEach((button) => (button.disabled = true));
    feedback.className = "quiz-feedback is-success";
    feedback.textContent = !firstCorrectAnswer
      ? "Benar. Kuis ini sudah pernah dijawab; progres tidak bertambah. Coba kuis di titik lain untuk melanjutkan."
      : unlockedBadge
        ? `Benar. Badge "${unlockedBadge.badge}" berhasil dikumpulkan. Kamu bisa menutup kuis.`
        : getBadges().length === badgeRooms.length
          ? "Benar. Semua badge sudah terkumpul. Kamu bisa menutup kuis."
          : "Benar. Kuis ini sekarang tercatat. Jawab kuis berbeda untuk melanjutkan progres badge.";
    const status = quizContent.querySelector("#quizStatus");
    status.className = "quiz-status is-complete";
    status.textContent = "✓ Sudah dijawab";
    quizContent.querySelector("#quizCloseButton").disabled = false;
    quizContent.querySelector("#quizCloseHint").textContent = "Kuis selesai. Mengulang kuis ini tidak menambah progres.";
    quizContent.querySelector("#quizCloseButton").focus({ preventScroll: true });
  } else {
    selectedButton.classList.add("is-wrong");
    feedback.className = "quiz-feedback is-error";
    feedback.textContent = "Jawaban belum tepat. Coba lagi.";
  }
}

function renderArchiveGrid() {
  const grid = document.querySelector("#archiveGrid");
  grid.innerHTML = rooms
    .map(
      (room, index) => `
        <article class="archive-card">
          <div class="archive-visual" style="background-image: linear-gradient(180deg, rgba(16, 24, 21, 0.02), rgba(16, 24, 21, 0.58)), url('${room.panorama}');" aria-hidden="true">
            <span class="archive-number">0${index + 1}</span>
            <span class="archive-visual-label">${room.title}</span>
          </div>
          <div class="archive-card-body">
            <p class="eyebrow">Arsip ${String(index + 1).padStart(2, "0")}</p>
            <h3>${room.archive.title}</h3>
            <p>${room.archive.body}</p>
            <button class="button secondary" type="button" data-room="${room.id}">Buka Arsip</button>
          </div>
        </article>
      `
    )
    .join("");

  grid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => openArchive(button.dataset.room));
  });
}

function renderProfile() {
  const badges = getBadges();
  const percent = Math.round((badges.length / badgeRooms.length) * 100);
  document.querySelector("#heroProgress").textContent = `${badges.length}/${badgeRooms.length} badge`;
  const heroProgressBar = document.querySelector("#heroProgressBar");
  heroProgressBar.dataset.level = String(badges.length);
  heroProgressBar.style.width = `${percent}%`;
  heroProgressBar.parentElement.setAttribute("aria-valuenow", String(badges.length));
  heroProgressBar.parentElement.setAttribute("aria-valuetext", `${badges.length} dari ${badgeRooms.length} badge`);
  document.querySelector("#profileBadgeCount").textContent = badges.length;
  document.querySelector("#homeBadgeCount").textContent = badges.length;
  document.querySelector("#collectionProgress").value = badges.length;
  document.querySelector("#collectionPercent").textContent = `${percent}%`;
  document.querySelector("#collectionMessage").textContent = badges.length === badgeRooms.length
    ? "Lengkap! Setiap tantangan sudah menjadi bagian dari koleksimu."
    : badges.length === 0 ? "Perjalanan besarmu dimulai dari satu badge."
    : `Sudah ${badges.length} badge! Tinggal ${badgeRooms.length - badges.length} lagi untuk melengkapi koleksimu.`;
  document.querySelector(".reward-panel").classList.toggle("is-unlocked", badges.length === badgeRooms.length);
  document.querySelector("#rewardText").textContent =
    badges.length === badgeRooms.length
      ? "Selamat. Sertifikat digital prototipe terbuka karena semua badge sudah terkumpul."
      : "Kumpulkan semua badge untuk membuka sertifikat digital.";

  document.querySelector("#badgeGrid").innerHTML = badgeRooms
    .map((room) => {
      const earned = badges.includes(room.id);
      return `
        <article class="badge-card ${earned ? "earned" : ""}">
          <span class="badge-state">${earned ? "Terkumpul" : "Belum terbuka"}</span>
          <div class="badge-visual ${earned ? "is-earned" : "is-locked"}">
            <img class="badge-art" src="${room.badgeImage}" alt="${room.badge}" loading="lazy" decoding="async" />
            ${earned ? "" : '<span class="badge-icon" role="img" aria-label="Badge terkunci"></span>'}
          </div>
          <strong>${room.badge}</strong>
          <p class="badge-caption">${["Langkah pertama, cerita pertama.", "Rasa penasaran membawamu lebih jauh.", "Satu penemuan melengkapi perjalanan."][badgeRooms.indexOf(room)]}</p>
          <small>${earned ? "Sudah didapat" : "Temukan di tur virtual"}</small>
          <a class="badge-challenge" href="#sites" aria-label="Jelajahi tur virtual untuk badge ${room.badge}">Jelajahi tur virtual<span aria-hidden="true">&rarr;</span></a>
        </article>
      `;
    })
    .join("");
}

function showExploration(targetId, updateHistory = true) {
  // Preserve old shared links without presenting Malangsari as a virtual tour.
  const oldRoutes = { tour: "kendenglembu", malangsari: "archive" };
  const validViews = ["sites", "kendenglembu", "archive", "profile"];
  const routeKey = validViews.includes(oldRoutes[targetId] || targetId) ? (oldRoutes[targetId] || targetId) : "sites";
  const isTour = routeKey === "kendenglembu";
  if (routeKey !== targetId) history.replaceState({ targetId: routeKey }, "", `#${routeKey}`);
  const visibleSections = isTour ? ["tourIntro", "kendenglembu"] : [routeKey];

  pageSections.forEach((section) => {
    section.hidden = !visibleSections.includes(section.id);
  });

  homeScreen.hidden = true;
  aboutPage.hidden = true;
  explorationContent.hidden = false;
  explorationContent.dataset.view = routeKey;
  document.body.classList.remove("home-locked");
  document.body.classList.add("exploration-active");
  updateNavigation(routeKey);
  if (!isTour) window.scrollTo({ top: 0, left: 0, behavior: "instant" });

  if (isTour) {
    requestAnimationFrame(() => {
      if (explorationContent.hidden || explorationContent.dataset.view !== "kendenglembu") return;
      if (!tourCreated) {
        createTour();
        tourCreated = Boolean(viewer);
      } else {
        viewer.resize();
        maybeShowViewerHint();
      }
      requestAnimationFrame(scrollTourIntoView);
    });
  }

  if (updateHistory && location.hash !== `#${routeKey}`) {
    history.pushState({ view: "exploration", targetId: routeKey }, "", `#${routeKey}`);
  }
}

function scrollTourIntoView() {
  if (explorationContent.hidden || explorationContent.dataset.view !== "kendenglembu") return;
  const top = viewerShell.getBoundingClientRect().top + window.scrollY - globalNav.getBoundingClientRect().height - 10;
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "instant" });
}

function updateNavigation(routeKey) {
  globalNav.hidden = routeKey === "home";
  restartHomeSlideTimer();
  globalNav.querySelector(".explore-nav-links").hidden = ["about", "sites", "archive", "profile"].includes(routeKey);
  document.querySelector("#siteChooser").hidden = routeKey !== "sites";
  document.querySelectorAll("[data-site-route]").forEach((link) => {
    const isActive = link.dataset.siteRoute === routeKey;
    link.classList.toggle("is-active", isActive);
    link.querySelector("[data-site-status]").textContent = isActive ? "Sedang dijelajahi" : "Mulai tur 360°";
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const titles = { home: "Beranda", sites: "Tur Virtual", kendenglembu: "Kendenglembu", archive: "Arsip", profile: "Badge", about: "About" };
  document.title = `${titles[routeKey]} | Lithera`;
  document.querySelectorAll("[data-explore-route]").forEach((link) => {
    const isActive = link.dataset.exploreRoute === routeKey;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function transitionTo(renderPage) {
  clearTimeout(transitionTimer);
  clearTimeout(quizTimer);
  hideBadgeToast();
  hideFloorArrow();
  hideViewerHint();
  document.body.classList.add("page-is-exiting");
  transitionTimer = window.setTimeout(() => {
    renderPage();
    requestAnimationFrame(() => {
      document.body.classList.remove("page-is-exiting");
      maybeShowViewerHint();
      const heading = !homeScreen.hidden ? document.querySelector(".lithera-logo")
        : !aboutPage.hidden ? aboutPage.querySelector("h1")
        : explorationContent.dataset.view === "kendenglembu" ? document.querySelector("#kendenglembu h2")
        : explorationContent.querySelector("section:not([hidden]) h1, section:not([hidden]) h2");
      if (heading && heading.tagName !== "A") heading.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
    });
  }, reducedMotion.matches ? 0 : 190);
}

function showHome(updateHistory = true) {
  hideFloorArrow();
  hideViewerHint();
  explorationContent.hidden = true;
  aboutPage.hidden = true;
  homeScreen.hidden = false;
  document.body.classList.remove("home-locked");
  document.body.classList.remove("exploration-active");
  updateNavigation("home");
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });

  if (updateHistory && location.hash !== "#home") {
    history.pushState({ view: "home" }, "", "#home");
  }
}

const homeSlides = [...document.querySelectorAll(".home-slide")];
const slideDots = [...document.querySelectorAll(".slide-dot")];
const slidePlace = document.querySelector("#slidePlace");
const slideLocation = document.querySelector("#slideLocation");
const slideNumber = document.querySelector("#slideNumber");
let activeHomeSlide = 0;
let homeSlideTimer;

function showHomeSlide(index) {
  if (!homeSlides.length) {
    return;
  }

  homeSlides[activeHomeSlide].classList.remove("is-active");
  activeHomeSlide = (index + homeSlides.length) % homeSlides.length;
  homeSlides[activeHomeSlide].classList.add("is-active");
  slidePlace.textContent = homeSlides[activeHomeSlide].dataset.place;
  slideLocation.textContent = "Banyuwangi, Jawa Timur, Indonesia";
  if (slideNumber) slideNumber.textContent = String(activeHomeSlide + 1).padStart(2, "0");
  updateSlideIndicator();
  restartSlideProgress();
}

function restartSlideProgress() {
  const progress = document.querySelector(".home-slide-progress span");
  if (!progress) return;
  progress.style.animation = "none";
  if (homeScreen.hidden || reducedMotion.matches) return;
  progress.getBoundingClientRect();
  progress.style.animation = "";
}

function updateSlideIndicator() {
  slideDots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeHomeSlide);
    dot.setAttribute("aria-label", `Gambar ${index + 1}${index === activeHomeSlide ? " aktif" : ""}`);
  });
}

function restartHomeSlideTimer() {
  clearInterval(homeSlideTimer);
  restartSlideProgress();
  if (homeSlides.length > 1 && !homeScreen.hidden && !document.hidden && !reducedMotion.matches) {
    homeSlideTimer = window.setInterval(() => showHomeSlide(activeHomeSlide + 1), 5200);
  }
}

slideDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    showHomeSlide(Number(dot.dataset.slide));
    restartHomeSlideTimer();
  });
});

updateSlideIndicator();
restartHomeSlideTimer();

document.addEventListener("visibilitychange", restartHomeSlideTimer);
reducedMotion.addEventListener("change", restartHomeSlideTimer);

const homeIntro = document.querySelector(".home-intro");
if (homeIntro) {
  homeIntro.classList.add("is-animated");
  const homeIntroObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    homeIntro.classList.add("is-visible");
    observer.disconnect();
  }, { threshold: 0.2 });
  homeIntroObserver.observe(homeIntro);
}

function showAbout(updateHistory = true) {
  hideFloorArrow();
  hideViewerHint();
  homeScreen.hidden = true;
  explorationContent.hidden = true;
  aboutPage.hidden = false;
  document.body.classList.remove("home-locked", "exploration-active");
  updateNavigation("about");
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });

  if (updateHistory && location.hash !== "#about") {
    history.pushState({ view: "about" }, "", "#about");
  }
}

if (window.location.hash === "#about") {
  showAbout(false);
} else if (window.location.hash && window.location.hash !== "#home") {
  showExploration(window.location.hash.slice(1), false);
} else {
  showHome(false);
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");
  if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const route = link.getAttribute("href").slice(1);
  if (!["home", "about", "sites", "kendenglembu", "archive", "profile"].includes(route)) return;
  event.preventDefault();
  transitionTo(() => route === "home" ? showHome() : route === "about" ? showAbout() : showExploration(route));
});

document.querySelector(".home-return-tag").addEventListener("click", (event) => {
  event.currentTarget.blur();
  transitionTo(() => showHome());
});

window.addEventListener("popstate", () => {
  transitionTo(() => applyRoute(false));
});
window.addEventListener("hashchange", () => transitionTo(() => applyRoute(false)));
history.scrollRestoration = "manual";
window.addEventListener("load", () => {
  // A hash represents a page here, not a native jump to its section element.
  requestAnimationFrame(() => {
    if (window.location.hash === "#kendenglembu") scrollTourIntoView();
    else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
});

function applyRoute(updateHistory = false) {
  if (window.location.hash === "#about") {
    showAbout(updateHistory);
  } else if (window.location.hash && window.location.hash !== "#home") {
    showExploration(window.location.hash.slice(1), updateHistory);
  } else {
    showHome(updateHistory);
  }
}

const viewerObserver = new IntersectionObserver(([entry]) => {
  viewerInView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
  if (viewerInView) maybeShowViewerHint();
  else {
    hideFloorArrow();
    hideViewerHint();
  }
}, { threshold: [0, 0.25] });
viewerObserver.observe(viewerShell);
window.addEventListener("scroll", () => { hideFloorArrow(); scheduleViewerHintCheck(); }, { passive: true });
window.addEventListener("resize", scheduleViewerHintCheck, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hideFloorArrow();
    hideViewerHint();
  } else maybeShowViewerHint();
});
const viewerHelp = document.querySelector("#viewerHelp");
viewerHelp.addEventListener("click", showViewerHint);
viewerHint.addEventListener("pointerenter", () => clearTimeout(hintTimer));
viewerHint.addEventListener("pointerleave", () => { hintTimer = setTimeout(hideViewerHint, 3000); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") hideViewerHint(); });

viewerShell.addEventListener("pointerdown", (event) => {
  floorPointerStart = { x: event.clientX, y: event.clientY };
  floorPointerDragged = false;
  if (event.pointerType === "touch") showFloorArrow(event);
});
viewerShell.addEventListener("pointermove", (event) => {
  if (event.buttons) {
    if (floorPointerStart && Math.hypot(event.clientX - floorPointerStart.x, event.clientY - floorPointerStart.y) > 8) {
      floorPointerDragged = true;
    }
    hideFloorArrow();
    return;
  }
  showFloorArrow(event);
});
viewerShell.addEventListener("pointerleave", hideFloorArrow);
viewerShell.addEventListener("pointercancel", hideFloorArrow);
viewerShell.addEventListener("click", (event) => {
  const point = floorPoint(event);
  if (point && !floorPointerDragged) {
    const direction = floorDirection();
    if (direction) walk(direction);
  }
  floorPointerStart = null;
  floorPointerDragged = false;
}, true);

document.querySelector("#closeArchiveButton").addEventListener("click", closeArchiveAndScheduleQuiz);
for (const overlay of [tourViewControls, viewerTools]) {
  overlay.addEventListener("pointerdown", (event) => event.stopPropagation());
  overlay.addEventListener("mousedown", (event) => event.stopPropagation());
  overlay.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
}
document.querySelector("#tourZoomIn").addEventListener("click", () => {
  if (viewer?.isLoaded()) viewer.setHfov(Math.max(45, viewer.getHfov() - 15));
});
document.querySelector("#tourZoomOut").addEventListener("click", () => {
  if (viewer?.isLoaded()) viewer.setHfov(Math.min(120, viewer.getHfov() + 15));
});
document.querySelector("#tourFullscreen").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else viewerShell.requestFullscreen();
});
document.addEventListener("fullscreenchange", () => {
  const active = !!document.fullscreenElement;
  const button = document.querySelector("#tourFullscreen");
  button.setAttribute("aria-label", active ? "Keluar layar penuh" : "Layar penuh");
  button.title = active ? "Keluar layar penuh" : "Layar penuh";
  requestAnimationFrame(() => viewer?.resize());
});
document.querySelector("#resetButton").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(QUIZ_STORAGE_KEY);
  localStorage.removeItem("bentengMissionCompletedQuizzes");
  localStorage.removeItem(LEGACY_QUIZ_COUNT_KEY);
  renderProfile();
});

archiveModal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeArchiveAndScheduleQuiz();
});

quizModal.addEventListener("cancel", (event) => {
  if (!quizAnswered) {
    event.preventDefault();
  }
});

quizModal.addEventListener("close", () => {
  if (pendingBadgeToast) showBadgeToast(pendingBadgeToast);
  pendingBadgeToast = null;
});

renderArchiveGrid();
renderProfile();
