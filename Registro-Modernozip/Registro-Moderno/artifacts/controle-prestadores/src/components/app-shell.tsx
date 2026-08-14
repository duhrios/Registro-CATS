import { Bell, Clock3, LayoutDashboard, LogOut, Moon, Plus, Search, ShieldCheck, Sun, UsersRound, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useSupabase } from '@/lib/supabase-context';
import { getListProvidersQueryKey, useGetDashboardSummary, useListProviders } from '@workspace/api-client-react';
import { initials } from '@/lib/format';

const navItems = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/historico', label: 'Histórico de visitas', icon: Clock3 },
  { href: '/prestadores', label: 'Prestadores', icon: UsersRound },
];

export function AppShell({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  const [location, setLocation] = useLocation();
  const supabase = useSupabase();
  const summary = useGetDashboardSummary();
  const [identity, setIdentity] = useState({ name: 'Equipe da recepção', username: 'Acesso administrativo' });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('recepcao-theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem('recepcao-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const providerSearchParams = { limit: 8, search: globalSearch.trim() || undefined };
  const providerSearch = useListProviders(
    providerSearchParams,
    {
      query: {
        enabled: globalSearch.trim().length > 0,
        queryKey: getListProvidersQueryKey(providerSearchParams),
      },
    },
  );
  const providerResults = useMemo(() => providerSearch.data ?? [], [providerSearch.data]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const metadata = data.session?.user.user_metadata ?? {};
      setIdentity({
        name: typeof metadata.full_name === 'string' && metadata.full_name ? metadata.full_name : 'Equipe da recepção',
        username: typeof metadata.username === 'string' && metadata.username ? `@${metadata.username}` : 'Acesso administrativo',
      });
    });
  }, [supabase]);
  return (
    <div className="app-grain min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground md:flex">
        <div className="mb-9 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight">Recepção</div>
            <div className="font-mono text-[9px] uppercase tracking-[.16em] text-sidebar-foreground/55">Colégio Adventista de Taboão da Serra</div>
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
        {isAdmin && <Link href="/admin" data-testid="link-nav-admin" className={cn('group mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', location === '/admin' && 'bg-sidebar-primary/15 text-sidebar-primary')}><UserPlus className="h-[18px] w-[18px]" />Gerenciar usuários</Link>}
        <div className="mt-auto rounded-2xl border border-sidebar-foreground/10 bg-sidebar-accent/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-sidebar-primary"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-semibold">Recepção segura</span></div>
          <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">Identidade registrada uma vez. Acesso simples em cada visita.</p>
        </div>
          <div className="mt-4 flex items-center gap-3 px-2">
           <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{initials(identity.name)}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{identity.name}</div><div className="truncate text-[10px] text-sidebar-foreground/45">{identity.username}</div></div>
           <button type="button" onClick={() => supabase.auth.signOut()} aria-label="Sair" className="text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>
      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-primary" /><span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Colégio Adventista de Taboão da Serra</span></div>
          <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden sm:block">
               <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
               <input
                 value={globalSearch}
                 onChange={(event) => setGlobalSearch(event.target.value)}
                 onKeyDown={(event) => {
                   if (event.key === 'Escape') setGlobalSearch('');
                   if (event.key === 'Enter' && providerResults[0]) {
                     setGlobalSearch('');
                     setLocation(`/prestadores/${providerResults[0].id}`);
                   }
                 }}
                 data-testid="input-global-search"
                 aria-label="Buscar prestador"
                 placeholder="Buscar registro"
                 autoComplete="off"
                 className="h-9 w-[220px] rounded-lg border border-border bg-card pl-9 pr-9 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
               />
               <kbd className="pointer-events-none absolute right-2.5 top-2 rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">/</kbd>
               {globalSearch.trim() && (
                 <div className="absolute right-0 top-11 z-40 w-[300px] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl">
                   {providerSearch.isFetching ? (
                     <p className="px-3 py-4 text-center text-xs text-muted-foreground">Buscando prestadores…</p>
                   ) : providerSearch.isError ? (
                     <p className="px-3 py-4 text-center text-xs text-destructive">Não foi possível buscar agora.</p>
                   ) : providerResults.length ? (
                     providerResults.map((provider) => (
                       <button
                         key={provider.id}
                         type="button"
                         onClick={() => {
                           setGlobalSearch('');
                           setLocation(`/prestadores/${provider.id}`);
                         }}
                         className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                       >
                         <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                           {initials(provider.name)}
                         </div>
              <button
                type="button"
                aria-label="Buscar prestador no celular"
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen((open) => !open)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground sm:hidden"
              >
                {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label={darkMode ? 'Usar modo claro' : 'Usar modo escuro'}
                onClick={() => setDarkMode((value) => !value)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
                         <span className="min-w-0">
                           <span className="block truncate text-xs font-semibold">{provider.name}</span>
                           <span className="block truncate text-[11px] text-muted-foreground">{provider.company}</span>
                         </span>
                       </button>
                     ))
                   ) : (
                     <p className="px-3 py-4 text-center text-xs text-muted-foreground">Nenhum prestador encontrado.</p>
                   )}
                 </div>
               )}
             </div>
             <div className="relative">
               <button type="button" data-testid="button-notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"><Bell className="h-4 w-4" />{(summary.data?.recentVisits.length ?? 0) > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}</button>
               {notificationsOpen && <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-border bg-card p-4 shadow-xl">
                 <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Movimento recente</p><p className="mt-1 text-xs text-muted-foreground">Últimas entradas registradas</p></div><button type="button" onClick={() => setNotificationsOpen(false)} className="text-xs font-semibold text-primary hover:underline">Fechar</button></div>
                 {summary.isLoading ? <p className="py-6 text-center text-xs text-muted-foreground">Carregando notificações…</p> : summary.data?.recentVisits.length ? <div className="mt-4 space-y-3">{summary.data.recentVisits.slice(0, 3).map((visit) => <div key={visit.id} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0"><p className="truncate text-xs font-semibold">{visit.providerName}</p><p className="mt-1 text-[11px] text-muted-foreground">{visit.service} · {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(visit.enteredAt))}</p></div></div>)}</div> : <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma entrada recente.</p>}
               </div>}
             </div>
           <Link href="/cadastro" data-testid="link-header-cadastro" className="hidden items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 sm:flex"><Plus className="h-3.5 w-3.5" />Registrar entrada</Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">{children}</main>
      </div>
      {mobileSearchOpen && (
        <div className="fixed inset-x-3 top-[78px] z-40 rounded-2xl border border-border bg-card p-3 shadow-2xl sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setMobileSearchOpen(false);
                if (event.key === 'Enter' && providerResults[0]) {
                  setMobileSearchOpen(false);
                  setGlobalSearch('');
                  setLocation(`/prestadores/${providerResults[0].id}`);
                }
              }}
              data-testid="input-mobile-search"
              aria-label="Buscar prestador"
              placeholder="Buscar nome, empresa ou RG"
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          {globalSearch.trim() && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-background p-1.5">
              {providerSearch.isFetching ? <p className="px-3 py-4 text-center text-xs text-muted-foreground">Buscando…</p> : providerResults.length ? providerResults.map((provider) => (
                <button key={provider.id} type="button" onClick={() => { setMobileSearchOpen(false); setGlobalSearch(''); setLocation(`/prestadores/${provider.id}`); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-secondary">
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold">{provider.name}</span><span className="block truncate text-[11px] text-muted-foreground">{provider.company}</span></span>
                </button>
              )) : <p className="px-3 py-4 text-center text-xs text-muted-foreground">Nenhum prestador encontrado.</p>}
            </div>
          )}
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-mobile-${href === '/' ? 'inicio' : href.slice(1)}`} className={cn('flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium text-muted-foreground', location === href && 'text-primary')}><Icon className="h-4 w-4" />{href === '/' ? 'Início' : href === '/historico' ? 'Histórico' : 'Pessoas'}</Link>)}
      </div>
    </div>
  );
}