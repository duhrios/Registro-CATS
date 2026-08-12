import { Bell, Clock3, LayoutDashboard, LogOut, Plus, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useSupabase } from '@/lib/supabase-context';

const navItems = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/historico', label: 'Histórico de visitas', icon: Clock3 },
  { href: '/prestadores', label: 'Prestadores', icon: UsersRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const supabase = useSupabase();
  return (
    <div className="app-grain min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground md:flex">
        <div className="mb-9 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">Pórtico</div>
            <div className="font-mono text-[9px] uppercase tracking-[.16em] text-sidebar-foreground/55">Controle escolar</div>
          </div>
        </div>
        <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">Operação</div>
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={cn('group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', location === href && 'bg-sidebar-primary/15 text-sidebar-primary')}>
              <Icon className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
              <span>{label}</span>
              {href === '/' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
            </Link>
          ))}
        </nav>
        <div className="mt-7 px-2 pb-2 font-mono text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">Atalhos</div>
        <Link href="/cadastro" data-testid="link-nav-cadastro" className="group flex items-center gap-3 rounded-xl border border-dashed border-sidebar-foreground/20 px-3 py-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:border-sidebar-primary/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <div className="grid h-5 w-5 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Plus className="h-3.5 w-3.5" /></div>
          Novo prestador
        </Link>
        <div className="mt-auto rounded-2xl border border-sidebar-foreground/10 bg-sidebar-accent/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sidebar-primary"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-semibold">Portaria segura</span></div>
          <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">Identidade registrada uma vez. Acesso simples em cada retorno.</p>
        </div>
          <div className="mt-4 flex items-center gap-3 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">MA</div>
           <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">Equipe da portaria</div><div className="truncate text-[10px] text-sidebar-foreground/45">Acesso Supabase</div></div>
           <button type="button" onClick={() => supabase.auth.signOut()} aria-label="Sair" className="text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>
      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-primary" /><span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Unidade Jardim Norte</span></div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button type="button" data-testid="button-global-search" className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 sm:flex"><Search className="h-3.5 w-3.5" />Buscar registro <kbd className="ml-5 rounded border border-border px-1.5 py-0.5 font-mono text-[9px]">/</kbd></button>
            <button type="button" data-testid="button-notifications" className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"><Bell className="h-4 w-4" /></button>
            <Link href="/cadastro" data-testid="link-header-cadastro" className="hidden items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:flex"><Plus className="h-3.5 w-3.5" />Registrar entrada</Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">{children}</main>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-mobile-${href === '/' ? 'inicio' : href.slice(1)}`} className={cn('flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium text-muted-foreground', location === href && 'text-primary')}><Icon className="h-4 w-4" />{href === '/' ? 'Início' : href === '/historico' ? 'Histórico' : 'Pessoas'}</Link>)}
      </div>
    </div>
  );
}