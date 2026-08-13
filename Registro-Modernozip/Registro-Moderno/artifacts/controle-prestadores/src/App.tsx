import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Cadastro from '@/pages/cadastro';
import Historico from '@/pages/historico';
import Prestadores from '@/pages/prestadores';
import PrestadorDetalhe from '@/pages/prestador-detalhe';
import AdminUsuarios from '@/pages/admin-usuarios';
import { AppShell } from '@/components/app-shell';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import {
  createBrowserSupabaseClient,
  type BrowserSupabaseClient,
  type Session,
} from '@/lib/supabase';
import { SupabaseProvider, useSupabase } from '@/lib/supabase-context';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function LoadingScreen({ message = 'Carregando acesso seguro…' }: { message?: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4">
      <div className="text-center">
        <div className="skeleton mx-auto h-10 w-44 rounded-xl" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function AuthScreen({ isMockMode = false }: { isMockMode?: boolean }) {
  const client = useSupabase();
  const [mode, setMode] = useState<'sign-in' | 'bootstrap'>('sign-in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setPending(true);

    try {
      const response = await fetch(`/api/auth/${mode === 'sign-in' ? 'login' : 'bootstrap'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName: name }),
      });
      const payload = (await response.json()) as {
        error?: string;
        session?: { access_token: string; refresh_token: string };
      };
      if (!response.ok || !payload.session) {
        setError(payload.error ?? 'Não foi possível concluir o acesso.');
        return;
      }
      const { error: sessionError } = await client.auth.setSession(payload.session);
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (mode === 'bootstrap') setMessage('Administrador criado. Bem-vindo à recepção.');
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <span className="font-mono text-lg font-bold">P</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">
            Recepção · Colégio Adventista
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {mode === 'sign-in' ? 'Acesso da equipe' : 'Primeiro acesso'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'sign-in'
              ? 'Entre com seu usuário e senha para registrar prestadores e consultar as entradas da escola.'
              : 'Crie o administrador inicial para liberar o acesso à equipe.'}
          </p>
          {isMockMode && (
            <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-foreground">
              Modo demonstração local · usuário: <strong>admin</strong> · senha: <strong>admin123</strong>
            </p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {mode === 'bootstrap' && (
            <label className="block text-sm font-medium">
              Nome completo
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Nome da pessoa responsável"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Usuário
            <input
              required
              minLength={3}
              maxLength={32}
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="ex.: recepcao"
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Use letras, números, ponto, hífen ou sublinhado.</span>
          </label>
          <label className="block text-sm font-medium">
            Senha
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Mínimo de 6 caracteres"
            />
          </label>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {message && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{message}</p>}
          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Aguarde…' : mode === 'sign-in' ? 'Entrar' : 'Criar administrador'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'bootstrap' : 'sign-in');
              setError('');
              setMessage('');
            }}
            className="w-full text-sm font-medium text-primary hover:underline"
          >
            {mode === 'sign-in' ? 'Primeiro acesso: criar administrador' : 'Voltar para entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AccessGate({ isMockMode }: { isMockMode: boolean }) {
  const client = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAdmin(null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  if (!session) return <AuthScreen isMockMode={isMockMode} />;
  if (isAdmin === null) return <LoadingScreen message="Carregando permissões…" />;

  return <Router isAdmin={isAdmin} />;
}

function Router({ isAdmin }: { isAdmin: boolean }) {
  return (
    <RoutedErrorBoundary>
      <AppShell isAdmin={isAdmin}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/cadastro" component={Cadastro} />
          <Route path="/historico" component={Historico} />
          <Route path="/prestadores" component={Prestadores} />
          <Route path="/prestadores/:id" component={PrestadorDetalhe} />
          <Route path="/admin" component={AdminUsuarios} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AuthenticatedApp({ isMockMode }: { isMockMode: boolean }) {
  const client = useSupabase();
  useEffect(() => {
    setAuthTokenGetter(async () => {
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    });
    return () => setAuthTokenGetter(null);
  }, [client]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <AccessGate isMockMode={isMockMode} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  const [config, setConfig] = useState<{ url: string; anonKey: string; mockMode?: boolean } | null>(null);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar a configuração do Supabase.');
        return response.json() as Promise<{ url: string; anonKey: string; mockMode?: boolean }>;
      })
      .then(setConfig)
      .catch((error: Error) => setConfigError(error.message));
  }, []);

  const client = useMemo<BrowserSupabaseClient | null>(
    () => (config ? createBrowserSupabaseClient(config.url, config.anonKey) : null),
    [config],
  );

  if (configError) return <LoadingScreen message={configError} />;
  if (!client) return <LoadingScreen />;

  return (
      <SupabaseProvider client={client}>
        <AuthenticatedApp isMockMode={config?.mockMode === true || config?.url === 'http://mock.local'} />
    </SupabaseProvider>
  );
}

export default App;