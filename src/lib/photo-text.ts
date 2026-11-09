/**
 * Free text recognition in the browser (Tesseract, open source): the photo is read on this
 * device and never uploaded. The engine (from the jsDelivr CDN) and the English model (served
 * from this site, public/tesseract) are downloaded once on first use, then cached by the browser.
 *
 * Printed lists and clear CAPITAL letters read well. Joined-up handwriting usually does not:
 * lines the reader is unsure of are left out and reported, never shown as made-up text.
 */

// Long enough side for small writing, short enough to read quickly on a phone
const TARGET_SIDE = 2000;
// Lines read with less confidence than this (0–100) are left out. Clear print scores 80–96;
// unreadable handwriting and paper texture score under 35.
const MIN_LINE_CONFIDENCE = 45;
// Ink is this much darker than the paper around it (25%)
const INK_CONTRAST = 0.25;

export interface PhotoText {
  // The lines read with confidence, one per line
  text: string;
  // Lines found but too unclear to trust
  unclearLines: number;
}

/**
 * Black ink on white, whatever the paper: shading, stains and texture are dropped by comparing
 * each spot with the paper around it (adaptive threshold), using the colour channel where ink
 * is darkest so blue and black pens both stand out.
 */
async function preparePhoto(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This photo cannot be opened here. Use a JPG or PNG photo (or a screenshot of it).'));
      el.src = url;
    });
    const scale = TARGET_SIDE / Math.max(img.naturalWidth, img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h);
    const data = pixels.data;

    // Darkest channel, lightly smoothed (3×3) so paper grain does not look like ink
    const ink = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) ink[p] = Math.min(data[i], data[i + 1], data[i + 2]);
    const smooth = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            sum += ink[yy * w + xx];
            n++;
          }
        }
        smooth[y * w + x] = sum / n;
      }
    }

    // Sum table, so the average of any square around a pixel is quick to get
    const stride = w + 1;
    const table = new Float64Array(stride * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += smooth[y * w + x];
        table[(y + 1) * stride + x + 1] = table[y * stride + x + 1] + row;
      }
    }
    const radius = Math.max(8, Math.round(Math.max(w, h) / 16));
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(h, y + radius + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - radius);
        const x1 = Math.min(w, x + radius + 1);
        const area = (x1 - x0) * (y1 - y0);
        const around = (table[y1 * stride + x1] - table[y0 * stride + x1] - table[y1 * stride + x0] + table[y0 * stride + x0]) / area;
        const value = smooth[y * w + x] < around * (1 - INK_CONTRAST) ? 0 : 255;
        const i = (y * w + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Read the text in a photo. `onProgress` gets 0–1 while reading (the first time, loading the
 * reader itself takes a few seconds more).
 */
export async function readTextFromPhoto(file: File, onProgress?: (progress: number, stage: string) => void): Promise<PhotoText> {
  const canvas = await preparePhoto(file);
  onProgress?.(0, 'Preparing the reader…');
  // Loaded only when someone reads a photo, so the rest of the app stays light
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, {
    // English model served by this site (from the @tesseract.js-data/eng package), not a third-party host
    langPath: '/tesseract',
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress?.(message.progress, 'Reading the list…');
      else if (message.status.startsWith('loading')) onProgress?.(0, 'Preparing the reader (first time only)…');
    },
  });
  try {
    // Keep the spaces between columns (name … phone) so lines stay together
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(canvas);
    const lines = data.lines.map((line) => ({ text: line.text.trim(), confidence: line.confidence })).filter((line) => line.text);
    const clear = lines.filter((line) => line.confidence >= MIN_LINE_CONFIDENCE);
    return { text: clear.map((line) => line.text).join('\n'), unclearLines: lines.length - clear.length };
  } catch (error) {
    throw error instanceof Error ? error : new Error('The photo could not be read');
  } finally {
    await worker.terminate();
  }
}
