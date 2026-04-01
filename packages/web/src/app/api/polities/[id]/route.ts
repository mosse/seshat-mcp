import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const [polityRes, complexityRes, variablesRes] = await Promise.all([
    supabase.from('polities').select('*').eq('id', id).single(),
    supabase
      .from('complexity_scores')
      .select('*')
      .eq('polity_id', id)
      .order('century'),
    supabase
      .from('variable_values')
      .select('*')
      .eq('polity_id', id)
      .not('value_text', 'is', null)
      .limit(100),
  ]);

  if (polityRes.error) {
    return NextResponse.json({ error: 'Polity not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...polityRes.data,
    complexity_timeline: complexityRes.data ?? [],
    key_variables: variablesRes.data ?? [],
  });
}
