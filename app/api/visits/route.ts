import { NextResponse } from 'next/server';
import { incrementVisits } from '../../../lib/visits';

export const dynamic = 'force-dynamic';

export async function POST() {
  const visits = await incrementVisits();
  return NextResponse.json({ visits }, { headers: { 'Cache-Control': 'no-store' } });
}
