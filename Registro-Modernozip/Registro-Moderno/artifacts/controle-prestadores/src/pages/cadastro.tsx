import { AlertCircle, ArrowLeft, Check, ChevronRight, Loader2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  getGetDashboardSummaryQueryKey,
  getListProvidersQueryKey,
  useCreateProvider,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { CameraCapture } from '@/components/camera-capture';
import { getUserFacingError } from '@/lib/user-facing-error';
import { useToast } from '@/hooks/use-toast';

type ProviderForm = {
  name: string;
  rg: string;
  company: string;
  service: string;
};

const emptyForm: ProviderForm = {
  name: '',
  rg: '',
  company: '',
  service: '',
};

function fieldError(form: ProviderForm, key: keyof ProviderForm) {
  const value = form[key].trim();
  if (key === 'rg') return value.length < 3 ? 'Informe um RG com pelo menos 3 caracteres.' : '';
  return value.length < 2 ? 'Preencha este campo com pelo menos 2 caracteres.' : '';
}

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createProvider = useCreateProvider();
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [touched, setTouched] = useState<Partial<Record<keyof ProviderForm, boolean>>>({});

  const valid = Object.keys(emptyForm).every(
    (key) => !fieldError(form, key as keyof ProviderForm),
  );

  function update(key: keyof ProviderForm) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setSubmitError('');
    };
  }

  function markTouched(key: keyof ProviderForm) {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ name: true, rg: true, company: true, service: true });
    setSubmitError('');
    if (!valid) {
      setSubmitError('Revise os campos destacados antes de salvar.');
      return;
    }

    createProvider.mutate(
      {
        data: {
          name: form.name.trim(),
          rg: form.rg.trim(),
          company: form.company.trim(),
          defaultService: form.service.trim(),
          photoData: photo,
        },
      },
      {
        onSuccess: (provider) => {
          setDone(true);
          void queryClient.invalidateQueries({ queryKey: getListProvidersQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          toast({
            title: 'Cadastro concluído',
            description: `${provider.name} agora pode entrar rapidamente.`,
          });
          window.setTimeout(() => setLocation('/'), 1300);
        },
        onError: (error) => {
          setSubmitError(
            getUserFacingError(
              error,
              'Não foi possível salvar o cadastro. Verifique a conexão e tente novamente.',
            ),
          );
        },
      },
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rise-in max-w-sm text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Prestador cadastrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A identidade de {form.name} foi salva. Voltando à visão geral…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="rise-in flex items-center gap-4">
        <Link
          href="/"
          data-testid="link-back-dashboard"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Voltar para o início"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary">
            Novo registro <ChevronRight className="h-3 w-3" /> Etapa única
          </div>
          <h1 className="text-3xl font-bold tracking-[-.04em]">Cadastrar prestador</h1>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <form
          onSubmit={submit}
          noValidate
          className="rise-in delay-1 rounded-2xl border border-border bg-card p-5 sm:p-7"
        >
          <div className="mb-7 flex items-start gap-3 border-b border-border pb-6">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Dados de identificação</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Esses dados não serão solicitados novamente nas próximas visitas.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {([
              ['name', 'Nome completo', 'Ex.: Carlos Eduardo Lima', 'sm:col-span-2'],
              ['rg', 'RG', '00.000.000-0', ''],
              ['company', 'Empresa', 'Nome da empresa', ''],
              ['service', 'Serviço padrão', 'Ex.: Manutenção de ar-condicionado', 'sm:col-span-2'],
            ] as const).map(([key, label, placeholder, layout]) => {
              const message = touched[key] ? fieldError(form, key) : '';
              return (
                <label key={key} className={layout}>
                  <span className="mb-2 block text-xs font-semibold">
                    {label} <i className="text-accent-foreground">*</i>
                  </span>
                  <input
                    value={form[key]}
                    onChange={update(key)}
                    onBlur={() => markTouched(key)}
                    data-testid={`input-provider-${key}`}
                    placeholder={placeholder}
                    aria-invalid={Boolean(message)}
                    className={`h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                      message ? 'border-destructive' : 'border-input'
                    }`}
                  />
                  {message && (
                    <span className="mt-1.5 block text-xs text-destructive" role="alert">
                      {message}
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
            <p className="text-[11px] text-muted-foreground">
              <i className="text-accent-foreground">*</i> Campos obrigatórios
            </p>
            <div className="flex gap-2">
              <Link
                href="/"
                data-testid="link-cancel-cadastro"
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={createProvider.isPending}
                data-testid="button-submit-provider"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
              >
                {createProvider.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {createProvider.isPending ? 'Salvando…' : 'Salvar cadastro'}
              </button>
            </div>
          </div>

          {submitError && (
            <div
              className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-left text-xs text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Não foi possível concluir o cadastro</p>
                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          )}
        </form>

        <div className="rise-in delay-2 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-bold">Retrato</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Uma foto torna o reconhecimento na chegada mais ágil e seguro.
            </p>
          </div>
          <CameraCapture
            value={photo}
            onChange={(value) => {
              setPhoto(value);
              setSubmitError('');
            }}
          />
        </div>
      </div>
    </div>
  );
}