import type { LandingImage } from './site-api';

/**
 * The landing page's photo places outside the 3D gallery. Each slot shows the uploaded photo,
 * or its built-in one. Section and slot keys match the server's (landingImage.model.ts).
 */

const IMG = '/images/landing';

export type LandingSectionKey = 'showcase' | 'features' | 'roles' | 'cta';

export interface LandingSlot {
  slot: string;
  label: string;
  // Built-in photo, shown until one is uploaded
  fallback: string;
  fallbackAlt: string;
  // Best shape for this place, as a hint when choosing a photo
  shape: 'wide' | 'square' | 'tall';
}

export interface LandingSectionInfo {
  section: LandingSectionKey;
  title: string;
  description: string;
  slots: LandingSlot[];
}

export const LANDING_SECTIONS: LandingSectionInfo[] = [
  {
    section: 'showcase',
    title: 'Product showcase',
    description: 'The big screen that tilts up as visitors scroll, and the small photo floating beside it.',
    slots: [
      { slot: 'main', label: 'Big screen', fallback: `${IMG}/laptop-charts.webp`, fallbackAlt: 'Project analytics dashboard on a laptop', shape: 'wide' },
      { slot: 'side', label: 'Floating photo', fallback: `${IMG}/site-team.webp`, fallbackAlt: 'Site engineers inspecting a construction project', shape: 'wide' },
    ],
  },
  {
    section: 'features',
    title: 'Feature cards',
    description: 'The photo at the top of each of the four feature cards.',
    slots: [
      { slot: 'project-management', label: 'Project Management', fallback: `${IMG}/construction-site.webp`, fallbackAlt: 'Construction workers on a building site', shape: 'wide' },
      { slot: 'financial-control', label: 'Financial Control', fallback: `${IMG}/finance-docs.webp`, fallbackAlt: 'Financial documents being reviewed beside a laptop', shape: 'wide' },
      { slot: 'document-hub', label: 'Document Hub', fallback: `${IMG}/engineer.webp`, fallbackAlt: 'An engineer marking up technical drawings', shape: 'wide' },
      { slot: 'team-collaboration', label: 'Team Collaboration', fallback: `${IMG}/team-collab.webp`, fallbackAlt: 'A team collaborating around a table with laptops', shape: 'wide' },
    ],
  },
  {
    section: 'roles',
    title: '"Designed for" flip cards',
    description: 'The photo on the front of each card that turns over.',
    slots: [
      { slot: 'operations', label: 'Built for Operations', fallback: `${IMG}/site-team.webp`, fallbackAlt: 'An operations team walking a construction site', shape: 'tall' },
      { slot: 'leadership', label: 'Built for Leadership', fallback: `${IMG}/executive.webp`, fallbackAlt: 'A business executive in a suit', shape: 'tall' },
      { slot: 'managers', label: 'Built for Managers', fallback: `${IMG}/presentation.webp`, fallbackAlt: 'A manager presenting to a team in an office', shape: 'tall' },
    ],
  },
  {
    section: 'cta',
    title: 'Final banner',
    description: 'The dark photo behind "Ready to transform your project delivery?".',
    slots: [{ slot: 'background', label: 'Banner background', fallback: `${IMG}/skyline.webp`, fallbackAlt: '', shape: 'wide' }],
  },
];

const slotInfo = (section: LandingSectionKey, slot: string) =>
  LANDING_SECTIONS.find((s) => s.section === section)?.slots.find((s) => s.slot === slot);

/** The uploaded photo for a slot, if there is one */
export const uploadedFor = (images: LandingImage[] | undefined, section: LandingSectionKey, slot: string) =>
  images?.find((image) => image.section === section && image.slot === slot);

/** What a slot shows: the uploaded photo, else the built-in one */
export function slotPhoto(images: LandingImage[] | undefined, section: LandingSectionKey, slot: string): { src: string; alt: string } {
  const uploaded = uploadedFor(images, section, slot);
  const info = slotInfo(section, slot);
  if (uploaded) return { src: uploaded.url, alt: uploaded.alt || info?.fallbackAlt || '' };
  return { src: info?.fallback ?? '', alt: info?.fallbackAlt ?? '' };
}
