const STORAGE_KEY = "bentengMissionBadges";

const rooms = [
  {
    id: "titik-1",
    title: "Titik 1",
    description: "Awal jalur virtual. Klik panah di lantai untuk berjalan maju ke titik berikutnya.",
    panorama: "./assets/panoramas/titik-1.png",
    badge: "The Wanderer",
    badgeImage: "./assets/badges/homo-erectus.png",
    archive: {
      title: "Arsip Titik 1",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik ini menjadi awal perjalanan virtual. Narasi arsip bisa diganti dengan penjelasan sejarah lokasi, fungsi ruang, atau cerita pengunjung.",
    },
    quiz: {
      question: "Siapa saja orang yang ada di dalam sini?",
      options: ["MBG", "Entah gatau", "Rahmat Toyota", "Kungskik, Abay, dan orang Rusia"],
      answer: 3,
    },
  },
  {
    id: "titik-2",
    title: "Titik 2",
    description: "Titik lanjutan. Arahkan pandangan ke jalur depan, lalu klik panah untuk maju lagi.",
    panorama: "./assets/panoramas/titik-2.png",
    badge: "The Survivor",
    badgeImage: "./assets/badges/homo-neanderthal.png",
    archive: {
      title: "Arsip Titik 2",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik kedua dapat memuat cerita lanjutan, foto pembanding, peta posisi, atau informasi bangunan di sekitar jalur.",
    },
    quiz: {
      question: "Gacor ga ni web jadinya?",
      options: ["Gacor banget mas Hilman", "B aja", "Ga", "Anjay"],
      answer: 0,
    },
  },
  {
    id: "titik-3",
    title: "Titik 3",
    description: "Titik akhir jalur contoh. Nanti titik ini bisa disambungkan lagi ke panorama berikutnya.",
    panorama: "./assets/panoramas/titik-3.png",
    badge: "The Thinker",
    badgeImage: "./assets/badges/homo-sapiens.png",
    archive: {
      title: "Arsip Titik 3",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik akhir pada contoh ini bisa menjadi tempat arsip tambahan, refleksi, atau pintu menuju rute berikutnya jika foto panorama baru sudah tersedia.",
    },
    quiz: {
      question: "Apa yang dibutuhkan agar jalur virtual bisa diperpanjang?",
      options: ["Foto panorama titik berikutnya", "Menghapus semua arsip", "Mematikan hotspot"],
      answer: 0,
    },
  },
];

const sceneLinks = {
  "titik-1": {
    forward: { target: "titik-2", targetYaw: 0, label: "Maju ke Titik 2" },
  },
  "titik-2": {
    forward: { target: "titik-3", targetYaw: 0, label: "Maju ke Titik 3" },
    back: { target: "titik-1", targetYaw: 180, label: "Balik ke Titik 1" },
  },
  "titik-3": {
    back: { target: "titik-2", targetYaw: 180, label: "Balik ke Titik 2" },
  },
};

let currentRoom = rooms[0];
let viewer;
let tourCreated = false;
let quizTimer;
let walkClickTimer;
let quizAnswered = false;
const isTouchViewport = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

const archiveModal = document.querySelector("#archiveModal");
const quizModal = document.querySelector("#quizModal");
const archiveModalContent = document.querySelector("#archiveModalContent");
const quizContent = document.querySelector("#quizContent");
const viewerShell = document.querySelector(".viewer-shell");
const floorNavZone = document.querySelector("#floorNavZone");
const floorArrowButton = document.querySelector("#floorArrowButton");
const cursorGlow = document.querySelector("#cursorGlow");
const explorationContent = document.querySelector("#explorationContent");
const homeScreen = document.querySelector("#home");
const aboutPage = document.querySelector("#aboutPage");
const pageSections = ["malangsari", "tour", "archive", "profile"].map((id) => document.querySelector(`#${id}`));
let peekTimer;
let activeFloorDirection = "forward";

function getBadges() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveBadge(roomId) {
  const badges = new Set(getBadges());
  badges.add(roomId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...badges]));
  renderProfile();
}

