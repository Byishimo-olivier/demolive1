import { useEffect, useRef, useState } from 'react';
import { Eraser, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  // PNG data URL of the signature, or '' when empty
  onChange: (dataUrl: string) => void;
  height?: number;
}

const MAX_UPLOAD_BYTES = 250 * 1024;
// The server accepts signature images up to 400,000 characters
const MAX_DATA_URL = 380_000;

// PNG keeps a transparent background; very large images fall back to JPEG on white
const exportImage = (canvas: HTMLCanvasElement): string => {
  const png = canvas.toDataURL('image/png');
  if (png.length <= MAX_DATA_URL) return png;
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext('2d');
  if (!ctx) return png;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);
  for (const quality of [0.85, 0.7, 0.5]) {
    const jpeg = flat.toDataURL('image/jpeg', quality);
    if (jpeg.length <= MAX_DATA_URL) return jpeg;
  }
  return flat.toDataURL('image/jpeg', 0.4);
};

/** Draw a signature with mouse, finger or pen, or upload an image of one */
export function SignaturePad({ onChange, height = 160 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  // A ref, not state: the pointer handlers must see ink drawn in the same gesture
  const hasInk = useRef(false);
  const [empty, setEmpty] = useState(true);

  // Match the canvas resolution to its displayed size (sharp lines on high-DPI screens)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, [height]);

  // Pointer position in the canvas's drawing units, even if its displayed size changed
  // since it was set up (e.g. while the dialog was animating open)
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    return {
      x: ((e.clientX - rect.left) / rect.width) * (canvas.width / ratio),
      y: ((e.clientY - rect.top) / rect.height) * (canvas.height / ratio),
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const next = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last.current = next;
    if (!hasInk.current) {
      hasInk.current = true;
      setEmpty(false);
    }
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (hasInk.current && canvasRef.current) onChange(exportImage(canvasRef.current));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    hasInk.current = false;
    setEmpty(true);
    onChange('');
  };

  // A scanned or photographed signature, drawn onto the pad so it is sent as PNG
  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      toast.error('Please choose a PNG or JPEG image');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('The image is too large (max 250 KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        clear();
        const width = canvas.width / (window.devicePixelRatio || 1);
        const scale = Math.min(width / img.width, height / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
        hasInk.current = true;
        setEmpty(false);
        onChange(exportImage(canvas));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          style={{ height, touchAction: 'none' }}
          className="block w-full cursor-crosshair rounded-lg"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          aria-label="Signature pad"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Sign here
          </span>
        )}
        <span className="pointer-events-none absolute bottom-6 left-6 right-6 border-b border-gray-300" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900">
          <Upload className="h-3.5 w-3.5" />
          Upload an image of your signature (PNG/JPEG, max 250 KB)
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              // Allow choosing the same file again
              e.target.value = '';
            }}
          />
        </label>
        <Button type="button" variant="ghost" size="sm" className="h-7" onClick={clear} disabled={empty}>
          <Eraser className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
