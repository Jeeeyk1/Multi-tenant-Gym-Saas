'use client';

import { useState } from 'react';
import { updateRoleSetting, type RoleSetting } from '@/lib/actions/role-settings';
import { roleLabel } from '@/lib/roles';
import { useToast } from '@/components/ui/toast-provider';

/** The owner's switches for what Staff and Trainers may do in this gym. */
export function TeamPermissions({ settings }: { settings: RoleSetting[] | null }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Team permissions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Every gym runs differently. Choose what your team can do; changes apply within 15 minutes.
        </p>
      </div>
      {settings === null ? (
        <p className="text-sm text-muted-foreground">Could not load team permissions. Refresh to try again.</p>
      ) : (
        <ul className="divide-y divide-border">
          {settings.map((s) => (
            <SettingRow key={s.key} setting={s} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SettingRow({ setting }: { setting: RoleSetting }) {
  const [enabled, setEnabled] = useState(setting.enabled);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const id = `role-setting-${setting.key}`;

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setPending(true);
    const result = await updateRoleSetting(setting.key, next);
    setPending(false);
    if (result.error) {
      setEnabled(!next);
      toast.error(result.error);
    }
  }

  return (
    <li className="flex items-start justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {setting.label}
        </label>
        <p id={`${id}-description`} className="text-xs text-muted-foreground mt-0.5">
          {setting.description} Applies to: {roleLabel(setting.role)}.
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-describedby={`${id}-description`}
        disabled={pending}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60 ${
          enabled ? 'bg-primary border-primary' : 'bg-surface border-border'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${enabled ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </li>
  );
}
