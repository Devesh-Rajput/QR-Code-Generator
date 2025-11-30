// 1. Element Selection & Configuration

// HTML Elements
const bodyEl = document.body;
const imgBox = document.getElementById('imgBox'); // Container for the QR image
const qrImage = document.getElementById('qrImage'); // The <img> tag for preview
const qrText = document.getElementById('qrText'); // Input field
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const themeBtn = document.getElementById('themeBtn');
const badgeOptions = document.getElementById('badgeOptions');
const sizeLabel = document.getElementById('sizeLabel');

// Canvas setup for high-res output composition
const canvas = document.getElementById('qrCanvas');
const ctx = canvas.getContext('2d');

// Application Settings
let outputSize = 1000; // Final resolution for the downloadable PNG (width and height)
let qrSize = 760; // Size of the QR code itself within the canvas
let badgeMode = 'auto'; // Current badge selection: 'auto', 'none', or 'text'

// 2. Helper Functions (Canvas & API)
/**
 * Custom function to draw a rounded rectangle on the canvas.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x - Top left x coordinate.
 * @param {number} y - Top left y coordinate.
 * @param {number} w - Width of the rectangle.
 * @param {number} h - Height of the rectangle.
 * @param {number} r - Radius for the corners.
 */
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

/**
 * Generates the API URL for fetching the base QR code image.
 * @param {string} data - The text or URL to encode.
 * @param {number} size - The desired resolution for the fetched QR image.
 * @returns {string} The complete QR code generation API URL.
 */
function qrApiUrl(data, size = 1024) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(data);
}

/**
 * Composes the final, styled QR code image using a canvas.
 * This includes the background, border, QR image, gloss, and optional badge.
 * @param {string} dataUrl - The URL of the raw QR code image from the API.
 * @param {string} overlayText - The text to display in the center badge (if any).
 * @param {object} opts - Options object, including the final size.
 * @returns {Promise<string>} A promise that resolves to the final styled image Data URL.
 */
async function compose(dataUrl, overlayText, opts = { size: outputSize }) {
  const img = new Image();
  img.crossOrigin = 'Anonymous'; // Required for canvas operations on cross-domain images
  img.src = dataUrl;

  // Wait for the base QR code image to load
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej('Image load fail') });

  // Set canvas dimensions
  canvas.width = opts.size;
  canvas.height = opts.size;

  // 1. Draw The Background Card
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Use a white background for light theme, or off-white for dark theme
  ctx.fillStyle = bodyEl.classList.contains('light') ? '#ffffff' : '#fbfdff';
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 36);
  ctx.fill();

  // 2. Draw Subtle Border
  ctx.lineWidth = 6;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--glass-border') || 'rgba(0,0,0,0.04)';
  roundRect(ctx, 3, 3, canvas.width - 6, canvas.height - 6, 36);
  ctx.stroke();

  // 3. Place The Base QR Code Image
  const qrX = Math.round((canvas.width - qrSize) / 2);
  const qrY = Math.round((canvas.height - qrSize) / 2) - 24; // Shift up slightly for visual balance
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  // 4. Draw Top Gloss Effect (subtle white highlight)
  ctx.save();
  const glossH = Math.round(qrSize * 0.08);
  const g = ctx.createLinearGradient(0, qrY, 0, qrY + glossH);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  roundRect(ctx, qrX + 8, qrY + 8, qrSize - 16, glossH, 8);
  ctx.fill();
  ctx.restore();

  // 5. Draw The Center Badge (if overlayText is provided)
  if (overlayText) {
    const badgeSize = Math.round(qrSize * 0.14);
    const bx = Math.round(canvas.width / 2 - badgeSize / 2);
    const by = Math.round(canvas.height / 2 - badgeSize / 2) - 24;
    
    // Draw white circle with shadow
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(2,6,23,0.18)';
    ctx.shadowBlur = 10;
    ctx.arc(bx + badgeSize / 2, by + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw text inside the badge
    ctx.fillStyle = '#111827';
    ctx.font = `${Math.round(badgeSize * 0.5)}px Poppins`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(overlayText, bx + badgeSize / 2, by + badgeSize / 2 + 1);
  }

  // Return the final image as a PNG Data URL
  return canvas.toDataURL('image/png');
}

