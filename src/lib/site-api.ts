import { apiFileUrl, axiosInstance } from './axios';
import type { User } from '../types';

/** A photo of the public landing page: in the 3D gallery, or in one slot of another section */
export interface LandingImage {
  _id: string;
  section: 'gallery' | 'showcase' | 'features' | 'roles' | 'cta';
  // Place in the section (null for the gallery)
  slot: string | null;
  url: string;
  label: string;
  alt: string;
  order: number;
}

export const LANDING_IMAGE_LIMIT = 12;
export const LANDING_LABEL_MAX = 40;
export const LANDING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const LANDING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ApiResponse<T> = { success: boolean; message: string; data: T };

/** Platform admins (global role 'admin', not a company role) manage the public site. */
export const isPlatformAdmin = (user: User | null | undefined) => (user?.role as string | undefined) === 'admin';

// Company roles that may change the home page photos too (the server checks the same)
const SITE_EDITOR_ROLES = ['CompanyAdmin', 'ManagingDirector'];

/** Who sees Settings → Landing Page: platform admins, and the active company's admin or MD */
export const canManageLandingPage = (user: User | null | undefined, companyRole: string | null | undefined) =>
  isPlatformAdmin(user) || (!!companyRole && SITE_EDITOR_ROLES.includes(companyRole));

// The API answers with "/uploads/…": the photo lives on the API server, not this site
const withFileUrl = (image: LandingImage): LandingImage => ({ ...image, url: apiFileUrl(image.url) });

export const siteApi = {
  /** Public: no sign-in needed. */
  async listLandingImages(): Promise<LandingImage[]> {
    const res = await axiosInstance.get<ApiResponse<LandingImage[]>>('/site/landing-images');
    return res.data.data.map(withFileUrl);
  },

  /** Gallery photo (with a caption), or the photo of one slot of another section (replaces the old one) */
  async addLandingImage(input: { image: File; label?: string; alt?: string; section?: LandingImage['section']; slot?: string }): Promise<LandingImage> {
    const form = new FormData();
    form.append('image', input.image);
    if (input.section) form.append('section', input.section);
    if (input.slot) form.append('slot', input.slot);
    if (input.label) form.append('label', input.label);
    if (input.alt) form.append('alt', input.alt);
    const res = await axiosInstance.post<ApiResponse<LandingImage>>('/site/landing-images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return withFileUrl(res.data.data);
  },

  async updateLandingImage(id: string, patch: { label?: string; alt?: string }): Promise<LandingImage> {
    const res = await axiosInstance.patch<ApiResponse<LandingImage>>(`/site/landing-images/${id}`, patch);
    return withFileUrl(res.data.data);
  },

  async reorderLandingImages(ids: string[]): Promise<LandingImage[]> {
    const res = await axiosInstance.put<ApiResponse<LandingImage[]>>('/site/landing-images/order', { ids });
    return res.data.data.map(withFileUrl);
  },

  async removeLandingImage(id: string): Promise<void> {
    await axiosInstance.delete(`/site/landing-images/${id}`);
  },
};
