'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { updateGymProfile } from '@/lib/actions/settings';
import type { GymDetail } from '@/types/api';

const THEME_PRESETS = [
  { id: 'mint',    name: 'Mint',    primary: '#6EE7B7', secondary: '#3B82F6' },
  { id: 'ocean',   name: 'Ocean',   primary: '#38BDF8', secondary: '#6366F1' },
  { id: 'fire',    name: 'Fire',    primary: '#FB923C', secondary: '#EF4444' },
  { id: 'violet',  name: 'Violet',  primary: '#A78BFA', secondary: '#EC4899' },
  { id: 'gold',    name: 'Gold',    primary: '#FBBF24', secondary: '#F97316' },
  { id: 'rose',    name: 'Rose',    primary: '#FB7185', secondary: '#E11D48' },
  { id: 'emerald', name: 'Emerald', primary: '#34D399', secondary: '#059669' },
  { id: 'neon',    name: 'Neon',    primary: '#4ADE80', secondary: '#22D3EE' },
] as const;

type PresetId = typeof THEME_PRESETS[number]['id'] | 'custom';

function activePreset(primary: string, secondary: string): PresetId {
  const match = THEME_PRESETS.find(
    (p) => p.primary.toUpperCase() === primary.toUpperCase() && p.secondary.toUpperCase() === secondary.toUpperCase(),
  );
  return match ? match.id : 'custom';
}

