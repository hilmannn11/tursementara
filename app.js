const STORAGE_KEY = "bentengMissionBadges";

const rooms = [
  {
    id: "titik-1",
    title: "Titik 1",
    description: "Awal jalur virtual. Klik panah di lantai untuk berjalan maju ke titik berikutnya.",
    panorama: "./assets/panoramas/titik-1.png",
    badge: "Penjelajah Titik 1",
    archive: {
      title: "Arsip Titik 1",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik ini menjadi awal perjalanan virtual. Narasi arsip bisa diganti dengan penjelasan sejarah lokasi, fungsi ruang, atau cerita pengunjung.",
    },
    quiz: {
      question: "Apa fungsi titik pertama dalam tur virtual ini?",
      options: ["Awal jalur eksplorasi", "Halaman reward", "Tempat menghapus badge"],
      answer: 0,
    },
  },
  {
    id: "titik-2",
    title: "Titik 2",
    description: "Titik lanjutan. Arahkan pandangan ke jalur depan, lalu klik panah untuk maju lagi.",
    panorama: "./assets/panoramas/titik-2.png",
    badge: "Penjelajah Titik 2",
    archive: {
      title: "Arsip Titik 2",
      type: "Foto panorama dan catatan lokasi",
      body:
        "Titik kedua dapat memuat cerita lanjutan, foto pembanding, peta posisi, atau informasi bangunan di sekitar jalur.",
    },
    quiz: {
      question: "Bagaimana cara berpindah lokasi di tur ini?",
      options: ["Klik panah di dalam panorama", "Klik tombol daftar tempat", "Menutup browser"],
      answer: 0,
    },
  },
  {
    id: "titik-3",
    title: "Titik 3",
    description: "Titik akhir jalur contoh. Nanti titik ini bisa disambungkan lagi ke panorama berikutnya.",
    panorama: "./assets/panoramas/titik-3.png",
    badge: "Penjelajah Titik 3",
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
let quizTimer;
let walkClickTimer;

const archiveModal = document.querySelector("#archiveModal");
const quizModal = document.querySelector("#quizModal");
const archiveModalContent = document.querySelector("#archiveModalContent");
const quizContent = document.querySelector("#quizContent");
const viewerShell = document.querySelector(".viewer-shell");
const floorNavZone = document.querySelector("#floorNavZone");
const floorArrowButton = document.querySelector("#floorArrowButton");
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
  document.querySelector("#roomTitle").textContent = currentRoom.title;
  document.querySelector("#roomDescription").textContent = currentRoom.description;
  updateWalkButton();
}

function updateWalkButton() {
  updateActiveDirectionFromYaw();
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
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => {
    floorNavZone.classList.remove("peek-mode");
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
  const nextStep = links[direction];
  activeFloorDirection = direction;
  floorArrowButton.disabled = !nextStep;
  floorArrowButton.title = nextStep ? nextStep.label : "Tidak ada jalur di arah ini";
  floorArrowButton.setAttribute("aria-label", nextStep?.label || "Tidak ada jalur di arah ini");
  floorArrowButton.classList.toggle("is-hidden", !nextStep);
  floorArrowButton.style.setProperty("--arrow-rotation", direction === "back" ? "225deg" : "45deg");

  if (!keepPosition) {
    floorArrowButton.style.setProperty("--arrow-y", "46%");
  }
}

function moveFloorArrow(event) {
  const rect = viewerShell.getBoundingClientRect();
  const activeTop = rect.top + rect.height * 0.42;
  if (event.clientY < activeTop) {
    hideFloorArrow();
    return;
  }

  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - activeTop) / (rect.bottom - activeTop)) * 100;

  floorArrowButton.classList.add("is-visible");
  floorArrowButton.style.setProperty("--arrow-x", `${Math.min(Math.max(x, 15), 85)}%`);
  floorArrowButton.style.setProperty("--arrow-y", `${Math.min(Math.max(y, 22), 68)}%`);
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
  quizTimer = setTimeout(() => openQuiz(currentRoom.id), 3500);
}

function openQuiz(roomId) {
  const room = rooms.find((item) => item.id === roomId);
  const earned = getBadges().includes(room.id);

  if (earned) {
    return;
  }

  quizContent.innerHTML = `
    <p class="eyebrow">Kuis Misi</p>
    <h2>${room.title}</h2>
    <p>${room.quiz.question}</p>
    <div class="quiz-options">
      ${room.quiz.options
        .map((option, index) => `<button type="button" data-index="${index}">${option}</button>`)
        .join("")}
    </div>
    <p id="quizFeedback"></p>
  `;

  quizContent.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => checkAnswer(room, Number(button.dataset.index)));
  });

  quizModal.showModal();
}

function checkAnswer(room, selectedIndex) {
  const feedback = document.querySelector("#quizFeedback");
  if (selectedIndex === room.quiz.answer) {
    saveBadge(room.id);
    feedback.textContent = `Benar. Badge "${room.badge}" berhasil dikumpulkan.`;
    setTimeout(() => quizModal.close(), 1200);
  } else {
    feedback.textContent = "Belum tepat. Coba baca ulang arsipnya, lalu pilih jawaban yang paling sesuai.";
  }
}

function renderArchiveGrid() {
  const grid = document.querySelector("#archiveGrid");
  grid.innerHTML = rooms
    .map(
      (room) => `
        <article class="archive-card">
          <p class="eyebrow">${room.title}</p>
          <h3>${room.archive.title}</h3>
          <p>${room.archive.body}</p>
          <button class="button secondary" type="button" data-room="${room.id}">Buka Arsip</button>
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
  document.querySelector("#heroProgressBar").style.width = `${percent}%`;
  document.querySelector("#rewardText").textContent =
    badges.length === rooms.length
      ? "Selamat. Sertifikat digital prototipe terbuka karena semua badge sudah terkumpul."
      : "Kumpulkan semua badge untuk membuka sertifikat digital.";

  document.querySelector("#badgeGrid").innerHTML = rooms
    .map((room) => {
      const earned = badges.includes(room.id);
      return `
        <article class="badge-card ${earned ? "earned" : ""}">
          <span class="badge-icon">${earned ? "✓" : "?"}</span>
          <strong>${room.badge}</strong>
          <small>${earned ? "Sudah didapat" : "Belum didapat"}</small>
        </article>
      `;
    })
    .join("");
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

archiveModal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeArchiveAndScheduleQuiz();
});

renderArchiveGrid();
renderProfile();
createTour();
