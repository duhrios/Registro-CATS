import { type ReactNode } from 'react';
import { ClerkProvider, SignIn, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  Redirect,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

function AccessGate() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <div className="skeleton h-10 w-44 rounded-xl" />
      </div>
    );
  }

  if (!isSignedIn) {
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
              Acesso da equipe
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre para registrar prestadores e consultar as entradas da escola.
            </p>
          </div>
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
          />
        </div>
      </div>
    );
  }

  return <Router />;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
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

function App() {
  if (!clerkPubKey) {
    throw new Error('A chave de acesso da equipe não foi configurada.');
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <AccessGate />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