async function uploadLogoToApi(gymId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/gyms/${gymId}/profile/logo`,
    { method: 'POST', body: form, credentials: 'include' },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Logo upload failed');
  }
  const json = await res.json() as { url: string };
  return json.url;
}

interface Props {
  gymId: string;
  gymDetail: GymDetail;
}

export function SettingsForm({ gymId, gymDetail }: Props) {
  const profile = gymDetail.profile;

  const [primaryColor, setPrimaryColor] = useState(profile?.primaryColor ?? '#6EE7B7');
  const [secondaryColor, setSecondaryColor] = useState(profile?.secondaryColor ?? '#3B82F6');
  const [primaryHex, setPrimaryHex] = useState(profile?.primaryColor ?? '#6EE7B7');
  const [secondaryHex, setSecondaryHex] = useState(profile?.secondaryColor ?? '#3B82F6');
  const [selected, setSelected] = useState<PresetId>(() =>
    activePreset(profile?.primaryColor ?? '#6EE7B7', profile?.secondaryColor ?? '#3B82F6'),
  );

  const [logoUrl, setLogoUrl] = useState<string | null>(profile?.logoUrl ?? null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [description, setDescription] = useState(profile?.description ?? '');
  const [contactEmail, setContactEmail] = useState(profile?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(profile?.contactPhone ?? '');
  const [facebookUrl, setFbUrl] = useState(profile?.facebookUrl ?? '');
  const [instagramUrl, setIgUrl] = useState(profile?.instagramUrl ?? '');

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Keep hex inputs in sync when colors change programmatically
  useEffect(() => { setPrimaryHex(primaryColor); }, [primaryColor]);
  useEffect(() => { setSecondaryHex(secondaryColor); }, [secondaryColor]);

  const selectPreset = (id: PresetId) => {
    setSelected(id);
    if (id !== 'custom') {
      const preset = THEME_PRESETS.find((p) => p.id === id)!;
      setPrimaryColor(preset.primary);
      setSecondaryColor(preset.secondary);
    }
  };

  const handlePrimaryHex = (val: string) => {
    const clean = val.startsWith('#') ? val : `#${val}`;
    setPrimaryHex(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      setPrimaryColor(clean.toUpperCase());
      setSelected('custom');
    }
  };

  const handleSecondaryHex = (val: string) => {
    const clean = val.startsWith('#') ? val : `#${val}`;
    setSecondaryHex(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      setSecondaryColor(clean.toUpperCase());
      setSelected('custom');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      let finalLogoUrl = logoUrl;
      if (pendingFile) {
        setUploadingLogo(true);
        finalLogoUrl = await uploadLogoToApi(gymId, pendingFile);
        setLogoUrl(finalLogoUrl);
        setLogoPreview(null);
        setPendingFile(null);
        setUploadingLogo(false);
      }
      await updateGymProfile(gymId, {
        primaryColor,
        secondaryColor,
        ...(finalLogoUrl ? { logoUrl: finalLogoUrl } : {}),
        ...(description ? { description } : {}),
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactPhone ? { contactPhone } : {}),
        ...(facebookUrl ? { facebookUrl } : {}),
        ...(instagramUrl ? { instagramUrl } : {}),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  const currentLogo = logoPreview ?? logoUrl;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Branding */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Branding</h2>

        {/* Logo */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium">Gym Logo</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
              {currentLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentLogo} alt="Gym logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">
                  {gymDetail.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-primary hover:underline font-medium"
              >
                {currentLogo ? 'Change logo' : 'Upload logo'}
              </button>
              {currentLogo && (
                <button
                  type="button"
                  onClick={() => { setLogoUrl(null); setLogoPreview(null); setPendingFile(null); }}
                  className="block text-xs text-muted-foreground hover:text-destructive transition"
                >
                  Remove
                </button>
              )}
              <p className="text-xs text-muted-foreground">JPG, PNG or SVG. Max 5 MB.</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          {pendingFile && (
            <p className="text-xs text-amber-400">New logo ready — will upload when you save.</p>
          )}
        </div>

        {/* Theme colour */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">Colour Theme</p>

          {/* Preset gradient cards */}
          <div className="grid grid-cols-4 gap-2">
            {THEME_PRESETS.map((preset) => {
              const isActive = selected === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  className={cn(
                    'rounded-lg overflow-hidden border-2 transition-all text-left',
                    isActive ? 'border-foreground shadow-md scale-[1.03]' : 'border-transparent hover:border-border',
                  )}
                >
                  <div
                    className="h-6 w-full"
                    style={{ background: `linear-gradient(to right, ${preset.primary}, ${preset.secondary})` }}
                  />
                  <div className={cn(
                    'px-2 py-1 text-xs font-medium',
                    isActive ? 'text-foreground bg-background' : 'text-muted-foreground bg-card',
                  )}>
                    {preset.name}
                  </div>
                </button>
              );
            })}

            {/* Custom card */}
            <button
              type="button"
              onClick={() => selectPreset('custom')}
              className={cn(
                'rounded-lg overflow-hidden border-2 transition-all text-left',
                selected === 'custom' ? 'border-foreground shadow-md scale-[1.03]' : 'border-transparent hover:border-border',
              )}
            >
              <div
                className="h-6 w-full"
                style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
              />
              <div className={cn(
                'px-2 py-1 text-xs font-medium',
                selected === 'custom' ? 'text-foreground bg-background' : 'text-muted-foreground bg-card',
              )}>
                Custom
              </div>
            </button>
          </div>

          {/* Custom pickers — only shown when Custom is selected */}
          {selected === 'custom' && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Primary</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => { setPrimaryColor(e.target.value.toUpperCase()); setSelected('custom'); }}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={primaryHex}
                    onChange={(e) => handlePrimaryHex(e.target.value)}
                    placeholder="#6EE7B7"
                    maxLength={7}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Secondary</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => { setSecondaryColor(e.target.value.toUpperCase()); setSelected('custom'); }}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={secondaryHex}
                    onChange={(e) => handleSecondaryHex(e.target.value)}
                    placeholder="#3B82F6"
                    maxLength={7}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live preview */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div
              className="rounded-lg px-6 py-3 inline-flex items-center gap-2 text-sm font-semibold text-black"
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            >
              <span>Check In</span>
              <span>⚡</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact info */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contact Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hello@yourgym.com"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+63 912 345 6789"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of your gym…"
            rows={3}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground resize-none"
          />
        </div>
      </section>

      {/* Social links */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Social Links</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Facebook URL</label>
            <input
              type="url"
              value={facebookUrl}
              onChange={(e) => setFbUrl(e.target.value)}
              placeholder="https://facebook.com/yourgym"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Instagram URL</label>
            <input
              type="url"
              value={instagramUrl}
              onChange={(e) => setIgUrl(e.target.value)}
              placeholder="https://instagram.com/yourgym"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      {/* Feedback + save */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-primary text-black text-sm font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {uploadingLogo ? 'Uploading logo…' : saving ? 'Saving…' : 'Save Changes'}
        </button>
        {success && <span className="text-sm text-emerald-400 font-medium">✓ Saved</span>}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