function updateRoomPanel(roomId) {
  currentRoom = rooms.find((room) => room.id === roomId) || rooms[0];
  const roomNumber = rooms.findIndex((room) => room.id === currentRoom.id) + 1;
  document.querySelector("#roomTitle").textContent = currentRoom.title;
  document.querySelector("#roomDescription").textContent = currentRoom.description;
  document.querySelector("#roomIndex").textContent = String(roomNumber).padStart(2, "0");
  updateWalkButton();
}

function updateWalkButton() {
  updateActiveDirectionFromYaw();
}

function positionMobileArrow() {
  if (!isTouchViewport) {
    return;
  }

  floorArrowButton.classList.add("is-visible");
  floorArrowButton.style.setProperty("--arrow-x", "50%");
  floorArrowButton.style.setProperty("--arrow-y", "57%");
  floorArrowButton.style.setProperty("--arrow-scale", "0.68");
}

function createTour() {
  viewer = pannellum.viewer("panorama", {
    default: {
      firstScene: rooms[0].id,
      sceneFadeDuration: 650,
      autoLoad: true,
      compass: true,
      hfov: 105,
    },
    scenes: Object.fromEntries(
      rooms.map((room) => [
        room.id,
        {
          title: room.title,
          type: "equirectangular",
          panorama: room.panorama,
          hotSpots: [
            {
              pitch: 1,
              yaw: -32,
              type: "info",
              text: "Buka arsip",
              clickHandlerFunc: () => openArchive(room.id),
            },
          ],
        },
      ])
    ),
  });

  viewer.on("scenechange", (sceneId) => updateRoomPanel(sceneId));
  updateRoomPanel(rooms[0].id);
  positionMobileArrow();
}

function walk(direction) {
  const nextStep = sceneLinks[currentRoom.id]?.[direction];
  if (!nextStep) {
    return;
  }

  viewer.loadScene(nextStep.target, null, nextStep.targetYaw);
}

function enableTemporaryPeek(event) {
  event?.preventDefault();
  event?.stopPropagation();
  floorNavZone.classList.add("peek-mode");
  floorArrowButton.classList.add("is-peeking");
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => {
    floorNavZone.classList.remove("peek-mode");
    floorArrowButton.classList.remove("is-peeking");
  }, 1600);
}

function handleArrowClick(direction) {
  clearTimeout(walkClickTimer);
  walkClickTimer = setTimeout(() => walk(activeFloorDirection), 220);
}

function handleArrowDoubleClick(event) {
  clearTimeout(walkClickTimer);
  enableTemporaryPeek(event);
}

function setActiveFloorDirection(direction, keepPosition = false) {
  const links = sceneLinks[currentRoom.id] || {};
  let resolvedDirection = direction;
  let nextStep = links[resolvedDirection];

  if (!nextStep && isTouchViewport) {
    resolvedDirection = links.forward ? "forward" : "back";
    nextStep = links[resolvedDirection];
  }

  activeFloorDirection = resolvedDirection;
  floorArrowButton.disabled = !nextStep;
  floorArrowButton.title = nextStep ? nextStep.label : "Tidak ada jalur di arah ini";
  floorArrowButton.setAttribute("aria-label", nextStep?.label || "Tidak ada jalur di arah ini");
  floorArrowButton.classList.toggle("is-hidden", !nextStep);
  floorArrowButton.classList.toggle("is-back", resolvedDirection === "back");
  floorArrowButton.style.setProperty("--arrow-rotation", resolvedDirection === "back" ? "0deg" : "0deg");

  if (!keepPosition) {
    floorArrowButton.style.setProperty("--arrow-y", "46%");
  }
}

