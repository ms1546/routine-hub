import { AppLink } from './app-link';
import { cn } from '@/shared/utils';

type LogoProps = {
  /** ロゴをホームへのリンクにする */
  linkToHome?: boolean;
  /** サイズ: 通常は親のフォントサイズに連動。sm/md/lg で固定サイズも可 */
  size?: 'inherit' | 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  inherit: 'text-inherit',
  sm: 'text-2xl',
  md: 'text-3xl sm:text-4xl',
  lg: 'text-4xl sm:text-5xl',
};

export function Logo({ linkToHome, size = 'inherit', className }: LogoProps) {
  const content = (
    <span
      className={cn(
        'inline-flex items-end font-bold tracking-tight text-foreground',
        size !== 'inherit' && sizeClasses[size],
        className
      )}
    >
      {/* R の部分をアイコンに置換（下端をテキストと揃える） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon.png"
        alt=""
        width={28}
        height={28}
        className="mr-[0.02em] block h-[1.8em] w-auto shrink-0 self-end translate-y-[0.22em] rounded"
        aria-hidden
      />
      <span>outune Hub</span>
    </span>
  );

  if (linkToHome) {
    return (
      <AppLink href="/" className="inline-flex transition-opacity hover:opacity-90" aria-label="Routune Hub ホーム">
        {content}
      </AppLink>
    );
  }

  return content;
}
