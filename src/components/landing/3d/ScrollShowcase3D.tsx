import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { CheckCircle2, TrendingDown } from 'lucide-react';

type Photo = { src: string; alt: string };

// Built-in photos, used until others are chosen in Settings → Landing Page
const DEFAULT_MAIN: Photo = { src: '/images/landing/laptop-charts.webp', alt: 'Project analytics dashboard on a laptop' };
const DEFAULT_SIDE: Photo = { src: '/images/landing/site-team.webp', alt: 'Site engineers inspecting a construction project' };

/**
 * A dashboard screenshot that starts tipped back in 3D and lifts upright as it
 * scrolls into view, with photo cards floating at different depths around it.
 */
export function ScrollShowcase3D({ main = DEFAULT_MAIN, side = DEFAULT_SIDE }: { main?: Photo; side?: Photo }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });

  // Where each value starts; with reduced motion everything starts at rest
  const from = (start: number, rest: number) => (reduceMotion ? rest : start);
  const rotateX = useTransform(scrollYProgress, [0, 1], [from(38, 0), 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [from(0.86, 1), 1]);
  const y = useTransform(scrollYProgress, [0, 1], [from(60, 0), 0]);
  // Nearer layers travel further: that's what reads as depth
  const nearY = useTransform(scrollYProgress, [0, 1], [from(160, 0), 0]);
  const farY = useTransform(scrollYProgress, [0, 1], [from(90, 0), 0]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [from(0, 1), 1]);

  return (
    <div ref={ref} className="relative mx-auto max-w-5xl" style={{ perspective: 1400 }}>
      <motion.div
        style={{ rotateX, scale, y, transformOrigin: 'center bottom' }}
        className="relative rounded-2xl border border-gray-200 bg-white p-2 shadow-elev-3"
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="ml-3 hidden rounded-md bg-gray-100 px-3 py-0.5 font-mono text-xs text-gray-500 sm:inline">
            app.infrasoko.com/dashboard
          </span>
        </div>
        <img
          src={main.src}
          alt={main.alt}
          loading="lazy"
          decoding="async"
          width={900}
          height={601}
          className="aspect-[16/9] w-full rounded-xl object-cover"
        />
      </motion.div>

      {/* Floating cards around the screen */}
      <motion.div
        style={{ y: nearY, opacity: fade }}
        className="absolute -left-4 top-[12%] hidden w-44 overflow-hidden rounded-xl border border-white bg-white shadow-elev-3 md:block lg:-left-16 lg:w-52"
      >
        <img
          src={side.src}
          alt={side.alt}
          loading="lazy"
          decoding="async"
          className="h-28 w-full object-cover lg:h-32"
        />
        <div className="flex items-center gap-2 p-3">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          <p className="text-xs font-medium text-gray-700">Site inspection passed</p>
        </div>
      </motion.div>

      <motion.div
        style={{ y: farY, opacity: fade }}
        className="absolute -right-4 bottom-[14%] hidden w-48 rounded-xl border border-gray-100 bg-white p-4 shadow-elev-3 md:block lg:-right-14 lg:w-56"
      >
        <p className="text-xs text-gray-500">Budget variance</p>
        <p className="mt-1 flex items-center gap-1.5 font-heading text-2xl font-bold text-gray-900">
          −4.2%
          <TrendingDown className="h-5 w-5 text-emerald-600" />
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-orange-500"
            initial={{ width: '0%' }}
            whileInView={{ width: '72%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">72% of budget used · on track</p>
      </motion.div>
    </div>
  );
}
