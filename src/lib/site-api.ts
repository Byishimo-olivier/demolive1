import { axiosInstance } from './axios';
import type { User } from '../types';

/** A photo in the public landing page's 3D gallery. */
export interface LandingImage {
  _id: string;
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

export const siteApi = {
  /** Public: no sign-in needed. */
  async listLandingImages(): Promise<LandingImage[]> {
    const res = await axiosInstance.get<ApiResponse<LandingImage[]>>('/site/landing-images');
    return res.data.data;
  },

  async addLandingImage(input: { image: File; label: string; alt?: string }): Promise<LandingImage> {
    const form = new FormData();
    form.append('image', input.image);
    form.append('label', input.label);
    if (input.alt) form.append('alt', input.alt);
    const res = await axiosInstance.post<ApiResponse<LandingImage>>('/site/landing-images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async updateLandingImage(id: string, patch: { label?: string; alt?: string }): Promise<LandingImage> {
    const res = await axiosInstance.patch<ApiResponse<LandingImage>>(`/site/landing-images/${id}`, patch);
    return res.data.data;
  },

  async reorderLandingImages(ids: string[]): Promise<LandingImage[]> {
    const res = await axiosInstance.put<ApiResponse<LandingImage[]>>('/site/landing-images/order', { ids });
    return res.data.data;
  },

  async removeLandingImage(id: string): Promise<void> {
    await axiosInstance.delete(`/site/landing-images/${id}`);
  },
};
