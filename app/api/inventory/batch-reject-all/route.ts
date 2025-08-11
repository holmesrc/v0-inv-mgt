import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { batchId, approvedBy } = await request.json()

    // Update all pending changes in batch to rejected
    const { data: rejectedItems, error: updateError } = await supabase
      .from('pending_changes')
      .update({
        status: 'rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('item_data->>batch_id', batchId)
      .eq('status', 'pending')
      .select()

    if (updateError) {
      throw new Error(`Failed to reject batch: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Rejected entire batch: ${rejectedItems?.length || 0} items`,
      itemsRejected: rejectedItems?.length || 0
    })

  } catch (error) {
    console.error('Batch reject all error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
