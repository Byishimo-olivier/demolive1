import { useEffect, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { RotateCw } from 'lucide-react';

type FlipCardProps = {
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  quote: string;
  footnote: string;
};

/** A photo card that turns over in 3D (hover with a mouse, tap or Enter otherwise). */
export function FlipCard({ image, imageAlt, eyebrow, title, quote, footnote }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    setCanHover(query.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  };

  const face = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  } as const;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${title}: ${flipped ? 'hide' : 'show'} details`}
      onClick={() => !canHover && setFlipped((f) => !f)}
      onKeyDown={onKeyDown}
      onMouseEnter={() => canHover && setFlipped(true)}
      onMouseLeave={() => canHover && setFlipped(false)}
      className="group h-[400px] w-full cursor-pointer rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4"
      style={{ perspective: 1200 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 13 }}
      >
        {/* Front */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gray-200 shadow-elev-2" style={face}>
          <img
            src={image}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">{eyebrow}</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-white">{title}</h3>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/70">
              <RotateCw className="h-3.5 w-3.5" />
              {canHover ? 'Hover to learn more' : 'Tap to learn more'}
            </p>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-gray-900 p-8 text-white shadow-elev-2"
          style={{ ...face, transform: 'rotateY(180deg)' }}
        >
          <span className="font-heading text-6xl leading-none text-orange-500">“</span>
          <blockquote className="text-lg leading-relaxed text-gray-200">{quote}</blockquote>
          <div className="border-t border-white/10 pt-5">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-gray-400">{footnote}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
