import {
  AlertCircle,
  Camera,
  ImagePlus,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 450 * 1024;
const MAX_IMAGE_DIMENSION = 1024;

function dataUrlByteLength(value: string) {
  const base64 = value.split(',', 2)[1] ?? '';
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A imagem não pôde ser lida.'));
    image.src = source;
  });
}

async function optimizeImage(source: string) {
  const image = await loadImage(source);
  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / image.naturalWidth,
    MAX_IMAGE_DIMENSION / image.naturalHeight,
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem.');

  context.drawImage(image, 0, 0, width, height);
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
    const optimized = canvas.toDataURL('image/jpeg', quality);
    if (dataUrlByteLength(optimized) <= MAX_OUTPUT_BYTES || quality === 0.42) {
      return optimized;
    }
  }
  throw new Error('Não foi possível otimizar a imagem.');
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'A câmera está bloqueada. Permita o acesso nas configurações do navegador ou escolha uma imagem.';
    }
    if (error.name === 'NotFoundError') {
      return 'Nenhuma câmera foi encontrada neste dispositivo. Escolha uma imagem para continuar.';
    }
    if (error.name === 'NotReadableError') {
      return 'A câmera está sendo usada por outro aplicativo. Feche-o ou escolha uma imagem.';
    }
  }
  return 'Não foi possível abrir a câmera. Tente novamente ou escolha uma imagem.';
}

export function CameraCapture({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'active' | 'denied'>('idle');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(
    () => () => streamRef.current?.getTracks().forEach((track) => track.stop()),
    [],
  );

  useEffect(() => {
    if (cameraState !== 'active' || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current
      .play()
      .catch(() => setError('A câmera foi autorizada, mas não iniciou. Tente abrir novamente.'));
  }, [cameraState]);

  async function openCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('denied');
      setError('Este navegador não oferece acesso à câmera. Escolha uma imagem para continuar.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 720 },
        audio: false,
      });
      streamRef.current = stream;
      setCameraState('active');
    } catch (cameraError) {
      setCameraState('denied');
      setError(cameraErrorMessage(cameraError));
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError('A câmera ainda está carregando. Aguarde um instante e tente novamente.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 540;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Não foi possível capturar a imagem. Escolha uma imagem para continuar.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setProcessing(true);
    setError('');
    try {
      onChange(await optimizeImage(canvas.toDataURL('image/jpeg', 0.82)));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraState('idle');
    } catch {
      setError('Não foi possível preparar o retrato. Tente novamente ou escolha uma imagem.');
    } finally {
      setProcessing(false);
    }
  }

  function fileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('A imagem selecionada excede 10 MB. Escolha um arquivo menor.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError('Não foi possível ler o arquivo. Tente outra imagem.');
    reader.onload = async () => {
      setProcessing(true);
      try {
        onChange(await optimizeImage(String(reader.result)));
      } catch {
        setError('Não foi possível preparar essa imagem. Tente JPG, PNG ou WebP.');
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={fileSelected}
        className="hidden"
        data-testid="input-photo-file"
      />
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/35">
          <img
            src={value}
            alt="Retrato selecionado"
            className="aspect-[4/3] w-full object-cover"
            data-testid="img-photo-preview"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={processing}
            data-testid="button-remove-photo"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-foreground/75 text-background transition-transform hover:scale-105 disabled:opacity-50"
            aria-label="Remover retrato"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openCamera}
            disabled={processing}
            data-testid="button-retake-photo"
            className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refazer retrato
          </button>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/35 bg-secondary/30">
          {cameraState === 'active' ? (
            <>
              <video
                ref={videoRef}
                muted
                playsInline
                className="aspect-[4/3] w-full object-cover"
                data-testid="video-camera"
              />
              <button
                type="button"
                onClick={capture}
                disabled={processing}
                data-testid="button-capture-photo"
                className="absolute bottom-4 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border-4 border-background bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
                aria-label="Capturar retrato"
              >
                {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center px-7 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Camera className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">Retrato do prestador</p>
              <p className="mt-1 max-w-[230px] text-xs leading-relaxed text-muted-foreground">
                Centralize o rosto no enquadramento. A imagem será otimizada automaticamente.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={processing}
                  data-testid="button-open-camera"
                  className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Abrir câmera
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                  data-testid="button-upload-photo"
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Escolher arquivo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {processing && (
        <p className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-xs text-primary" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparando imagem para o cadastro…
        </p>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/15 p-3 text-xs text-foreground" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        A imagem fica vinculada apenas ao registro escolar.
      </div>
    </div>
  );
}