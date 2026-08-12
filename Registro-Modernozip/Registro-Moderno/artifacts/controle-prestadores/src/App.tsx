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

function AuthScreen() {
  const client = useSupabase();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
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

    const result =
      mode === 'sign-in'
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({
            email,
            password,
            options: { data: { full_name: name.trim() } },
          });

    setPending(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === 'sign-up' && !result.data.session) {
      setMessage('Confira seu e-mail para confirmar o cadastro antes de entrar.');
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
            Pórtico · Controle escolar
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {mode === 'sign-in' ? 'Acesso da equipe' : 'Criar acesso da equipe'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'sign-in'
              ? 'Entre para registrar prestadores e consultar as entradas da escola.'
              : 'Cadastre o primeiro usuário para começar a usar o sistema.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {mode === 'sign-up' && (
            <label className="block text-sm font-medium">
              Nome
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
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="equipe@escola.com"
            />
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
            {pending ? 'Aguarde…' : mode === 'sign-in' ? 'Entrar' : 'Criar conta'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setError('');
              setMessage('');
            }}
            className="w-full text-sm font-medium text-primary hover:underline"
          >
            {mode === 'sign-in' ? 'Ainda não tenho acesso' : 'Já tenho uma conta'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AccessGate() {
  const client = useSupabase();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  if (!session) return <AuthScreen />;

  return <Router />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/cadastro" component={Cadastro} />
          <Route path="/historico" component={Historico} />
          <Route path="/prestadores" component={Prestadores} />
          <Route path="/prestadores/:id" component={PrestadorDetalhe} />
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

function AuthenticatedApp() {
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
          <AccessGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  const [config, setConfig] = useState<{ url: string; anonKey: string } | null>(null);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar a configuração do Supabase.');
        return response.json() as Promise<{ url: string; anonKey: string }>;
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
      <AuthenticatedApp />
    </SupabaseProvider>
  );
}

export default App;