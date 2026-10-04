const STORAGE_KEY = "bentengMissionBadges";
const QUIZ_STORAGE_KEY = "litheraStoneQuizzesV1";
const LEGACY_QUIZ_COUNT_KEY = "bentengMissionLegacyBadgeCount";
const ROUTE_FORWARD_YAW = 0;
const ROUTE_BACK_YAW = 180;
const PANORAMA_PIXEL_WIDTH = 8192;
const PANORAMA_PIXEL_HEIGHT = 4096;
const DEFAULT_TOUR_HFOV = 95;
// Each box is [left, top, right, bottom] in the 8192 × 4096 source panorama.
const PERSON_BLUR_BOXES = {
  1: [[350, 2065, 430, 2155]],
  2: [[7905, 2015, 7945, 2048], [8025, 2027, 8058, 2072]],
  3: [[348, 2043, 387, 2095], [470, 2035, 509, 2085]],
  4: [[1170, 2100, 1210, 2150], [1320, 2118, 1360, 2168]],
  6: [[1750, 2092, 1780, 2130], [1790, 2115, 1825, 2160], [1850, 2178, 1883, 2210]],
  7: [[2898, 2112, 2938, 2160], [3178, 2120, 3222, 2173]],
};
const STONE_MODELS = {
  first: {
    url: "./assets/models/batu-cekungan.glb",
    poster: "./assets/models/batu-cekungan-poster.png",
    alt: "Model 3D batu cekungan pertama yang dapat diputar",
  },
  second: {
    url: "./assets/models/batu-cekungan-2.glb",
    poster: "./assets/models/batu-cekungan-2-poster.png",
    alt: "Model 3D batu cekungan kedua yang dapat diputar",
  },
};
const MODEL_VIEWER_URL = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js";
const PLAQUE_PHOTO = "./assets/photos/papan-cagar-budaya-kendenglembu.webp";
const useHdPanoramas = !window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
const panoramaAsset = (number) => `./assets/panoramas/${number}${useHdPanoramas ? "-hd" : ""}.webp`;
let modelViewerImport;

function loadModelViewer() {
  modelViewerImport ||= import(MODEL_VIEWER_URL);
  return modelViewerImport;
}

