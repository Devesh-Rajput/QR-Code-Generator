// Element references
const bodyEl = document.body;
const imgBox = document.getElementById("imgBox");
const qrImage = document.getElementById("qrImage");
const qrText = document.getElementById("qrText");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const themeBtn = document.getElementById("themeBtn");
const badgeOptions = document.getElementById("badgeOptions");
const sizeLabel = document.getElementById("sizeLabel");
const canvas = document.getElementById("qrCanvas");
const ctx = canvas.getContext("2d");

let outputSize = 1000;
let qrSize = 760;
let badgeMode = "auto";

// Draw rounded rectangle
function roundRect(ctx, x, y, w, h, r) {
  const min = Math.min(w, h) / 2;
  if (r > min) r = min;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// QR API URL
function qrApiUrl(data, size = 1024) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

// Compose final QR on canvas
async function compose(dataUrl, overlayText, opts = { size: outputSize }) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = dataUrl;

  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej("Image load fail");
  });

  canvas.width = opts.size;
  canvas.height = opts.size;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = bodyEl.classList.contains("light") ? "#fff" : "#fbfdff";
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 36);
  ctx.fill();

  // Border
  ctx.lineWidth = 6;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--glass-border") || "rgba(0,0,0,0.04)";
  roundRect(ctx, 3, 3, canvas.width - 6, canvas.height - 6, 36);
  ctx.stroke();

  // QR
  const qrX = Math.round((canvas.width - qrSize) / 2);
  const qrY = Math.round((canvas.height - qrSize) / 2) - 24;
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  // Gloss
  ctx.save();
  const glossH = Math.round(qrSize * 0.08);
  const gloss = ctx.createLinearGradient(0, qrY, 0, qrY + glossH);
  gloss.addColorStop(0, "rgba(255,255,255,0.35)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  roundRect(ctx, qrX + 8, qrY + 8, qrSize - 16, glossH, 8);
  ctx.fill();
  ctx.restore();

  // Badge
  if (overlayText) {
    const badgeSize = Math.round(qrSize * 0.14);
    const bx = Math.round(canvas.width / 2 - badgeSize / 2);
    const by = Math.round(canvas.height / 2 - badgeSize / 2) - 24;

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(2,6,23,0.18)";
    ctx.shadowBlur = 10;
    ctx.arc(bx + badgeSize / 2, by + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#111827";
    ctx.font = `${Math.round(badgeSize * 0.5)}px Poppins`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(overlayText, bx + badgeSize / 2, by + badgeSize / 2 + 1);
  }

  return canvas.toDataURL("image/png");
}

// Ensure preview fits viewport
function clampPreviewToViewport() {
  const vh = window.innerHeight || 600;
  const cap = Math.min(540, Math.round(vh * 0.55));

  if (imgBox.classList.contains("show-img")) {
    imgBox.style.maxHeight = cap + "px";
  } else {
    imgBox.style.maxHeight = null;
  }
}

// Dynamic export sizing
function computeExportSizes() {
  let out = 1000;
  let qrs = 760;

  const minDim = Math.min(window.innerWidth, window.innerHeight);

  if (minDim <= 480) {
    const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    out = Math.min(900, Math.round(minDim * 2 * scale));
    qrs = Math.round(out * 0.76);
  }

  return { output: out, qr: qrs };
}

// Main generate handler
async function generate() {
  const value = qrText.value.trim();
  if (!value) {
    qrText.classList.add("error");
    setTimeout(() => qrText.classList.remove("error"), 700);
    imgBox.classList.remove("show-img");
    downloadBtn.setAttribute("aria-disabled", "true");
    downloadBtn.href = "#";
    return;
  }

  const sizes = computeExportSizes();
  outputSize = sizes.output;
  qrSize = sizes.qr;

  imgBox.classList.remove("show-img");
  downloadBtn.setAttribute("aria-disabled", "true");
  downloadBtn.removeAttribute("download");

  const apiSize = Math.max(1024, Math.min(2000, Math.round(outputSize * 1.5)));
  const apiUrl = qrApiUrl(value, apiSize);

  let overlayText = "";

  if (badgeMode === "auto") {
    try {
      const urlParsed = new URL(value);
      overlayText = (urlParsed.hostname.split(".")[0] || value).slice(0, 2).toUpperCase();
    } catch {
      overlayText = value.slice(0, 2).toUpperCase();
    }
  } else if (badgeMode === "text") {
    overlayText = value.slice(0, 2).toUpperCase();
  }

  try {
    const styledData = await compose(apiUrl, overlayText, { size: outputSize });

    qrImage.src = styledData;
    imgBox.classList.add("show-img");
    imgBox.setAttribute("aria-hidden", "false");

    clampPreviewToViewport();

    downloadBtn.href = styledData;
    downloadBtn.setAttribute("download", "qr-code.png");
    downloadBtn.setAttribute("aria-disabled", "false");

    sizeLabel.textContent = `Preview: 360×360 — Export ${outputSize}×${outputSize}`;

    const card = document.querySelector(".card");
    card.classList.add("jiggle");
    setTimeout(() => card.classList.remove("jiggle"), 420);
  } catch (err) {
    console.error(err);
    alert("Failed to generate QR. Please check your network and try again.");
  }
}

// Theme init (fixed IIFE)
(function () {
  const saved = localStorage.getItem("qr_theme");

  if (saved === "light") bodyEl.classList.add("light");
  else if (saved === "dark") bodyEl.classList.remove("light");
  else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    bodyEl.classList.add("light");
  }

  const updateIcon = () => {
    const isLight = bodyEl.classList.contains("light");
    themeBtn.setAttribute("aria-pressed", isLight);
    themeBtn.textContent = isLight ? "🌞" : "🌙";
  };

  updateIcon();

  themeBtn.addEventListener("click", () => {
    const isNowLight = bodyEl.classList.toggle("light");
    localStorage.setItem("qr_theme", isNowLight ? "light" : "dark");
    updateIcon();
  });
})();

// Badge selection
badgeOptions.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  [...badgeOptions.children].forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  badgeMode = chip.dataset.val;
});

// Primary event listeners
generateBtn.addEventListener("click", generate);
qrText.addEventListener("keyup", (e) => {
  if (e.key === "Enter") generate();
});

// Responsive preview clamp
window.addEventListener("resize", clampPreviewToViewport);
window.addEventListener("orientationchange", () => setTimeout(clampPreviewToViewport, 200));
window.addEventListener("load", clampPreviewToViewport);

// Initial download state
downloadBtn.setAttribute("aria-disabled", "true");
downloadBtn.href = "#";
