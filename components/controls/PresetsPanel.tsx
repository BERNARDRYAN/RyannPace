'use client';

import { useState, type FormEvent } from 'react';
import { BookmarkPlus, LoaderCircle, LogIn, Trash } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { PosterConfig, UserPreset } from '@/types/poster';
import { useAccountStore } from '@/store/useAccountStore';
import { usePosterStore } from '@/store/usePosterStore';
import { TEMPLATES } from '@/lib/poster-presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/store/useLocaleStore';
import { tr } from '@/store/useLocaleStore';

function templateName(id: PosterConfig['templateId']): string {
  return TEMPLATES.find((t) => t.id === id)?.name ?? id;
}

function PresetRow({ preset, onApply }: { preset: UserPreset; onApply: (preset: UserPreset) => void }) {
  const deletePreset = useAccountStore((s) => s.deletePreset);
  const showNotice = useAccountStore((s) => s.showNotice);
  const [confirming, setConfirming] = useState(false);
  const t = useT();
  const { palette, aspectRatio, templateId } = preset.config;

  const onDelete = async () => {
    setConfirming(false);
    const result = await deletePreset(preset.id);
    if (!result.ok) showNotice({ kind: 'error', text: tr(result.error) });
  };

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-line bg-white p-2 pr-1.5">
      <button
        type="button"
        onClick={() => onApply(preset)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        title={t('Apply “{name}”', { name: preset.presetName })}
      >
        <span
          className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-line"
          style={{ background: palette.background }}
          aria-hidden="true"
        >
          <span className="absolute right-0 bottom-0 size-3.5 rounded-tl-full" style={{ background: palette.accent }} />
          <span className="font-serif text-sm italic" style={{ color: palette.primaryText }}>
            Aa
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{preset.presetName}</span>
          <span className="block truncate font-mono text-[10px] tracking-wider text-muted uppercase">
            {t(templateName(templateId))} · {palette.name} · {aspectRatio}
          </span>
        </span>
      </button>

      {confirming ? (
        <span className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {t('Keep')}
          </Button>
          <Button size="sm" className="bg-brand hover:bg-brand/90" onClick={onDelete}>
            {t('Delete')}
          </Button>
        </span>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('Delete preset {name}', { name: preset.presetName })}
          onClick={() => setConfirming(true)}
          className="text-muted opacity-60 group-hover:opacity-100 hover:text-brand focus-visible:opacity-100"
        >
          <Trash />
        </Button>
      )}
    </li>
  );
}

export function PresetsPanel() {
  const { status, presets, presetsLoading, openSignIn, savePreset, showNotice } = useAccountStore(
    useShallow((s) => ({
      status: s.status,
      presets: s.presets,
      presetsLoading: s.presetsLoading,
      openSignIn: s.openSignIn,
      savePreset: s.savePreset,
      showNotice: s.showNotice,
    }))
  );
  const { config, updateConfig } = usePosterStore(
    useShallow((s) => ({ config: s.config, updateConfig: s.updateConfig }))
  );

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const t = useT();
  const suggestedName = `${t(templateName(config.templateId))} · ${config.palette.name} · ${config.aspectRatio}`;

  if (status === 'unknown') {
    return <div className="h-20 animate-pulse rounded-lg bg-studio" aria-busy="true" />;
  }

  if (status === 'unavailable') {
    return (
      <p className="text-xs text-muted">
        {t('Preset storage is not configured on this server.')}
      </p>
    );
  }

  if (status === 'signed-out') {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-white p-4 text-center">
        <p className="text-sm text-ink">{t('Save this look and reuse it on every run.')}</p>
        <p className="mt-0.5 text-xs text-muted">{t('Template, palette, format and toggles, synced to your account.')}</p>
        <Button size="sm" className="mt-3" onClick={openSignIn}>
          <LogIn /> {t('Sign in to save presets')}
        </Button>
      </div>
    );
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    const presetName = name.trim() || suggestedName;
    setSaving(true);
    const result = await savePreset(presetName, config);
    setSaving(false);
    if (result.ok) {
      setName('');
      showNotice({ kind: 'success', text: tr('Saved “{name}”.', { name: presetName }) });
    } else {
      showNotice({ kind: 'error', text: tr(result.error) });
    }
  };

  const onApply = (preset: UserPreset) => {
    // Presets hold styles only; keep whatever background photo is loaded now.
    const style: Partial<PosterConfig> = { ...preset.config };
    delete style.customOverlayImage;
    updateConfig(style);
    showNotice({ kind: 'success', text: tr('Applied “{name}”.', { name: preset.presetName }) });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSave} className="flex gap-2">
        <Input
          aria-label={t('Preset name')}
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder={suggestedName}
        />
        <Button type="submit" disabled={saving} className="rounded-lg">
          {saving ? <LoaderCircle className="animate-spin" /> : <BookmarkPlus />}
          {t('Save')}
        </Button>
      </form>
      <p className="-mt-2 text-[11px] text-muted">
        {t('Saves template, palette, format and element toggles. Background photos stay on this device.')}
      </p>

      {presetsLoading && presets.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          <div className="h-14 animate-pulse rounded-lg bg-studio" />
          <div className="h-14 animate-pulse rounded-lg bg-studio" />
        </div>
      ) : presets.length === 0 ? (
        <p className="rounded-lg bg-studio px-3 py-4 text-center text-xs text-muted">
          {t('No saved presets yet. Style a poster, then hit Save.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {presets.map((preset) => (
            <PresetRow key={preset.id} preset={preset} onApply={onApply} />
          ))}
        </ul>
      )}
    </div>
  );
}
