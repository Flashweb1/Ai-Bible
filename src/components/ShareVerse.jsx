/**
 * ShareVerse — generates a branded verse image and shares via Web Share API.
 * Falls back to copying text if Web Share is unavailable.
 *
 * Usage:
 *   import { shareVerse } from '../components/ShareVerse.jsx';
 *   shareVerse({ text, ref, translation });
 */

const BRAND = 'Scripturai';
const CARD_W = 1080;
const CARD_H = 1080;

/**
 * Wrap text to fit within maxWidth on a canvas context.
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const totalH = lines.length * lineHeight;
  const startY = y - totalH / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  return lines.length;
}

/**
 * Draw a verse share card onto a canvas and return a Blob.
 * Uses CSS variable colours where possible; falls back to hardcoded values.
 */
async function drawCard(text, ref, translation = 'KJV') {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  // ── Background ──────────────────────────────────────────────
  const root = document.documentElement;
  const getVar = (name, fallback) =>
    getComputedStyle(root).getPropertyValue(name).trim() || fallback;

  const bg = getVar('--bg2', '#FFFFFF');
  const accentColor = getVar('--accent', '#6B2737');
  const goldColor = getVar('--gold', '#9A7B3A');
  const txtColor = getVar('--txt', '#1A1410');
  const mutedColor = getVar('--muted', '#8A7D72');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Top accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, CARD_W, 12);

  // Bottom accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, CARD_H - 12, CARD_W, 12);

  // Decorative gold lines
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(80, 60); ctx.lineTo(CARD_W - 80, 60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(80, CARD_H - 60); ctx.lineTo(CARD_W - 80, CARD_H - 60);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Brand name ───────────────────────────────────────────────
  ctx.fillStyle = accentColor;
  ctx.font = `700 38px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillText(BRAND.toUpperCase(), CARD_W / 2, 110);

  // Opening quote mark
  ctx.fillStyle = goldColor;
  ctx.globalAlpha = 0.18;
  ctx.font = `700 340px Georgia, serif`;
  ctx.fillText('\u201C', 60, 460);
  ctx.globalAlpha = 1;

  // ── Verse text ───────────────────────────────────────────────
  ctx.fillStyle = txtColor;
  ctx.font = `italic 52px "EB Garamond", Georgia, serif`;
  ctx.textAlign = 'center';
  wrapText(ctx, `\u201C${text}\u201D`, CARD_W / 2, CARD_H / 2, CARD_W - 200, 78);

  // ── Reference ────────────────────────────────────────────────
  ctx.fillStyle = goldColor;
  ctx.font = `700 36px "Outfit", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`— ${ref}`, CARD_W / 2, CARD_H - 180);

  // Translation label
  ctx.fillStyle = mutedColor;
  ctx.font = `500 26px "Outfit", sans-serif`;
  ctx.globalAlpha = 0.65;
  ctx.fillText(translation.toUpperCase(), CARD_W / 2, CARD_H - 130);
  ctx.globalAlpha = 1;

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Share a verse using Web Share API with image, or fallback to text copy.
 * @param {{ text: string, ref: string, translation?: string }} opts
 * @param {Function} [onToast] - optional callback(msg) for user feedback
 */
export async function shareVerse({ text, ref, translation = 'KJV' }, onToast) {
  const shareText = `"${text}"\n— ${ref} (${translation})\n\nShared via ${BRAND}`;

  // Try Web Share API with image
  if (navigator.share) {
    try {
      const blob = await drawCard(text, ref, translation);
      const file = new File([blob], 'verse.png', { type: 'image/png' });

      // Check if the browser can share files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${ref} — ${BRAND}`,
          text: shareText,
          files: [file],
        });
        onToast?.('Shared!');
        return;
      }

      // Share without image
      await navigator.share({ title: `${ref} — ${BRAND}`, text: shareText });
      onToast?.('Shared!');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // user dismissed — silent
    }
  }

  // Fallback: copy to clipboard and offer download
  try {
    await navigator.clipboard.writeText(shareText);
    onToast?.('Verse copied to clipboard!');
  } catch {
    // Last resort: download the image
    try {
      const blob = await drawCard(text, ref, translation);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ref.replace(/[^a-z0-9]/gi, '_')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      onToast?.('Image downloaded!');
    } catch {
      onToast?.('Could not share verse.');
    }
  }
}

export default shareVerse;