const rooms = [
  {
    id: "titik-1",
    title: "Titik 1",
    description: "Awal jalur virtual. Klik panah di lantai untuk berjalan maju ke titik berikutnya.",
    panorama: panoramaAsset(1),
    personBlurBoxes: PERSON_BLUR_BOXES[1],
    badge: "The Wanderer",
    badgeImage: "./assets/badges/homo-erectus.webp",
    archive: {
      title: "Arsip Titik 1",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik ini menjadi awal perjalanan virtual. Narasi arsip bisa diganti dengan penjelasan sejarah lokasi, fungsi ruang, atau cerita pengunjung.",
    },
  },
  {
    id: "titik-2",
    title: "Titik 2",
    description: "Titik lanjutan. Arahkan pandangan ke jalur depan, lalu klik panah untuk maju lagi.",
    panorama: panoramaAsset(2),
    personBlurBoxes: PERSON_BLUR_BOXES[2],
    stoneHotspot: { pitch: -7, yaw: -57 },
    secondStoneHotspot: { pitch: -12, yaw: -51 },
    badge: "The Survivor",
    badgeImage: "./assets/badges/homo-neanderthal.webp",
    archive: {
      title: "Arsip Titik 2",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik kedua dapat memuat cerita lanjutan, foto pembanding, peta posisi, atau informasi bangunan di sekitar jalur.",
    },
  },
  {
    id: "titik-3",
    title: "Titik 3",
    description: "Titik ketiga jalur virtual. Teruskan perjalanan ke panorama berikutnya.",
    panorama: panoramaAsset(3),
    personBlurBoxes: PERSON_BLUR_BOXES[3],
    stoneHotspot: { pitch: -10, yaw: -54 },
    secondStoneHotspot: { pitch: -20, yaw: -54 },
    plaqueHotspot: { pitch: -4, yaw: 15 },
    blockedHotspot: { pitch: -28, yaw: 51 },
    badge: "The Thinker",
    badgeImage: "./assets/badges/homo-sapiens.webp",
    archive: {
      title: "Arsip Titik 3",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik ketiga menyambungkan awal perjalanan dengan bagian jalur berikutnya. Catatan sejarah lokasi dapat ditambahkan setelah diverifikasi.",
    },
  },
  ...[4, 5, 6, 7].map((number) => ({
    id: `titik-${number}`,
    title: `Titik ${number}`,
    description: number === 7
      ? "Titik terakhir dalam rangkaian tujuh panorama. Putar pandangan ke belakang untuk kembali."
      : `Titik ${number} dalam jalur virtual. Lanjutkan ke panorama berikutnya atau kembali ke titik sebelumnya.`,
    panorama: panoramaAsset(number),
    personBlurBoxes: PERSON_BLUR_BOXES[number] || [],
    ...(number === 4 ? { stoneHotspot: { pitch: -16, yaw: -44 } } : {}),
    ...(number === 4 ? { secondStoneHotspot: { pitch: -25, yaw: -54 } } : {}),
    ...(number === 5 ? { secondStoneHotspot: { pitch: -28, yaw: -93 } } : {}),
    ...(number === 4 ? { plaqueHotspot: { pitch: -15, yaw: 40 } } : {}),
    ...(number === 5 ? { plaqueHotspot: { pitch: -22, yaw: 157 } } : {}),
    ...(number === 4 ? { blockedHotspot: { pitch: -31, yaw: 97 } } : {}),
    archive: {
      title: `Arsip Titik ${number}`,
      type: "Foto panorama dan catatan lokasi",
      body: `Panorama ke-${number} dalam jalur virtual. Penjelasan sejarah dan identitas lokasi pada titik ini masih perlu dilengkapi dan diverifikasi.`,
    },
  })),
];

