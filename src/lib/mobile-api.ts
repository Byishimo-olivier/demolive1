import { axiosInstance } from './axios';

/** Mobile app administration: QR codes that let phones join the company, and signed-in phones */

type ApiResponse<T> = { success: boolean; message: string; data: T };

export type MobileStatus =
  | { configured: false }
  | { configured: true; companyName: string; apiUrl: string; configVersion: number; issuedAt: string };

export interface MobileActivation {
  _id: string;
  label: string;
  status: 'active' | 'expired' | 'revoked';
  expiresAt: string;
  revokedAt: string | null;
  uses: number;
  lastUsedAt: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface MobileDevice {
  _id: string;
  user: { id: string; fullName: string; email: string } | null;
  deviceName: string | null;
  platform: string | null;
  lastUsedAt: string;
  createdAt: string;
}

export const QR_VALID_DAYS = [1, 7, 30, 90, 365] as const;

export const mobileApi = {
  async status(): Promise<MobileStatus> {
    return (await axiosInstance.get<ApiResponse<MobileStatus>>('/mobile/admin/status')).data.data;
  },
  async listActivations(): Promise<MobileActivation[]> {
    return (await axiosInstance.get<ApiResponse<MobileActivation[]>>('/mobile/admin/activations')).data.data;
  },
  /** The QR payload is returned only here, once */
  async createActivation(input: { label: string; validDays: number }) {
    const res = await axiosInstance.post<ApiResponse<{ activation: MobileActivation; qrPayload: string }>>('/mobile/admin/activations', input);
    return res.data.data;
  },
  async revokeActivation(id: string) {
    return (await axiosInstance.delete<ApiResponse<MobileActivation>>(`/mobile/admin/activations/${id}`)).data.data;
  },
  async listDevices(): Promise<MobileDevice[]> {
    return (await axiosInstance.get<ApiResponse<MobileDevice[]>>('/mobile/admin/sessions')).data.data;
  },
  async signOutDevice(id: string) {
    await axiosInstance.delete(`/mobile/admin/sessions/${id}`);
  },
};
