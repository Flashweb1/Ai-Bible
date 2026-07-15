export async function generateVerseImage({ text, ref }) {
  const can = document.createElement('canvas');
  can.width = 600;
  can.height = 700;
  const ctx = can.getContext('2d');

  const bg = new Image();
  bg.crossOrigin = 'anonymous';
  bg.src = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#16213e"/></linearGradient></defs><rect width="600" height="700" fill="url(#g)"/><circle cx="50" cy="650" r="120" fill="rgba(212,175,55,.06)"/><circle cx="550" cy="50" r="100" fill="rgba(212,175,55,.04)"/></svg>`);

  await bg.decode();

  ctx.drawImage(bg, 0, 0);

  ctx.textAlign = 'center';

  ctx.font = '14px "Georgia", serif';
  ctx.fillStyle = 'rgba(212,175,55,.4)';
  ctx.fillText('✦', 300, 80);

  ctx.font = '28px "Georgia", serif, "Playfair Display"';
  ctx.fillStyle = '#F5E6C8';
  ctx.textBaseline = 'middle';

  const maxW = 480;
  const words = text.split(' ');
  let lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);

  const lh = 42;
  const startY = 280 - (lines.length * lh) / 2 + 20;

  ctx.font = '26px "Georgia", serif';
  lines.forEach((l, i) => {
    ctx.fillText(l, 300, startY + i * lh);
  });

  ctx.font = '16px "Georgia", serif';
  ctx.fillStyle = 'rgba(212,175,55,.8)';
  ctx.textBaseline = 'bottom';
  const refY = startY + lines.length * lh + 50;
  ctx.fillText(`— ${ref}`, 300, refY);

  ctx.font = '12px "Georgia", serif';
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.fillText('Scripturai', 300, 660);

  const blob = await new Promise(resolve => can.toBlob(resolve, 'image/png'));
  return new File([blob], 'verse.png', { type: 'image/png' });
}

export async function shareVerse({ text, ref }) {
  try {
    const file = await generateVerseImage({ text, ref });
    if (navigator.share) {
      await navigator.share({
        title: ref,
        text: `"${text}" — ${ref}`,
        files: [file]
      });
    } else {
      await navigator.clipboard.writeText(`"${text}" — ${ref}`);
    }
    return true;
  } catch {
    return false;
  }
}
