import type { CarouselItem } from './ImageCarousel3D';
import type { LandingImage } from '@/lib/site-api';

const IMG = '/images/landing';

/** Built-in business photos, used when admins haven't uploaded enough of their own. */
export const DEFAULT_LANDING_GALLERY: CarouselItem[] = [
  { src: `${IMG}/construction-site.webp`, alt: 'Workers on a construction site seen from above', label: 'Site progress' },
  { src: `${IMG}/team-collab.webp`, alt: 'A team working together on laptops', label: 'Team collaboration' },
  { src: `${IMG}/analytics.webp`, alt: 'Analytics charts on a tablet', label: 'Live analytics' },
  { src: `${IMG}/handshake.webp`, alt: 'Two business partners shaking hands', label: 'Contracts & deals' },
  { src: `${IMG}/blueprints.webp`, alt: 'An architect drawing on blueprints', label: 'Planning' },
  { src: `${IMG}/skyline.webp`, alt: 'Glass office towers seen from below', label: 'Portfolio growth' },
  { src: `${IMG}/finance-docs.webp`, alt: 'Reviewing financial documents next to a laptop', label: 'Financial control' },
  { src: `${IMG}/meeting.webp`, alt: 'Colleagues celebrating with a high five in an office', label: 'Milestones hit' },
];

// Fewer cards than this and the ring looks empty
const MIN_RING = 6;

/** Uploaded photos first (in their order), topped up with built-in ones to fill the ring. */
export function landingGallery(uploaded: LandingImage[] | undefined): CarouselItem[] {
  const own: CarouselItem[] = (uploaded ?? []).filter((image) => image.section === 'gallery').map((image) => ({
    src: image.url,
    alt: image.alt || image.label,
    label: image.label,
  }));
  if (own.length === 0) return DEFAULT_LANDING_GALLERY;
  const fill = DEFAULT_LANDING_GALLERY.slice(0, Math.max(0, MIN_RING - own.length));
  return [...own, ...fill];
}