function moveFloorArrow(event) {
  if (isTouchViewport) {
    positionMobileArrow();
    updateActiveDirectionFromYaw();
    return;
  }

  const rect = viewerShell.getBoundingClientRect();
  const activeTop = rect.top + rect.height * 0.42;
  if (event.clientY < activeTop) {
    hideFloorArrow();
    return;
  }

  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - activeTop) / (rect.bottom - activeTop)) * 100;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const normalizedX = (event.clientX - centerX) / (rect.width / 2);
  const normalizedY = (event.clientY - centerY) / (rect.height / 2);
  const axisDistance = Math.min(1, Math.hypot(normalizedX, normalizedY));
  const arrowScale = 0.78 - axisDistance * 0.2;

  floorArrowButton.classList.add("is-visible");
  floorArrowButton.style.setProperty("--arrow-x", `${Math.min(Math.max(x, 15), 85)}%`);
  floorArrowButton.style.setProperty("--arrow-y", `${Math.min(Math.max(y, 22), 68)}%`);
  floorArrowButton.style.setProperty("--arrow-scale", arrowScale.toFixed(2));
  updateActiveDirectionFromYaw();
}

function hideFloorArrow() {
  floorArrowButton.classList.add("is-hidden");
  floorArrowButton.classList.remove("is-visible");
}

function normalizeYaw(yaw) {
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

function updateActiveDirectionFromYaw() {
  const yaw = normalizeYaw(viewer?.getYaw?.() || 0);
  const direction = Math.abs(yaw) > 100 ? "back" : "forward";
  setActiveFloorDirection(direction, true);
}

function openArchive(roomId) {
  const room = rooms.find((item) => item.id === roomId);
  currentRoom = room;
  clearTimeout(quizTimer);

  archiveModalContent.innerHTML = `
    <p class="eyebrow">${room.title}</p>
    <h2>${room.archive.title}</h2>
    <div class="archive-meta">
      <div class="archive-thumb">ARSIP</div>
      <div>
        <strong>${room.archive.type}</strong>
        <p>${room.archive.body}</p>
      </div>
    </div>
    <p>Di versi produksi, area ini dapat berisi galeri foto lama, dokumen hasil pindai, peta lama, audio narasi, atau tautan sumber.</p>
  `;

  archiveModal.showModal();
}

function closeArchiveAndScheduleQuiz() {
  archiveModal.close();
  clearTimeout(quizTimer);
  quizTimer = setTimeout(() => openQuiz(currentRoom.id), 650);
}

function openQuiz(roomId) {
  const room = rooms.find((item) => item.id === roomId);

  quizAnswered = false;

  quizContent.innerHTML = `
    <button id="quizCloseButton" class="quiz-close-button" type="button" aria-label="Tutup kuis" disabled>×</button>
    <p class="eyebrow">Kuis Misi</p>
    <h2>${room.title}</h2>
    <p>${room.quiz.question}</p>
    <div class="quiz-options">
      ${room.quiz.options
        .map((option, index) => `<button type="button" data-index="${index}">${option}</button>`)
        .join("")}
    </div>
    <p id="quizFeedback" class="quiz-feedback" aria-live="polite"></p>
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
    saveBadge(room.id);
    selectedButton.classList.add("is-correct");
    options.forEach((button) => (button.disabled = true));
    feedback.className = "quiz-feedback is-success";
    feedback.textContent = `Benar. Badge "${room.badge}" berhasil dikumpulkan. Kamu bisa menutup kuis.`;
    quizContent.querySelector("#quizCloseButton").disabled = false;
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
  const percent = Math.round((badges.length / rooms.length) * 100);
  document.querySelector("#heroProgress").textContent = `${badges.length}/${rooms.length} badge`;
  const heroProgressBar = document.querySelector("#heroProgressBar");
  heroProgressBar.dataset.level = String(badges.length);
  heroProgressBar.style.width = `${percent}%`;
  document.querySelector("#profileBadgeCount").textContent = badges.length;
  document.querySelector(".reward-panel").classList.toggle("is-unlocked", badges.length === rooms.length);
  document.querySelector("#rewardText").textContent =
    badges.length === rooms.length
      ? "Selamat. Sertifikat digital prototipe terbuka karena semua badge sudah terkumpul."
      : "Kumpulkan semua badge untuk membuka sertifikat digital.";

  document.querySelector("#badgeGrid").innerHTML = rooms
    .map((room) => {
      const earned = badges.includes(room.id);
      return `
        <article class="badge-card ${earned ? "earned" : ""}">
          <div class="badge-visual ${earned ? "is-earned" : "is-locked"}">
            <img class="badge-art" src="${room.badgeImage}" alt="${room.badge}, ${room.title}" />
            ${earned ? "" : '<span class="badge-icon" aria-label="Badge terkunci"></span>'}
          </div>
          <strong>${room.badge}</strong>
          <small>${earned ? "Sudah didapat" : "Jawab kuis untuk membuka"}</small>
        </article>
      `;
    })
    .join("");
}

function showExploration(targetId, updateHistory = true) {
  const validViews = ["malangsari", "tour", "archive", "profile"];
  const routeKey = validViews.includes(targetId) ? targetId : "malangsari";
  const pageKey = routeKey === "archive" ? "archive" : routeKey === "profile" ? "profile" : "malangsari";
  const visibleSections = pageKey === "malangsari" ? ["malangsari", "tour"] : [pageKey];

  pageSections.forEach((section) => {
    section.hidden = !visibleSections.includes(section.id);
  });

  homeScreen.hidden = true;
  aboutPage.hidden = true;
  explorationContent.hidden = false;
  explorationContent.dataset.view = routeKey;
  document.body.classList.remove("home-locked");
  document.body.classList.add("exploration-active");
  document.querySelector("#missionSite").textContent =
    routeKey === "tour" ? "Kendenglembu · Banyuwangi, Jawa Timur" : "Malangsari · Banyuwangi, Jawa Timur";
  document.querySelectorAll("[data-explore-route]").forEach((link) => {
    const isActive = link.dataset.exploreRoute === routeKey;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  window.scrollTo(0, 0);

  if (pageKey === "malangsari") {
    requestAnimationFrame(() => {
      if (!tourCreated) {
        createTour();
        tourCreated = true;
      } else {
        viewer.resize();
      }
    });
  }

  if (updateHistory) {
    history.pushState({ view: "exploration", targetId: routeKey }, "", `#${routeKey}`);
  }
}

