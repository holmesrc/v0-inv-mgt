import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Keepalive successful',
      recordCount: data?.length || 0
    });
  } catch (error) {
    console.error('Keepalive error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : JSON.stringify(error, null, 2)
    }, { status: 500 });
  }
}
