import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { cn } from '@/lib/utils';

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Largest tilt in degrees */
  max?: number;
};

/**
 * A card that tilts toward the mouse in 3D with a moving light glare.
 * Put <Depth z={…}> layers inside to make parts float above the card.
 */
export function TiltCard({ children, className, max = 9 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 160, damping: 18 });
  const rotateY = useSpring(0, { stiffness: 160, damping: 18 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useSpring(0, { stiffness: 120, damping: 20 });
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)`;

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    rotateY.set((nx - 0.5) * max * 2);
    rotateX.set(-(ny - 0.5) * max * 2);
    glareX.set(nx * 100);
    glareY.set(ny * 100);
    glareOpacity.set(1);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    glareOpacity.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn('relative', className)}
      style={{ rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: glare, opacity: glareOpacity, transform: 'translateZ(60px)' }}
      />
    </motion.div>
  );
}

/** A layer raised `z` pixels above its TiltCard. */
export function Depth({
  z,
  children,
  className,
  style,
}: {
  z: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={{ ...style, transform: `translateZ(${z}px)`, transformStyle: 'preserve-3d' }}>
      {children}
    </div>
  );
}