const badgeRooms = rooms.filter((room) => room.badge);
const stoneQuestions = Object.values(STONE_LESSONS).flatMap((lesson) => lesson.questions);
const QUESTIONS_PER_BADGE = stoneQuestions.length / badgeRooms.length;
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
let activeLessonId = null;
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
  // Preserve existing badges, but do not count demo questions as these lessons.
  if (!Array.isArray(saved)) {
    const legacyCount = getBadges().length;
    if (legacyCount) localStorage.setItem(LEGACY_QUIZ_COUNT_KEY, String(legacyCount));
    saved = [];
  }
  const completed = stoneQuestions.filter((question) => saved.includes(question.id)).map((question) => question.id);
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
          hotSpots: [
            ...[
              room.stoneHotspot && { ...room.stoneHotspot, model: "first" },
              room.secondStoneHotspot && { ...room.secondStoneHotspot, model: "second" },
            ].filter(Boolean).map(({ model, ...position }) => ({
              ...position,
              type: "info",
              text: "Buka arsip batu",
              cssClass: `tour-info-hotspot tour-info-hotspot--${model}`,
              clickHandlerFunc: () => openArchive(room.id, model),
            })),
            ...(room.plaqueHotspot ? [{
              ...room.plaqueHotspot,
              type: "info",
              text: "Lihat foto papan cagar budaya",
              cssClass: "tour-info-hotspot tour-plaque-hotspot",
              clickHandlerFunc: openPlaquePhoto,
            }] : []),
            ...(room.blockedHotspot ? [{
              ...room.blockedHotspot,
              type: "info",
              cssClass: "tour-blocked-hotspot",
            }] : []),
            ...(room.personBlurBoxes || []).map(([left, top, right, bottom]) => ({
              pitch: (PANORAMA_PIXEL_HEIGHT / 2 - (top + bottom) / 2) * 180 / PANORAMA_PIXEL_HEIGHT,
              yaw: ((left + right) / 2 - PANORAMA_PIXEL_WIDTH / 2) * 360 / PANORAMA_PIXEL_WIDTH,
              type: "info",
              scale: true,
              cssClass: "tour-person-blur",
              createTooltipFunc: (marker) => {
                marker.dataset.blurWidthDegrees = String((right - left) * 360 / PANORAMA_PIXEL_WIDTH);
                marker.dataset.blurHeightDegrees = String((bottom - top) * 180 / PANORAMA_PIXEL_HEIGHT);
                sizePersonBlur(marker);
              },
            })),
          ],
        },
      ])
    ),
  });

  viewer.on("scenechange", (sceneId) => updateRoomPanel(sceneId));
  viewer.on("zoomchange", updateBlockedHotspotSize);
  viewer.on("load", () => {
    updateBlockedHotspotSize();
    updatePersonBlurSizes();
    viewerError.hidden = true;
    viewerTools.hidden = false;
    tourViewControls.hidden = false;
    maybeShowViewerHint();
    viewer.getContainer().querySelectorAll(".tour-info-hotspot").forEach((marker) => {
      marker.tabIndex = 0;
      marker.setAttribute("role", "button");
      const label = marker.classList.contains("tour-plaque-hotspot")
        ? "Lihat foto papan cagar budaya"
        : marker.classList.contains("tour-info-hotspot--second")
          ? "Buka arsip batu cekungan kedua"
          : "Buka arsip batu cekungan pertama";
      marker.setAttribute("aria-label", label);
      marker.title = label;
    });
    viewer.getContainer().querySelectorAll(".tour-blocked-hotspot").forEach((marker) => {
      marker.setAttribute("role", "img");
      marker.setAttribute("aria-label", "Jalur ini tidak dapat dilalui");
    });
    viewer.getContainer().querySelectorAll(".tour-person-blur").forEach((marker) => {
      marker.setAttribute("aria-hidden", "true");
    });
  });
  viewer.getContainer().addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const marker = event.target.closest(".tour-info-hotspot");
    if (!marker) return;
    event.preventDefault();
    if (marker.classList.contains("tour-plaque-hotspot")) openPlaquePhoto();
    else openArchive(currentRoom.id, marker.classList.contains("tour-info-hotspot--second") ? "second" : "first");
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

function updateBlockedHotspotSize(hfov = viewer?.getHfov() ?? 95) {
  const baseSize = window.matchMedia("(max-width: 620px)").matches ? 78 : 112;
  const zoomScale = Math.max(0.45, Math.min(1, hfov / 95));
  viewerShell.style.setProperty("--blocked-hotspot-size", `${Math.round(baseSize * zoomScale)}px`);
}

function sizePersonBlur(marker) {
  const pixelsPerDegree = viewerShell.clientWidth / DEFAULT_TOUR_HFOV;
  marker.style.width = `${Number(marker.dataset.blurWidthDegrees) * pixelsPerDegree}px`;
  marker.style.height = `${Number(marker.dataset.blurHeightDegrees) * pixelsPerDegree}px`;
}

function updatePersonBlurSizes() {
  viewerShell.querySelectorAll(".tour-person-blur").forEach(sizePersonBlur);
}

