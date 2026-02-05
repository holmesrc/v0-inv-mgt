import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test 1: Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      }, { status: 500 });
    }

    // Test 2: Try to connect to Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Supabase query failed',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Keepalive test successful',
      recordCount: data?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Exception caught',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
