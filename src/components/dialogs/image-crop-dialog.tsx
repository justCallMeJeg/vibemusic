import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import Cropper from "react-easy-crop";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { StandardDialog } from "@/components/shared/standard-dialog";

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropDialogProps {
  imageSrc: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedImage: Uint8Array) => void;
}

export function ImageCropDialog({
  imageSrc,
  open,
  onOpenChange,
  onCropComplete,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChangeComplete = useCallback(
    (_formattedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Uint8Array | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
        },
        "image/jpeg",
        0.9
      );
    });
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const result = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (result) {
        onCropComplete(result);
        onOpenChange(false);
      }
    } catch (e) {
      logger.error("Failed to crop image", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const footer = (
    <>
      <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={isProcessing}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Crop
      </Button>
    </>
  );

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Crop Image"
      description="Adjust the image to fit the square cover format."
      footer={footer}
      contentClassName="sm:max-w-md"
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="relative w-full h-64 bg-background rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropChangeComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>

        <div className="w-full space-y-2 px-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Zoom</span>
            <span>{zoom.toFixed(1)}x</span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>
      </div>
    </StandardDialog>
  );
}
