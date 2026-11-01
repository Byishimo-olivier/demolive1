import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File URL utilities (server-based storage)
export function getFileUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const baseUrl = import.meta.env.VITE_BASE_URL;
  // Older records store the server's file path, which uses backslashes on Windows
  const filename = path.split(/[\\/]/).pop() || path;
  return `${baseUrl}/api/v1/upload/download/${filename}`;
}

export function getDownloadUrl(path: string): string {
  return getFileUrl(path);
}

// Cloudinary URL utilities
export function getOptimizedCloudinaryUrl(url: string, width: number = 800, quality: string = 'auto'): string {
  if (!url.includes('cloudinary.com')) return url;
  
  // Insert transformation parameters after /upload/
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_auto/`);
}

export function getDownloadCloudinaryUrl(url: string): string {
  if (!url.includes('cloudinary.com')) return url;
  
  // Add fl_attachment flag to force download
  return url.replace('/upload/', '/upload/fl_attachment/');
}

export function getFileTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toUpperCase();
  return extension || 'Unknown';
}

export function isImageFile(url: string): boolean {
  const extension = url.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(extension || '');
}

export function isPdfFile(url: string): boolean {
  const extension = url.split('.').pop()?.toLowerCase();
  return extension === 'pdf';
}

export function getFileIconType(url: string): 'image' | 'pdf' | 'document' | 'spreadsheet' | 'generic' {
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(extension || '')) {
    return 'image';
  } else if (extension === 'pdf') {
    return 'pdf';
  } else if (['doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
    return 'document';
  } else if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
    return 'spreadsheet';
  } else {
    return 'generic';
  }
}

/*
  This function is used to humanize a label.
  It converts an enum value to a human readable format.
  It is used to display an enum value in a human readable format.
*/
export const humanizeLabel = (label: string | undefined, camelCase = false): string => {
  if (!label) {
    return ""
  }

  const transformed = camelCase
    ? label.replace(/([A-Z])/g, " $1")
    : label.replace(/_/g, " ").toLowerCase()

  return transformed.replace(/\b\w/g, (c) => c.toUpperCase())
}

export type CurrencyCode = 'RWF' | 'USD';

export const DEFAULT_CURRENCY: CurrencyCode = 'RWF';

export const formatCurrency = (amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string => {
  const locale = currency === 'RWF' ? 'en-RW' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
};

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: 'RWF', label: 'Rwandan Franc (RWF)', symbol: 'RWF' },
  { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
];

export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Date(date).toLocaleDateString('en-US', options || defaultOptions);
};