function floorDirection() {
  const links = sceneLinks[currentRoom.id] || {};
  const yaw = viewer.getYaw();
  if (currentRoom.blockedHotspot && Math.abs(normalizeYaw(yaw - currentRoom.blockedHotspot.yaw)) <= 25) {
    return null;
  }
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

function openArchive(roomId, selectedModel) {
  const room = rooms.find((item) => item.id === roomId);
  if (!room) return;
  const modelId = selectedModel || (room.stoneHotspot ? "first" : room.secondStoneHotspot ? "second" : null);
  const stoneModel = modelId && STONE_MODELS[modelId];
  const lesson = STONE_LESSONS[modelId];
  if (!stoneModel || !lesson) return;
  activeLessonId = modelId;
  clearTimeout(quizTimer);

  archiveModalContent.innerHTML = `
    <p class="eyebrow">Kendenglembu · ${room.title}</p>
    <h2 id="archiveTitle" tabindex="-1">${lesson.title}</h2>
    <p class="stone-lesson-subtitle">${lesson.subtitle}</p>
    <div class="archive-meta has-stone-model">
        <div>
          <div class="stone-model-frame">
            <img class="stone-model-poster" src="${stoneModel.poster}" alt="Pratinjau ${stoneModel.alt}" />
            <model-viewer src="${stoneModel.url}" poster="${stoneModel.poster}" alt="${stoneModel.alt}" loading="eager" camera-controls touch-action="pan-y" camera-orbit="25deg 50deg auto" shadow-intensity="0.8" environment-image="neutral" ${reducedMotion.matches ? "" : 'auto-rotate rotation-per-second="12deg"'}></model-viewer>
          </div>
          <p class="stone-model-caption">Geser untuk memutar · cubit atau gulir untuk zoom. Bagian bawah batu diperkirakan dari foto.</p>
        </div>
    </div>
    <div class="stone-observation"><h3>Amati batu ini</h3><p>${lesson.observation}</p></div>
    <p class="provenance-note">Nama “batu lumpang” digunakan sebagai identifikasi sementara berdasarkan bentuk. Nomor 1 dan 2 adalah penanda di tur, bukan nomor inventaris. Umur, fungsi khusus, dan identitas koleksi kedua objek belum dicocokkan dengan catatan pengelola.</p>
    <div class="stone-lesson-sections">
      ${lesson.sections.map((section, index) => `
        <section aria-labelledby="stoneSection${index}">
          <h3 id="stoneSection${index}"><span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>${section.title}</h3>
          <p>${section.body}</p>
          ${section.sources.length ? `<p class="stone-inline-source">Rujukan: ${section.sources.map((key) => `<a href="${STONE_SOURCES[key].url}" target="_blank" rel="noopener noreferrer">[${lesson.sources.indexOf(key) + 1}]<span class="sr-only"> ${STONE_SOURCES[key].label} (tab baru)</span></a>`).join(" ")}</p>` : ""}
        </section>`).join("")}
    </div>
    <section class="stone-references" aria-labelledby="stoneSourcesTitle">
      <h3 id="stoneSourcesTitle">Baca sumbernya</h3>
      <p>Jurnal dirujuk dari daftar pustaka dokumen penelitian. Sumber Jogjacagar, bila tercantum, menjadi pembanding istilah; bukan identifikasi objek ini.</p>
      <ol>${lesson.sources.map((key) => `<li><a href="${STONE_SOURCES[key].url}" target="_blank" rel="noopener noreferrer">${STONE_SOURCES[key].label}<span class="sr-only"> (tab baru)</span></a></li>`).join("")}</ol>
    </section>
    <div class="stone-quiz-invitation"><p><strong>Uji pemahamanmu</strong><br />3 soal tentang batu ini. Setiap 2 soal berbeda yang benar membuka 1 badge; badge lama tetap tersimpan.</p><button type="button" class="button primary" id="startStoneQuiz">Mulai kuis ${lesson.title}</button></div>
  `;

  archiveModal.showModal();
  archiveModalContent.scrollTop = 0;
  archiveModalContent.querySelector("#archiveTitle").focus({ preventScroll: true });
  archiveModalContent.querySelector("#startStoneQuiz").addEventListener("click", closeArchiveAndScheduleQuiz);
  const frame = archiveModalContent.querySelector(".stone-model-frame");
  frame.querySelector("model-viewer").addEventListener("load", () => frame.classList.add("is-ready"), { once: true });
  loadModelViewer().catch(() => frame.classList.add("is-unavailable"));
}

function openPlaquePhoto() {
  activeLessonId = null;
  clearTimeout(quizTimer);
  archiveModalContent.innerHTML = `
    <p class="eyebrow">Dokumentasi situs</p>
    <h2 id="archiveTitle" class="plaque-photo-title">Papan Cagar Budaya Kendenglembu</h2>
    <a class="plaque-photo-link" href="${PLAQUE_PHOTO}" target="_blank" rel="noopener noreferrer" aria-label="Buka foto papan cagar budaya ukuran penuh di tab baru">
      <img src="${PLAQUE_PHOTO}" alt="Papan bertuliskan Keputusan Bupati Banyuwangi Nomor 188/82/Kep/429.011/2025, Bangunan Cagar Budaya, Situs Kendenglembu Banyuwangi" decoding="async" />
    </a>
    <p class="plaque-photo-caption">Klik atau ketuk foto untuk melihat ukuran penuh.</p>
  `;
  archiveModal.showModal();
}

function closeArchiveAndScheduleQuiz() {
  archiveModal.close();
  clearTimeout(quizTimer);
  const lessonId = activeLessonId;
  activeLessonId = null;
  archiveModalContent.replaceChildren();
  if (STONE_LESSONS[lessonId]) {
    quizTimer = setTimeout(() => openQuiz(lessonId), 650);
  }
}

function openQuiz(lessonId) {
  pendingBadgeToast = null;
  const lesson = STONE_LESSONS[lessonId];
  if (!lesson) return;
  const completed = getCompletedQuizzes();
  const firstUnfinished = lesson.questions.findIndex((question) => !completed.includes(question.id));
  renderQuizQuestion(lessonId, Math.max(0, firstUnfinished));
  quizModal.showModal();
}

function renderQuizQuestion(lessonId, questionIndex) {
  const lesson = STONE_LESSONS[lessonId];
  const question = lesson.questions[questionIndex];
  const completed = getCompletedQuizzes();
  const alreadyCompleted = completed.includes(question.id);
  quizAnswered = alreadyCompleted;
  quizContent.innerHTML = `
    <div class="dialog-toolbar">
      <h2 id="quizTitle">${lesson.title}</h2>
      <button id="quizCloseButton" class="quiz-close-button" type="button" aria-label="Tutup kuis" aria-describedby="quizCloseHint" ${alreadyCompleted ? "" : "disabled"}><img src="./assets/icons/x.svg" alt="" width="22" height="22" /></button>
    </div>
    <div class="dialog-body">
    <p class="eyebrow">Soal ${questionIndex + 1} dari ${lesson.questions.length} · Pilih satu jawaban</p>
    <p id="quizStatus" class="quiz-status ${alreadyCompleted ? "is-complete" : "is-pending"}" role="status">${alreadyCompleted ? "✓ Pernah dijawab benar" : "○ Belum selesai"}</p>
    <p id="quizCloseHint" class="quiz-close-hint">${alreadyCompleted ? "Boleh mencoba lagi. Soal yang sama hanya dihitung sekali." : "Jawab benar untuk melanjutkan atau menutup kuis. Baca petunjuk jika belum tepat."}</p>
    <p id="quizQuestion" tabindex="-1">${question.question}</p>
    <div class="quiz-options" role="group" aria-labelledby="quizQuestion">
      ${question.options
        .map((option, index) => `<button type="button" data-index="${index}"><span class="quiz-option-letter">${String.fromCharCode(65 + index)}</span><span>${option}</span></button>`)
        .join("")}
    </div>
    <p id="quizFeedback" class="quiz-feedback" aria-live="polite"></p>
    <p id="quizProgress" class="quiz-close-hint">${completed.length}/${stoneQuestions.length} soal berbeda selesai · 2 soal per badge.</p>
    <button id="quizNextButton" type="button" class="button primary" ${alreadyCompleted ? "" : "hidden"}>${questionIndex + 1 < lesson.questions.length ? "Soal berikutnya" : "Selesai"}</button>
    </div>
  `;

  quizContent.querySelectorAll("[data-index]").forEach((button) => {
    button.addEventListener("click", () => checkAnswer(question, Number(button.dataset.index)));
  });
  quizContent.querySelector("#quizCloseButton").addEventListener("click", () => quizModal.close());
  quizContent.querySelector("#quizNextButton").addEventListener("click", () => {
    if (questionIndex + 1 < lesson.questions.length) renderQuizQuestion(lessonId, questionIndex + 1);
    else quizModal.close();
  });
  quizContent.querySelector(".dialog-body").scrollTop = 0;
  quizContent.querySelector("#quizQuestion").focus({ preventScroll: true });
}

function checkAnswer(question, selectedIndex) {
  const feedback = document.querySelector("#quizFeedback");
  const options = [...quizContent.querySelectorAll(".quiz-options button")];
  const selectedButton = options[selectedIndex];

  options.forEach((button) => button.classList.remove("is-correct", "is-wrong"));

  if (selectedIndex === question.answer) {
    quizAnswered = true;
    const completed = getCompletedQuizzes();
    const firstCorrectAnswer = !completed.includes(question.id);
    let unlockedBadge = null;
    if (firstCorrectAnswer) {
      const updated = [...completed, question.id];
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(updated));
      if (Math.floor(updated.length / QUESTIONS_PER_BADGE) > getBadges().length) unlockedBadge = saveNextBadge();
    }
    if (unlockedBadge) pendingBadgeToast = unlockedBadge;
    selectedButton.classList.add("is-correct");
    options.forEach((button) => (button.disabled = true));
    feedback.className = "quiz-feedback is-success";
    feedback.textContent = `Benar, jawaban ${String.fromCharCode(65 + question.answer)}. ${question.explanation}${!firstCorrectAnswer ? " Soal ini sudah tercatat; progres tidak bertambah." : unlockedBadge ? ` Badge “${unlockedBadge.badge}” terbuka!` : ""}`;
    const status = quizContent.querySelector("#quizStatus");
    status.className = "quiz-status is-complete";
    status.textContent = "✓ Sudah dijawab";
    quizContent.querySelector("#quizCloseButton").disabled = false;
    quizContent.querySelector("#quizCloseHint").textContent = "Baca pembahasan, lalu lanjutkan. Kamu juga boleh menutup dan melanjutkan nanti.";
    quizContent.querySelector("#quizProgress").textContent = `${getCompletedQuizzes().length}/${stoneQuestions.length} soal berbeda selesai · 2 soal per badge.`;
    quizContent.querySelector("#quizNextButton").hidden = false;
    feedback.scrollIntoView({ block: "nearest", behavior: "instant" });
  } else {
    selectedButton.classList.add("is-wrong");
    feedback.className = "quiz-feedback is-error";
    feedback.textContent = `Belum tepat. ${question.hint}`;
    feedback.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
}

function renderArchiveGrid() {
  const grid = document.querySelector("#archiveGrid");
  grid.innerHTML = Object.entries(STONE_LESSONS)
    .map(
      ([modelId, lesson], index) => `
        <article class="archive-card">
          <div class="archive-visual" style="background-image: linear-gradient(180deg, rgba(16, 24, 21, 0.02), rgba(16, 24, 21, 0.58)), url('${STONE_MODELS[modelId].poster}');" aria-hidden="true">
            <span class="archive-number">0${index + 1}</span>
            <span class="archive-visual-label">${lesson.title}</span>
          </div>
          <div class="archive-card-body">
            <p class="eyebrow">Arsip ${String(index + 1).padStart(2, "0")}</p>
            <h3>${lesson.title}</h3>
            <p>${lesson.summary}</p>
            <button class="button secondary" type="button" data-stone="${modelId}">Pelajari ${lesson.title}</button>
          </div>
        </article>
      `
    )
    .join("");

  grid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => openArchive("titik-2", button.dataset.stone));
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
        updatePersonBlurSizes();
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
window.addEventListener("resize", () => {
  updateBlockedHotspotSize();
  updatePersonBlurSizes();
  scheduleViewerHintCheck();
}, { passive: true });
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
  requestAnimationFrame(() => {
    viewer?.resize();
    updatePersonBlurSizes();
  });
});
document.querySelector("#resetButton").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(QUIZ_STORAGE_KEY);
  localStorage.removeItem("bentengMissionVerifiedQuizzesV2");
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
