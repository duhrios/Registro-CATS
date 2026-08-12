import { initials } from '@/lib/format';
export function ProviderAvatar({ name, photo, size = 'md' }: { name: string; photo?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8 text-[10px]', md: 'h-11 w-11 text-xs', lg: 'h-20 w-20 text-xl' };
  return photo ? <img data-testid={`img-avatar-${name}`} src={photo} alt={`Retrato de ${name}`} className={`${sizes[size]} rounded-xl object-cover`} /> : <div data-testid={`avatar-${name}`} className={`${sizes[size]} grid place-items-center rounded-xl bg-secondary font-bold text-secondary-foreground`}>{initials(name)}</div>;
}