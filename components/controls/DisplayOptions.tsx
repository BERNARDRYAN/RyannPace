'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePosterStore } from '@/store/usePosterStore';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MAX_OVERLAY_BYTES = 12 * 1024 * 1024;

export function DisplayOptions() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [overlayError, setOverlayError] = useState<string | null>(null);

  const { config, updateConfig } = usePosterStore(
    useShallow((s) => ({ config: s.config, updateConfig: s.updateConfig }))
  );

  const onOverlayFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setOverlayError('Choose an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > MAX_OVERLAY_BYTES) {
      setOverlayError('Image is larger than 12 MB.');
      return;
    }
    setOverlayError(null);
    // A data URL keeps the image same-origin so html-to-image can inline it on export.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateConfig({ customOverlayImage: reader.result });
    };
    reader.onerror = () => setOverlayError('The image could not be read.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1">
      <Switch
        label="Route trace"
        description="GPS polyline with start and finish pins"
        checked={config.showRoute}
        onCheckedChange={(showRoute) => updateConfig({ showRoute })}
      />
      <Switch
        label="Elevation profile"
        checked={config.showElevationProfile}
        onCheckedChange={(showElevationProfile) => updateConfig({ showElevationProfile })}
      />
      <Switch
        label="Heart rate"
        checked={config.showHeartRate}
        onCheckedChange={(showHeartRate) => updateConfig({ showHeartRate })}
      />
      <Switch
        label="Watermark"
        checked={config.showWatermark}
        onCheckedChange={(showWatermark) => updateConfig({ showWatermark })}
      />
      {config.showWatermark && (
        <div className="pt-1 pb-2">
          <Label htmlFor="watermark-text">Watermark text</Label>
          <Input
            id="watermark-text"
            value={config.watermarkText}
            maxLength={32}
            onChange={(e) => updateConfig({ watermarkText: e.target.value })}
            placeholder="RyannPace"
          />
        </div>
      )}

      <div className="pt-3">
        <Label>Background photo</Label>
        {config.customOverlayImage ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL preview */}
              <img
                src={config.customOverlayImage}
                alt="Background overlay preview"
                className="size-12 rounded-md object-cover grayscale"
              />
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>Opacity</span>
                  <span className="font-mono">{Math.round(config.overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={config.overlayOpacity}
                  onChange={(e) => updateConfig({ overlayOpacity: Number(e.target.value) })}
                  className="w-full"
                  aria-label="Background photo opacity"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateConfig({ customOverlayImage: null })}
                aria-label="Remove background photo"
              >
                <X />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus /> Add photo
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            onOverlayFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {overlayError && <p className="mt-2 text-xs text-brand">{overlayError}</p>}
      </div>
    </div>
  );
}
