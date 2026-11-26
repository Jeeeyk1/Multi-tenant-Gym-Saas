import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await api.patch(`/v1/admin/billing-plans/${id}`, body);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const { message, statusCode } = err as { message?: string; statusCode?: number };
    return NextResponse.json({ message }, { status: statusCode ?? 500 });
  }
}
