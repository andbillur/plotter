'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, CameraOff, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';

type Props = {
  onScan: (code: string) => void;
  placeholder?: string;
  label?: string;
};

export function BarcodeScanner({ onScan, placeholder = 'Kod kiriting yoki skanerlang...', label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      scanLoop();
    } catch {
      setError('Kameraga ruxsat bering yoki qo\'lda kiriting');
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
        onScan(code.data.trim());
        stopCamera();
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  useEffect(() => () => stopCamera(), []);

  const submitManual = () => {
    const v = manual.trim();
    if (v) {
      onScan(v);
      setManual('');
    }
  };

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {!cameraOn ? (
          <Button type="button" variant="outline" size="sm" onClick={startCamera}>
            <Camera className="h-4 w-4 mr-1" />
            Kamera (barcode)
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
            <CameraOff className="h-4 w-4 mr-1" />
            Kamerani yopish
          </Button>
        )}
      </div>
      {cameraOn && (
        <div className="relative rounded-lg overflow-hidden border bg-black max-w-sm">
          <video ref={videoRef} className="w-full" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <p className="absolute bottom-2 left-2 right-2 text-center text-xs text-white bg-black/50 rounded py-1">
            QR/barcode ni ramkaga tuting
          </p>
        </div>
      )}
      {error && <p className="text-sm text-amber-700">{error}</p>}
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submitManual())}
          className="font-mono text-sm"
        />
        <Button type="button" variant="secondary" size="icon" onClick={submitManual} title="Qo'lda">
          <Keyboard className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
