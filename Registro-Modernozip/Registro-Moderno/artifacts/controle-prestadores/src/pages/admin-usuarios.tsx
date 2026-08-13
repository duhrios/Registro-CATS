import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Link2, Loader2, Save, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { useSupabase } from '@/lib/supabase-context';

type Profile = {
  username: string;
  full_name: string;
  role: 'admin' | 'user';
};

export default function AdminUsuarios() {
  const supabase = useSupabase();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [driveLoading, setDriveLoading] = useState(false);
  const [drivePending, setDrivePending] = useState(false);
  const [driveMessage, setDriveMessage] = useState('');
  const [driveError, setDriveError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
       if (!token) {
         if (active) setLoading(false);
         return;
       }
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? 'Acesso não autorizado.');
          if (active) setProfile(payload.profile as Profile);
        })
        .catch((requestError: Error) => active && setError(requestError.message))
        .finally(() => active && setLoading(false));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    let active = true;
    setDriveLoading(true);
    supabase.auth.getSession().then(({ data }) => fetch('/api/settings/drive', {
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    }))
      .then(async (response) => {
        const payload = await response.json() as { driveFolderUrl?: string | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Não foi possível carregar o link do Drive.');
        if (active) setDriveFolderUrl(payload.driveFolderUrl ?? '');
      })
      .catch((requestError: Error) => active && setDriveError(requestError.message))
      .finally(() => active && setDriveLoading(false));
    return () => {
      active = false;
    };
  }, [profile, supabase]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setPending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ username, fullName, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'Não foi possível criar o integrante.');
        return;
      }
       setMessage(`O usuário ${username} foi criado para a recepção e já pode entrar.`);
      setUsername('');
      setFullName('');
      setPassword('');
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  async function saveDriveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDriveError('');
    setDriveMessage('');
    setDrivePending(true);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/settings/drive', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ driveFolderUrl: driveFolderUrl.trim() || null }),
      });
      const payload = await response.json() as { driveFolderUrl?: string | null; error?: string };
      if (!response.ok) {
        setDriveError(payload.error ?? 'Não foi possível salvar o link do Drive.');
        return;
      }
      setDriveFolderUrl(payload.driveFolderUrl ?? '');
      setDriveMessage('Link da pasta de fotos salvo.');
    } catch {
      setDriveError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setDrivePending(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Carregando permissões…</div>;
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-destructive/20 bg-card p-8 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Acesso restrito</h1>
         <p className="mt-2 text-sm text-muted-foreground">{error || 'Somente o administrador pode gerenciar usuários.'}</p>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <section className="rise-in flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary">
             <UsersRound className="h-3.5 w-3.5" /> Administração da recepção
          </div>
           <h1 className="text-3xl font-bold tracking-[-.04em]">Usuários da recepção</h1>
           <p className="mt-2 max-w-xl text-sm text-muted-foreground">Crie acessos individuais para a equipe da recepção. Os novos usuários terão apenas as permissões necessárias para registrar e consultar visitas.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
          <ShieldCheck className="h-4 w-4" /> Seu acesso é administrador
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.65fr)]">
        <form onSubmit={createUser} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><UserPlus className="h-5 w-5" /></div>
             <div><h2 className="text-lg font-bold tracking-tight">Novo usuário</h2><p className="mt-1 text-xs text-muted-foreground">O usuário usará estes dados para entrar no sistema.</p></div>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium">Nome completo
              <input required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nome da pessoa responsável" className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </label>
            <label className="block text-sm font-medium">Usuário
              <input required minLength={3} maxLength={32} value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="ex.: maria.silva" className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Sem espaços, usando letras, números, ponto, hífen ou sublinhado.</span>
            </label>
            <label className="block text-sm font-medium">Senha inicial
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
            </label>
          </div>
          {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {message && <p className="mt-4 flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
          <button type="submit" disabled={pending} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
             {pending && <Loader2 className="h-4 w-4 animate-spin" />} Criar usuário da recepção
          </button>
        </form>

        <aside className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground">
           <div className="mb-5 flex items-center gap-2 text-sidebar-primary"><ShieldCheck className="h-5 w-5" /><h2 className="font-bold">Permissão dos usuários</h2></div>
           <p className="text-sm leading-relaxed text-sidebar-foreground/65">Somente o administrador acessa este espaço e cria usuários. Os usuários da recepção podem registrar prestadores, consultar visitas e acompanhar o movimento da escola.</p>
           <div className="mt-6 rounded-xl border border-sidebar-foreground/10 bg-sidebar-accent/60 p-4 text-xs leading-relaxed text-sidebar-foreground/60">Compartilhe a senha inicial somente com o usuário responsável. O administrador continua sendo o único responsável por novos acessos.</div>
        </aside>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Link2 className="h-5 w-5" /></div>
          <div><h2 className="text-lg font-bold tracking-tight">Pasta de fotos online</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">Cole o link da pasta do Google Drive onde as fotos dos prestadores serão organizadas. A integração usará o nome do prestador no arquivo, por exemplo: Carlos Eduardo Souza.jpg.</p></div>
        </div>
        <form onSubmit={saveDriveFolder} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input type="url" value={driveFolderUrl} onChange={(event) => setDriveFolderUrl(event.target.value)} disabled={driveLoading} placeholder="https://drive.google.com/drive/folders/..." className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60" />
          <button type="submit" disabled={driveLoading || drivePending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{drivePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar link</button>
        </form>
        {driveError && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{driveError}</p>}
        {driveMessage && <p className="mt-3 flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{driveMessage}</p>}
        <p className="mt-3 text-[11px] text-muted-foreground">O link fica disponível para a equipe depois que a integração do Google Drive for conectada ao projeto. Apenas o administrador pode alterá-lo.</p>
      </section>
    </div>
  );
}