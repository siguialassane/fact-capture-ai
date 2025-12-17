import { useRef, useState, useEffect } from "react";
import { Camera, X, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Veuillez autoriser l'accès.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        // Compress to JPEG at 80% quality
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        stopCamera();
        onCapture(imageData);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-white">
        <p className="text-center mb-4">{error}</p>
        <Button variant="secondary" onClick={onCancel}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Guide frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[85%] h-[60%] border-2 border-white/50 rounded-lg">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            Cadrez votre facture
          </div>
        </div>
      </div>

      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCamera}
          className="text-white hover:bg-white/20"
        >
          <SwitchCamera className="h-6 w-6" />
        </Button>
      </div>

      {/* Bottom capture button */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center">
        <button
          onClick={handleCapture}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center">
            <Camera className="h-8 w-8 text-primary" />
          </div>
        </button>
      </div>
    </div>
  );
}
