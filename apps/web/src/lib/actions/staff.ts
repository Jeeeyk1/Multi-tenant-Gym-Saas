'use server';

import { revalidatePath } from 'next/cache';
import { StaffRole } from '@gym-saas/contracts';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/format-error';

export async function inviteStaff(
  gymId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; inviteToken?: string }> {
  const fullName = (formData.get('fullName') as string | null)?.trim() ?? '';
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
  const phone = (formData.get('phone') as string | null)?.trim() || undefined;
  const roleValue = formData.get('role');
  const role = Object.values(StaffRole).find((r) => r === roleValue);

  if (!fullName || !email) return { error: 'Full name and email are required.' };
  if (!role) return { error: 'Choose a role.' };

  try {
    const result = await api.post<{ staffId: string; inviteToken: string }>(
      `/gyms/${gymId}/staff`,
      { fullName, email, phone, role },
    );
    revalidatePath('/dashboard/staff');
    return { inviteToken: result.inviteToken };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'STAFF_ALREADY_EXISTS') return { error: 'This person is already a staff member.' };
    if (e.code === 'OWNER_ROLE_PROTECTED') return { error: 'Only an owner can invite another owner.' };
    return { error: formatApiError(err, 'Failed to invite staff.') };
  }
}

export async function deactivateStaff(gymId: string, staffId: string): Promise<{ error?: string }> {
  try {
    await api.delete(`/gyms/${gymId}/staff/${staffId}`);
    revalidatePath('/dashboard/staff');
    return {};
  } catch (err: unknown) {
    return { error: formatApiError(err, 'Failed to deactivate staff.') };
  }
}

export async function assignRole(
  gymId: string,
  staffId: string,
  roleId: string,
): Promise<{ error?: string }> {
  try {
    await api.post(`/gyms/${gymId}/staff/${staffId}/roles`, { roleId });
    revalidatePath('/dashboard/staff');
    return {};
  } catch (err: unknown) {
    return { error: formatApiError(err, 'Failed to assign role.') };
  }
}

export async function removeRole(
  gymId: string,
  staffId: string,
  roleId: string,
): Promise<{ error?: string }> {
  try {
    await api.delete(`/gyms/${gymId}/staff/${staffId}/roles/${roleId}`);
    revalidatePath('/dashboard/staff');
    return {};
  } catch (err: unknown) {
    return { error: formatApiError(err, 'Failed to remove role.') };
  }
}