function transitionTo(renderPage) {
  document.body.classList.add("page-is-exiting");
  window.setTimeout(() => {
    renderPage();
    requestAnimationFrame(() => document.body.classList.remove("page-is-exiting"));
  }, 190);
}

function showHome(updateHistory = true) {
  explorationContent.hidden = true;
  aboutPage.hidden = true;
  homeScreen.hidden = false;
  document.body.classList.add("home-locked");
  document.body.classList.remove("exploration-active");
  window.scrollTo(0, 0);

  if (updateHistory) {
    history.pushState({ view: "home" }, "", "#home");
  }
}

const homeSlides = [...document.querySelectorAll(".home-slide")];
const slideDots = [...document.querySelectorAll(".slide-dot")];
const slidePlace = document.querySelector("#slidePlace");
const slideLocation = document.querySelector("#slideLocation");
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
  updateSlideIndicator();
}

function updateSlideIndicator() {
  slideDots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeHomeSlide);
    dot.setAttribute("aria-label", `Gambar ${index + 1}${index === activeHomeSlide ? " aktif" : ""}`);
  });
}

function restartHomeSlideTimer() {
  clearInterval(homeSlideTimer);
  if (homeSlides.length > 1) {
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

function showAbout(updateHistory = true) {
  homeScreen.hidden = true;
  explorationContent.hidden = true;
  aboutPage.hidden = false;
  document.body.classList.remove("home-locked", "exploration-active");
  window.scrollTo(0, 0);

  if (updateHistory) {
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

document.querySelectorAll(".glass-menu a").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    transitionTo(() => showExploration(link.getAttribute("href").slice(1)));
  });
});

document.querySelectorAll("[data-explore-route]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    transitionTo(() => showExploration(link.dataset.exploreRoute));
  });
});