// 3. Core Logic (Generate)
/**
 * Main function to handle QR code generation.
 */
async function generate() {
  const value = qrText.value.trim();

  // Input validation: check if the input is empty
  if (!value) {
    qrText.classList.add('error');
    setTimeout(() => qrText.classList.remove('error'), 700);
    // Hide preview and disable download if validation fails
    imgBox.classList.remove('show-img');
    downloadBtn.setAttribute('aria-disabled', 'true');
    downloadBtn.href = '#';
    return;
  }

  // Initial state reset before generation
  imgBox.classList.remove('show-img');
  downloadBtn.setAttribute('aria-disabled', 'true');
  downloadBtn.removeAttribute('download');

  // Request a high-res image from the QR API
  const apiSize = 1500;
  const apiUrl = qrApiUrl(value, apiSize);

  // Determine the text for the badge based on the selected mode
  let overlayText = '';
  if (badgeMode === 'auto') {
    try {
      // Try to get the first two letters of the hostname for a URL
      const urlp = new URL(value);
      overlayText = (urlp.hostname.split('.')[0] || value).slice(0, 2).toUpperCase();
    } catch (e) {
      // If not a valid URL, use the first two letters of the input text
      overlayText = value.slice(0, 2).toUpperCase();
    }
  } else if (badgeMode === 'text') {
    // Always use the first two letters of the input text
    overlayText = value.slice(0, 2).toUpperCase();
  }
  // If badgeMode is 'none', overlayText remains ''

  try {
    // Compose the final styled image on the canvas
    const styledData = await compose(apiUrl, overlayText, { size: outputSize });
    
    // Update the preview image source
    qrImage.src = styledData;
    
    // Show the preview box with animation
    imgBox.classList.add('show-img');
    imgBox.setAttribute('aria-hidden', 'false');
    
    // Enable the download button
    downloadBtn.href = styledData;
    downloadBtn.setAttribute('download', 'qr-code.png');
    downloadBtn.setAttribute('aria-disabled', 'false');
    
    // Update the size label for user information
    sizeLabel.textContent = `Preview: 360×360 — Export ${outputSize}×${outputSize}`;

    // Add a subtle "jiggle" animation to the card for user feedback
    document.querySelector('.card').classList.add('jiggle');
    setTimeout(() => document.querySelector('.card').classList.remove('jiggle'), 420);
    
  } catch (err) {
    console.error(err);
    alert('Failed to generate QR. Please check your network and try again.');
  }
}

// 4. Event Listeners & Initialization

// Theme Toggle IIFE (Immediately Invoked Function Expression)
(function () {
  /** Reads and applies saved theme preference or system preference on load. */
  const saved = localStorage.getItem('qr_theme');
  if (saved === 'light') bodyEl.classList.add('light');
  else if (saved === 'dark') bodyEl.classList.remove('light');
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) bodyEl.classList.add('light');

  /** Updates the button icon based on the current theme state. */
  const updateIcon = () => {
    const isLight = bodyEl.classList.contains('light');
    themeBtn.setAttribute('aria-pressed', isLight);
    themeBtn.textContent = isLight ? '🌞' : '🌙';
  };
  updateIcon();

  // Add click listener to toggle theme
  themeBtn.addEventListener('click', () => {
    const isNowLight = bodyEl.classList.toggle('light');
    localStorage.setItem('qr_theme', isNowLight ? 'light' : 'dark');
    updateIcon();
  });
})();

// Badge Selection Logic
badgeOptions.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;

  // Deactivate all chips, then activate the clicked one
  [...badgeOptions.children].forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  
  // Update the application's badge mode setting
  badgeMode = chip.dataset.val;
});

// Primary event listeners for generation
generateBtn.addEventListener('click', generate);
qrText.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') generate();
});

// Initial state setup for download button
downloadBtn.setAttribute('aria-disabled', 'true');
downloadBtn.href = '#';
