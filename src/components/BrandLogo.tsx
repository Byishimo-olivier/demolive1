import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
} as const;

interface BrandLogoProps {
  size?: keyof typeof SIZES;
  // On dark backgrounds the logo sits on a white tile
  onDark?: boolean;
  className?: string;
}

/** TBED Civil Engineering company logo */
export function BrandLogo({ size = 'md', onDark = false, className }: BrandLogoProps) {
  const img = <img src="/tbed-logo.png" alt="TBED Civil Engineering company Ltd" className={cn(SIZES[size], 'w-auto select-none')} draggable={false} />;
  if (!onDark) return <span className={cn('inline-flex items-center', className)}>{img}</span>;
  return <span className={cn('inline-flex items-center rounded-lg bg-white px-2 py-1 shadow-sm', className)}>{img}</span>;
}
