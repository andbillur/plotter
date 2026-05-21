'use client';

import { useEffect, useRef, useState } from 'react';
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
  /** BOB-, PP- va h.k. — skaner natijasini normalizatsiya */
  codePrefix?: string;
};

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
  const [cameraOn, setCameraOn] = useState(false);
  const [internal, setInternal] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

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

  const applyCode = (raw: string) => {
    const code = normalize(raw);
    if (!code) return;
    setManual(code);
    onScan(code);
  };

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setError('');
    setMode('scan');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      scanLoop();
    } catch {
      setError('Kameraga ruxsat bering yoki «Qo\'lda» rejimidan foydalaning');
      setMode('manual');
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        applyCode(code.data);
        stopCamera();
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  useEffect(() => () => stopCamera(), []);

  const submitManual = () => applyCode(manual);

  return (
    <div className="space-y-3 w-full">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}

      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setMode('scan');
            if (!cameraOn) startCamera();
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
          {!cameraOn ? (
            <Button
              type="button"
              variant="default"
              className="w-full min-h-[48px] text-base"
              onClick={startCamera}
            >
              <Camera className="h-5 w-5 mr-2" />
              Kamerani ochish
            </Button>
          ) : (
            <>
              <div className="relative rounded-xl overflow-hidden border-2 border-slate-300 bg-black w-full aspect-[4/3] max-h-[min(70vh,420px)]">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-8 border-2 border-white/70 rounded-lg pointer-events-none" />
                <p className="absolute bottom-3 left-3 right-3 text-center text-xs text-white bg-black/60 rounded-lg py-2 px-2">
                  QR yoki barcode ni ramkaga tuting
                </p>
              </div>
              <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={stopCamera}>
                <CameraOff className="h-4 w-4 mr-2" />
                Kamerani yopish
              </Button>
            </>
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

      {error && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{error}</p>}
      {manual && mode === 'scan' && (
        <p className="text-xs font-mono text-slate-500 truncate">Tanlangan: {manual}</p>
      )}
    </div>
  );
}
