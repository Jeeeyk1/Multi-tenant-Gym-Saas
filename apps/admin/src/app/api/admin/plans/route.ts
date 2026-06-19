import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function GET() {
  try {
    const data = await api.get('/v1/admin/plans');
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: err.statusCode ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await api.post('/v1/admin/plans', body);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: err.statusCode ?? 500 });
  }
}
