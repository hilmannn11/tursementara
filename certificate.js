const certificateModal = document.querySelector("#certificateModal");
const certificateCanvas = document.querySelector("#certificateCanvas");
const certificateContext = certificateCanvas.getContext("2d");
const certificateName = document.querySelector("#certificateName");
const certificateStatus = document.querySelector("#certificateStatus");
let certificateBadgesPromise;
const certificateBadgePaths = [
  "./assets/badges/certificate-wanderer-bronze-relief.png",
  "./assets/badges/certificate-survivor-bronze-relief.png",
  "./assets/badges/certificate-thinker-bronze-relief.png",
];

function loadCertificateBadges() {
  certificateBadgesPromise ||= Promise.all(certificateBadgePaths.map((src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  })));
  return certificateBadgesPromise;
}

function getCertificateDate() {
  let saved = localStorage.getItem(CERTIFICATE_DATE_KEY);
  if (!saved || Number.isNaN(Date.parse(saved))) {
    // Existing completed collections did not record their completion date.
    saved = new Date().toISOString();
    localStorage.setItem(CERTIFICATE_DATE_KEY, saved);
  }
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(saved));
}

function drawFittedName(name) {
  let size = 78;
  do {
    certificateContext.font = `600 ${size}px Georgia, serif`;
    if (certificateContext.measureText(name).width <= 755) break;
    size -= 2;
  } while (size >= 40);
  certificateContext.fillText(name, 540, 735, 755);
}

async function renderCertificate() {
  const context = certificateContext;
  const name = certificateName.value.trim() || "Nama Penjelajah";
  const badges = await loadCertificateBadges();
  context.clearRect(0, 0, 1080, 1520);
  const background = context.createLinearGradient(0, 0, 1080, 1520);
  background.addColorStop(0, "#172d2a");
  background.addColorStop(1, "#071714");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1520);
  context.strokeStyle = "rgba(210, 177, 116, .32)";
  context.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    context.beginPath();
    context.ellipse(540, 1500, 320 + i * 90, 185 + i * 47, -.24, Math.PI, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = "#f1e8d6";
  context.fillRect(76, 72, 928, 1376);
  context.strokeStyle = "#ba985c";
  context.lineWidth = 3;
  context.strokeRect(102, 98, 876, 1324);
  context.strokeStyle = "#d6c8aa";
  context.lineWidth = 1;
  context.strokeRect(119, 115, 842, 1290);
  context.textAlign = "center";
  context.fillStyle = "#345b52";
  context.font = "700 38px Arial, sans-serif";
  context.fillText("L I T H E R A", 540, 230);
  context.fillStyle = "#af8750";
  context.fillRect(442, 265, 196, 3);
  context.font = "600 24px Arial, sans-serif";
  context.fillText("SERTIFIKAT PENYELESAIAN TUR VIRTUAL", 540, 330);
  context.fillStyle = "#183b34";
  context.font = "700 82px Georgia, serif";
  context.fillText("Penjelajah Jejak", 540, 455);
  context.fillText("Masa Lalu", 540, 550);
  context.fillStyle = "#8e6b40";
  context.font = "italic 29px Georgia, serif";
  context.fillText("diberikan kepada", 540, 635);
  context.fillStyle = "#183b34";
  drawFittedName(name);
  context.fillStyle = "#b79962";
  context.fillRect(240, 780, 600, 2);
  context.fillStyle = "#476058";
  context.font = "28px Arial, sans-serif";
  context.fillText("Tur virtual Kendenglembu", 540, 845);
  badges.forEach((image, index) => {
    const x = 214 + index * 326;
    context.drawImage(image, x - 107, 940, 214, 214);
    context.fillStyle = "#183b34";
    context.font = "600 23px Arial, sans-serif";
    context.fillText(badgeRooms[index].badge, x, 1192);
  });
  context.fillStyle = "#8e6b40";
  context.font = "22px Arial, sans-serif";
  context.fillText("TANGGAL PENYELESAIAN", 540, 1300);
  context.fillStyle = "#183b34";
  context.font = "600 31px Georgia, serif";
  context.fillText(getCertificateDate(), 540, 1350);
}

document.querySelector("#openCertificate").addEventListener("click", async () => {
  if (getBadges().length !== badgeRooms.length) return;
  certificateStatus.textContent = "";
  document.querySelector("#certificateDate").textContent = `Tanggal penyelesaian: ${getCertificateDate()}`;
  certificateModal.showModal();
  try { await renderCertificate(); }
  catch { certificateStatus.textContent = "Badge belum dapat dimuat. Coba buka sertifikat lagi."; }
});
document.querySelector("#closeCertificate").addEventListener("click", () => certificateModal.close());
certificateName.addEventListener("input", () => {
  renderCertificate().catch(() => { certificateStatus.textContent = "Pratinjau belum dapat dimuat."; });
});

function hasCertificateName() {
  if (certificateName.value.trim()) return true;
  certificateStatus.textContent = "Isi nama terlebih dahulu.";
  certificateName.focus();
  return false;
}

document.querySelector("#downloadCertificate").addEventListener("click", async () => {
  if (!hasCertificateName()) return;
  try {
    await renderCertificate();
    const link = document.createElement("a");
    link.href = certificateCanvas.toDataURL("image/png");
    link.download = "sertifikat-lithera.png";
    link.click();
    certificateStatus.textContent = "Sertifikat PNG berhasil disiapkan.";
  } catch { certificateStatus.textContent = "Sertifikat belum dapat diunduh. Coba lagi."; }
});

function makeCertificatePdf() {
  const jpeg = atob(certificateCanvas.toDataURL("image/jpeg", .94).split(",")[1]);
  const encoder = new TextEncoder();
  const parts = [];
  let length = 0;
  const offsets = [0];
  const append = (value) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (number, body) => {
    offsets[number] = length;
    append(`${number} 0 obj\n${body}\nendobj\n`);
  };
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 540 760] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
  offsets[4] = length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1080 /Height 1520 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  const imageBytes = Uint8Array.from(jpeg, (character) => character.charCodeAt(0));
  append(imageBytes);
  append("\nendstream\nendobj\n");
  const content = "q\n540 0 0 760 0 0 cm\n/Im0 Do\nQ\n";
  object(5, `<< /Length ${content.length} >>\nstream\n${content}endstream`);
  const xref = length;
  append("xref\n0 6\n0000000000 65535 f \n");
  for (let index = 1; index <= 5; index += 1) append(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: "application/pdf" });
}

document.querySelector("#printCertificate").addEventListener("click", async () => {
  if (!hasCertificateName()) return;
  try {
    await renderCertificate();
    const url = URL.createObjectURL(makeCertificatePdf());
    const link = document.createElement("a");
    link.href = url;
    link.download = "sertifikat-lithera.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    certificateStatus.textContent = "Sertifikat PDF berhasil disiapkan.";
  } catch {
    certificateStatus.textContent = "Sertifikat PDF belum dapat diunduh. Coba lagi.";
  }
});
