import { Camera, ImagePlus, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function CameraCapture({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'active' | 'denied'>('idle');
  const [error, setError] = useState('');
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  async function openCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: 720 }, audio: false });
      if (!stream) throw new Error('Câmera indisponível');
      streamRef.current = stream;
      setCameraState('active');
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { setCameraState('denied'); setError('Não foi possível abrir a câmera. Selecione uma imagem para continuar.'); }
  }
  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 540;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL('image/jpeg', .82));
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraState('idle');
  }
  function fileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => onChange(String(reader.result)); reader.readAsDataURL(file);
  }
  return <div className="space-y-3">
    <input ref={fileRef} type="file" accept="image/*" onChange={fileSelected} className="hidden" data-testid="input-photo-file" />
    {value ? <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/35">
      <img src={value} alt="Retrato selecionado" className="aspect-[4/3] w-full object-cover" data-testid="img-photo-preview" />
      <button type="button" onClick={() => onChange(null)} data-testid="button-remove-photo" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-foreground/75 text-background transition-transform hover:scale-105"><X className="h-4 w-4" /></button>
      <button type="button" onClick={openCamera} data-testid="button-retake-photo" className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-xs font-semibold"><RefreshCw className="h-3.5 w-3.5" />Refazer retrato</button>
    </div> : <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/35 bg-secondary/30">
      {cameraState === 'active' ? <><video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" data-testid="video-camera" /><button type="button" onClick={capture} data-testid="button-capture-photo" className="absolute bottom-4 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border-4 border-background bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105"><Camera className="h-5 w-5" /></button></> : <div className="flex aspect-[4/3] flex-col items-center justify-center px-7 text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Camera className="h-6 w-6" /></div><p className="text-sm font-semibold">Retrato do prestador</p><p className="mt-1 max-w-[230px] text-xs leading-relaxed text-muted-foreground">Centralize o rosto no enquadramento. A imagem ajuda a reconhecer retornos.</p><div className="mt-5 flex gap-2"><button type="button" onClick={openCamera} data-testid="button-open-camera" className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"><Camera className="h-3.5 w-3.5" />Abrir câmera</button><button type="button" onClick={() => fileRef.current?.click()} data-testid="button-upload-photo" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold transition-colors hover:border-primary/40"><Upload className="h-3.5 w-3.5" />Escolher arquivo</button></div></div>}
    </div>}
    {error && <div className="flex items-start gap-2 rounded-lg bg-accent/15 p-3 text-xs text-foreground"><ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />{error}</div>}
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />A imagem fica vinculada apenas ao registro escolar.</div>
  </div>;
}