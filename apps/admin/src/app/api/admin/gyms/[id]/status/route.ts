import axios from 'axios';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = `${process.env.API_URL ?? 'http://localhost:3000'}/api`;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get('admin_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  try {
    const { data, status } = await axios.patch(`${API_BASE}/v1/admin/gyms/${id}/status`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(data as object, { status });
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      return NextResponse.json(err.response.data as object, { status: err.response.status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
