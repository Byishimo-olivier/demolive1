import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CarouselItem = { src: string; alt: string; label: string };

type Props = {
  items: CarouselItem[];
  className?: string;
  /** Degrees per second while spinning on its own */
  speed?: number;
};

/**
 * A ring of photos in 3D space that spins slowly, tilts toward the pointer,
 * and can be dragged. Pauses when off screen, on request, or for reduced motion.
 */
export function ImageCarousel3D({ items, className, speed = 12 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef);
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState(560);

  const rotation = useMotionValue(0);
  const tiltX = useSpring(-8, { stiffness: 60, damping: 16 });
  const tiltY = useSpring(0, { stiffness: 60, damping: 16 });
  const ringRotateY = useTransform(() => rotation.get() + tiltY.get());

  const hovering = useRef(false);
  const currentSpeed = useRef(1);
  const drag = useRef<{ x: number; start: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (reduceMotion || paused || !inView || drag.current) return;
    // Ease to a slower spin while the pointer is over the ring
    const target = hovering.current ? 0.3 : 1;
    currentSpeed.current += (target - currentSpeed.current) * 0.05;
    rotation.set(rotation.get() + (delta / 1000) * speed * currentSpeed.current);
  });

  const count = items.length;
  // Ring radius for a card width; more cards need a wider ring, so cards shrink to fit the box
  const SPACING = 1.18;
  const radiusFor = (w: number) => (w / (2 * Math.tan(Math.PI / Math.max(count, 3)))) * SPACING;
  const fitWidth = (width * 0.42 * 2 * Math.tan(Math.PI / Math.max(count, 3))) / SPACING;
  const cardWidth = Math.max(84, Math.min(210, width * 0.27, fitWidth));
  const cardHeight = cardWidth * 1.3;
  const radius = radiusFor(cardWidth);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current) {
      rotation.set(drag.current.start + (e.clientX - drag.current.x) * 0.35);
      return;
    }
    if (reduceMotion || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    tiltX.set(-8 - ny * 14);
    tiltY.set(nx * 24);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, start: rotation.get() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative select-none touch-pan-y', className)}
      style={{ height: cardHeight * 1.9, perspective: 1300 }}
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => {
        hovering.current = false;
        tiltX.set(-8);
        tiltY.set(0);
        endDrag();
      }}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Soft floor shadow */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-gray-900/15 blur-2xl"
        style={{ width: radius * 1.8, height: radius * 0.35, bottom: cardHeight * 0.08 }}
      />

      <motion.ul
        aria-label="Business photo gallery"
        className="absolute inset-0 m-0 list-none p-0 cursor-grab active:cursor-grabbing"
        style={{ transformStyle: 'preserve-3d', rotateX: tiltX, rotateY: ringRotateY }}
      >
        {items.map((item, i) => (
          <li
            key={item.src}
            className="absolute left-1/2 top-1/2"
            style={{
              width: cardWidth,
              height: cardHeight,
              marginLeft: -cardWidth / 2,
              marginTop: -cardHeight / 2,
              transform: `rotateY(${(i * 360) / count}deg) translateZ(${radius}px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Back face, seen through the far side of the ring */}
            <div
              aria-hidden
              className="absolute inset-0 overflow-hidden rounded-2xl bg-gray-900"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <img src={item.src} alt="" draggable={false} decoding="async" className="h-full w-full object-cover opacity-30 blur-[1px]" />
            </div>
            <figure
              className="relative m-0 h-full w-full overflow-hidden rounded-2xl border border-white/60 bg-gray-200 shadow-elev-3"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <img
                src={item.src}
                alt={item.alt}
                draggable={false}
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-gray-950/0 to-transparent" />
              <figcaption className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">
                {item.label}
              </figcaption>
            </figure>
          </li>
        ))}
      </motion.ul>

      {!reduceMotion && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur hover:text-gray-900"
          aria-label={paused ? 'Play gallery animation' : 'Pause gallery animation'}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? 'Play' : 'Pause'}
        </button>
      )}
    </div>
  );
}
