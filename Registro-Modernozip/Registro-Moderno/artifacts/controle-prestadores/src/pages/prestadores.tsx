import { AlertCircle, ArrowUpRight, Building2, CheckSquare, RefreshCw, Search, Trash2, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useListProviders } from '@workspace/api-client-react';
import { ProviderAvatar } from '@/components/provider-avatar';
import { getUserFacingError } from '@/lib/user-facing-error';
import { useSupabase } from '@/lib/supabase-context';

export default function Prestadores() {
  const supabase = useSupabase();
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deletePending, setDeletePending] = useState<number | 'all' | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const query = useListProviders({ limit: 100, search: search.trim() || undefined });
  const providers = useMemo(() => (query.data ?? []).filter((p) => `${p.name} ${p.company} ${p.defaultService} ${p.rg}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    })).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { profile?: { role?: string } };
      setIsAdmin(payload.profile?.role === 'admin');
    }).catch(() => setIsAdmin(false));
  }, [supabase]);

  function toggleProvider(id: number) {
    setSelectedIds((current) => current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]);
  }

  function toggleAll() {
    const visibleIds = providers.map((provider) => provider.id);
    setSelectedIds((current) => visibleIds.every((id) => current.includes(id)) ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])));
  }

  async function deleteProviders(ids: number[]) {
    if (!ids.length) return;
    const label = ids.length === 1 ? 'este prestador' : `os ${ids.length} prestadores selecionados`;
    if (!window.confirm(`Excluir ${label}? As visitas relacionadas também serão apagadas e essa ação não pode ser desfeita.`)) return;
    setDeleteError('');
    setDeleteMessage('');
    setDeletePending(ids.length === providers.length ? 'all' : ids[0]);
    try {
      const { data } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
      const responses = await Promise.all(ids.map((id) => fetch(`/api/providers/${id}`, { method: 'DELETE', headers })));
      const failed = responses.find((response) => !response.ok);
      if (failed) {
        const payload = await failed.json() as { error?: string };
         const apiError = new Error(payload.error ?? 'Não foi possível excluir os prestadores.');
         Object.assign(apiError, { status: failed.status, data: payload });
         throw apiError;
      }
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setDeleteMessage(ids.length === 1 ? 'Prestador excluído.' : `${ids.length} prestadores excluídos.`);
      await query.refetch();
    } catch (requestError) {
       setDeleteError(getUserFacingError(requestError, 'Não foi possível excluir os prestadores. Tente novamente.'));
    } finally {
      setDeletePending(null);
    }
  }

  const allVisibleSelected = providers.length > 0 && providers.every((provider) => selectedIds.includes(provider.id));

  return <div className="space-y-7">
    <section className="rise-in flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary"><UsersRound className="h-3.5 w-3.5" />Diretório</div><h1 className="text-3xl font-bold tracking-[-.04em]">Prestadores</h1><p className="mt-2 text-sm text-muted-foreground">Identidades conhecidas pela unidade e prontas para o próximo retorno.</p></div><Link href="/cadastro" data-testid="link-directory-cadastro" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"><UserRound className="h-4 w-4" />Cadastrar prestador</Link></section>
    <section className="rise-in delay-1 rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="relative"><Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-directory-search" placeholder="Buscar nome, empresa ou serviço..." className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></div></section>
    {isAdmin && providers.length > 0 && <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><CheckSquare className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">Ações do administrador</p><p className="text-xs text-muted-foreground">{selectedIds.length ? `${selectedIds.length} selecionado(s)` : 'Selecione registros para excluir em lote.'}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={toggleAll} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold">{allVisibleSelected ? 'Desmarcar todos' : 'Selecionar todos'}</button><button type="button" onClick={() => deleteProviders(selectedIds)} disabled={!selectedIds.length || deletePending !== null} className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Excluir selecionados</button></div></section>}
    {deleteError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{deleteError}</p>}
    {deleteMessage && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{deleteMessage}</p>}
     {query.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card p-5"><div className="skeleton h-11 w-11 rounded-xl" /><div className="skeleton mt-4 h-3 w-2/3 rounded" /><div className="skeleton mt-2 h-2 w-1/2 rounded" /></div>)}</div> : query.isError ? <div className="rounded-2xl border border-border bg-card p-12 text-center"><AlertCircle className="mx-auto h-5 w-5 text-destructive" /><p className="mt-3 font-semibold">Diretório indisponível</p><p className="mt-1 text-sm text-muted-foreground">{getUserFacingError(query.error, 'Não conseguimos carregar os prestadores agora.')}</p><button type="button" onClick={() => void query.refetch()} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><RefreshCw className="h-3.5 w-3.5" />Tentar novamente</button></div> : providers.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{providers.map((provider) => <div key={provider.id} data-testid={`card-provider-${provider.id}`} className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_10px_30px_hsl(174_43%_32%/.08)]">
      <div className="flex items-start justify-between"><ProviderAvatar name={provider.name} photo={provider.photoData} size="md" /><div className="flex items-center gap-2">{isAdmin && <><input type="checkbox" aria-label={`Selecionar ${provider.name}`} checked={selectedIds.includes(provider.id)} onChange={() => toggleProvider(provider.id)} className="h-4 w-4 accent-primary" /><button type="button" aria-label={`Excluir ${provider.name}`} onClick={() => deleteProviders([provider.id])} disabled={deletePending !== null} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></>}<Link href={`/prestadores/${provider.id}`} className="rounded-lg p-1.5"><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></Link></div></div>
      <Link href={`/prestadores/${provider.id}`} className="block"><h3 className="mt-4 font-bold tracking-tight">{provider.name}</h3><div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{provider.company}</div><div className="mt-5 flex items-end justify-between border-t border-border pt-4"><div><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Serviço padrão</p><p className="mt-1 max-w-[170px] truncate text-xs font-medium">{provider.defaultService}</p></div><div className="text-right"><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Visitas</p><p className="mt-1 font-mono text-sm font-bold text-primary">{provider.visitCount}</p></div></div></Link>
    </div>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground"><UsersRound className="h-5 w-5" /></div><h3 className="font-bold">{search ? 'Nenhum prestador encontrado' : 'Diretório vazio'}</h3><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{search ? 'Tente uma busca diferente.' : 'Cadastre o primeiro prestador para começar.'}</p>{!search && <Link href="/cadastro" data-testid="link-empty-cadastro" className="mt-5 inline-flex text-xs font-semibold text-primary hover:underline">Cadastrar agora</Link>}</div>}
  </div>;
}