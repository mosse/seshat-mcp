import { NextResponse } from 'next/server';
import { SCENARIOS } from '@seshat/shared';

export async function GET() {
  return NextResponse.json({ scenarios: SCENARIOS });
}
