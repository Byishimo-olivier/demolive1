import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { tile: 'h-7 w-7 rounded-lg', icon: 'h-3.5 w-3.5', text: 'text-base' },
  md: { tile: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4', text: 'text-lg' },
  lg: { tile: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5', text: 'text-xl' },
} as const;

interface BrandLogoProps {
  size?: keyof typeof SIZES;
  // On dark backgrounds the tile turns white and the wordmark turns white
  onDark?: boolean;
  className?: string;
}

/** InfraSoko logo (matches infrasoko.com): building icon tile + wordmark */
export function BrandLogo({ size = 'md', onDark = false, className }: BrandLogoProps) {
  const s = SIZES[size];
  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)} aria-label="InfraSoko">
      <span className={cn('flex items-center justify-center', s.tile, onDark ? 'bg-white' : 'bg-gray-900')}>
        <Building2 className={cn(s.icon, onDark ? 'text-gray-900' : 'text-white')} aria-hidden="true" />
      </span>
      <span className={cn('font-heading font-bold', s.text, onDark ? 'text-white' : 'text-gray-900')}>InfraSoko</span>
    </span>
  );
}
