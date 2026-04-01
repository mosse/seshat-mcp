import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');
  const region = searchParams.get('region');
  const year = searchParams.get('year');
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);

  const supabase = getSupabase();
  let q = supabase.from('polities').select('*', { count: 'exact' });

  if (query) {
    q = q.ilike('name', `%${query}%`);
  }
  if (region) {
    q = q.eq('region', region);
  }
  if (year) {
    const y = parseInt(year, 10);
    q = q.lte('start_year', y).gte('end_year', y);
  }

  q = q.order('name').limit(limit);

  const { data, count, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ polities: data ?? [], total_count: count ?? 0 });
}