document.querySelector(".explore-home").addEventListener("click", (event) => {
  event.preventDefault();
  transitionTo(() => showHome());
});

document.querySelector(".lithera-logo").addEventListener("click", (event) => {
  event.preventDefault();
  transitionTo(() => showHome());
});

document.querySelector(".home-return-tag").addEventListener("click", (event) => {
  event.currentTarget.blur();
  transitionTo(() => showHome());
});

document.querySelector(".about-link").addEventListener("click", (event) => {
  event.preventDefault();
  transitionTo(() => showAbout());
});

document.querySelector(".about-back").addEventListener("click", (event) => {
  event.preventDefault();
  transitionTo(() => showHome());
});

window.addEventListener("popstate", () => {
  transitionTo(() => applyRoute(false));
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

document.querySelector("#openArchiveButton").addEventListener("click", () => openArchive(currentRoom.id));
document.querySelector("#closeArchiveButton").addEventListener("click", closeArchiveAndScheduleQuiz);
floorArrowButton.addEventListener("click", handleArrowClick);
floorArrowButton.addEventListener("dblclick", handleArrowDoubleClick);
viewerShell.addEventListener("pointermove", moveFloorArrow);
viewerShell.addEventListener("pointerleave", hideFloorArrow);
floorNavZone.addEventListener("dblclick", enableTemporaryPeek);
document.querySelector("#resetButton").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderProfile();
});

document.addEventListener("pointermove", (event) => {
  cursorGlow.style.setProperty("--cursor-x", `${event.clientX}px`);
  cursorGlow.style.setProperty("--cursor-y", `${event.clientY}px`);
  cursorGlow.classList.toggle("is-visible", !document.body.classList.contains("exploration-active"));

  const menuLinks = [...document.querySelectorAll(".glass-menu a")];
  let nearestLink = null;
  let nearestDistance = Infinity;

  menuLinks.forEach((link) => {
    const rect = link.getBoundingClientRect();
    const nearestX = Math.max(rect.left, Math.min(event.clientX, rect.right));
    const nearestY = Math.max(rect.top, Math.min(event.clientY, rect.bottom));
    const distance = Math.hypot(event.clientX - nearestX, event.clientY - nearestY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestLink = link;
    }
  });

  menuLinks.forEach((link) => link.classList.remove("is-near"));
  if (nearestLink && nearestDistance < 35) {
    nearestLink.classList.add("is-near");
  }
});

document.addEventListener("pointerover", (event) => {
  if (event.target.closest("a, button")) {
    cursorGlow.classList.add("is-hovering");
  }
});

document.addEventListener("pointerout", (event) => {
  if (event.target.closest("a, button") && !event.relatedTarget?.closest?.("a, button")) {
    cursorGlow.classList.remove("is-hovering");
  }
});

document.addEventListener("pointerleave", () => {
  cursorGlow.classList.remove("is-visible");
  document.querySelectorAll(".glass-menu a.is-near").forEach((link) => link.classList.remove("is-near"));
});

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const interactiveSurfaceSelector = ".mission-panel, .room-panel, .archive-card, .badge-card, .reward-panel";

  document.addEventListener("pointermove", (event) => {
    const surface = event.target.closest(interactiveSurfaceSelector);
    if (!surface) {
      return;
    }

    const rect = surface.getBoundingClientRect();
    surface.style.setProperty("--surface-x", `${event.clientX - rect.left}px`);
    surface.style.setProperty("--surface-y", `${event.clientY - rect.top}px`);
    surface.classList.add("is-surface-active");
  });

  document.addEventListener("pointerout", (event) => {
    const surface = event.target.closest(interactiveSurfaceSelector);
    if (surface && !surface.contains(event.relatedTarget)) {
      surface.classList.remove("is-surface-active");
    }
  });
}

archiveModal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeArchiveAndScheduleQuiz();
});

quizModal.addEventListener("cancel", (event) => {
  if (!quizAnswered) {
    event.preventDefault();
  }
});

renderArchiveGrid();
renderProfile();
