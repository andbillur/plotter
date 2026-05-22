'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, ScanLine, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';
import { cn } from '@/lib/utils';

type Props = {
  onScan: (code: string) => void;
  placeholder?: string;
  label?: string;
  value?: string;
  onValueChange?: (code: string) => void;
  codePrefix?: string;
};

async function openCameraStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: 'environment' }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  ];
  let lastErr: unknown;
  for (const c of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(c);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export function BarcodeScanner({
  onScan,
  placeholder = 'Kod kiriting yoki skanerlang...',
  label,
  value: controlledValue,
  onValueChange,
  codePrefix,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const scanningRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [internal, setInternal] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const manual = controlledValue !== undefined ? controlledValue : internal;
  const setManual = (v: string) => {
    if (onValueChange) onValueChange(v);
    else setInternal(v);
  };

  const normalize = (raw: string) => {
    let code = raw.trim();
    if (!code) return '';
    if (codePrefix && !code.toUpperCase().startsWith(codePrefix.toUpperCase())) {
      code = `${codePrefix}${code.replace(/^#+/, '')}`;
    }
    return code;
  };

  const applyCode = useCallback(
    (raw: string) => {
      const code = normalize(raw);
      if (!code) return;
      setManual(code);
      onScan(code);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [codePrefix, onScan, onValueChange]
  );

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        applyCode(code.data);
        stopCamera();
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [applyCode, stopCamera]);

  /** Video DOM ga chiqgach stream ulanadi — aks holda qora ekran */
  const bindVideoStream = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        video.removeEventListener('loadedmetadata', onReady);
        resolve();
      };
      video.addEventListener('loadedmetadata', onReady);
      if (video.readyState >= 1) resolve();
      setTimeout(() => reject(new Error('Video yuklanmadi')), 8000);
    });

    await video.play();
    scanningRef.current = true;
    scanLoop();
  }, [scanLoop]);

  useEffect(() => {
    if (!cameraOn) return;
    bindVideoStream().catch(() => {
      setError('Kamera ko\'rinishi yoqilmadi — qayta urinib ko\'ring');
      stopCamera();
    });
  }, [cameraOn, bindVideoStream, stopCamera]);

  const startCamera = async () => {
    setError('');
    setMode('scan');
    setStarting(true);
    stopCamera();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Brauzer kamerani qo\'llab-quvvatlamaydi');
      }
      const stream = await openCameraStream();
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError('Kameraga ruxsat bering yoki «Qo\'lda» rejimidan foydalaning');
      setMode('manual');
      setCameraOn(false);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitManual = () => applyCode(manual);

  return (
    <div className="space-y-3 w-full">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}

      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setMode('scan');
            if (!cameraOn && !starting) startCamera();
          }}
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium touch-manipulation min-h-[44px]',
            mode === 'scan' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          )}
        >
          <ScanLine className="h-4 w-4 shrink-0" />
          Skaner
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('manual');
            stopCamera();
          }}
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium touch-manipulation min-h-[44px]',
            mode === 'manual' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
          )}
        >
          <Keyboard className="h-4 w-4 shrink-0" />
          Qo&apos;lda
        </button>
      </div>

      {mode === 'scan' && (
        <div className="space-y-2">
          {/* Video har doim DOMda (yashirin) — stream ulash uchun */}
          <div
            className={cn(
              'relative rounded-xl overflow-hidden border-2 border-slate-300 bg-black w-full',
              cameraOn ? 'aspect-[4/3] max-h-[min(70vh,420px)]' : 'h-0 overflow-hidden border-0'
            )}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover bg-black"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />
            {cameraOn && (
              <>
                <div className="absolute inset-8 border-2 border-white/70 rounded-lg pointer-events-none z-10" />
                <p className="absolute bottom-3 left-3 right-3 z-10 text-center text-xs text-white bg-black/60 rounded-lg py-2 px-2">
                  QR yoki barcode ni ramkaga tuting
                </p>
              </>
            )}
          </div>

          {!cameraOn ? (
            <Button
              type="button"
              variant="default"
              className="w-full min-h-[48px] text-base"
              disabled={starting}
              onClick={startCamera}
            >
              <Camera className="h-5 w-5 mr-2" />
              {starting ? 'Kamera ochilmoqda...' : 'Kamerani ochish'}
            </Button>
          ) : (
            <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={stopCamera}>
              <CameraOff className="h-4 w-4 mr-2" />
              Kamerani yopish
            </Button>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-2">
          <Input
            placeholder={placeholder}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submitManual())}
            className="font-mono text-base min-h-[48px] h-12"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <Button type="button" className="w-full min-h-[48px] text-base" onClick={submitManual}>
            Kodni qo&apos;llash
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{error}</p>
      )}
      {manual && mode === 'scan' && (
        <p className="text-xs font-mono text-slate-500 truncate">Tanlangan: {manual}</p>
      )}
    </div>
  );
}
