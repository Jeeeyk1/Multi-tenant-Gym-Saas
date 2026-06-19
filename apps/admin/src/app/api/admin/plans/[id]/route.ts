import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await api.patch(`/v1/admin/plans/${id}`, body);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: err.statusCode ?? 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await api.delete(`/v1/admin/plans/${id}`);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: err.statusCode ?? 500 });
  }
}
