import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { batchId, approvedBy } = await request.json()

    // Get all items in the batch
    const { data: batchItems, error: fetchError } = await supabase
      .from('pending_changes')
      .select('*')
      .eq('item_data->>batch_id', batchId)
      .eq('status', 'pending')

    if (fetchError) {
      throw new Error(`Failed to fetch batch items: ${fetchError.message}`)
    }

    if (!batchItems || batchItems.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No pending items found in batch' 
      }, { status: 404 })
    }

    // Approve all items and add to inventory
    const inventoryItems = batchItems.map(item => ({
      part_number: item.item_data.part_number,
      mfg_part_number: item.item_data.mfg_part_number || '',
      part_description: item.item_data.part_description,
      qty: parseInt(item.item_data.quantity) || 0,
      location: item.item_data.location,
      supplier: item.item_data.supplier || '',
      package: item.item_data.package || '',
      reorder_point: parseInt(item.item_data.reorder_point) || 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Add to inventory
    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert(inventoryItems)

    if (inventoryError) {
      throw new Error(`Failed to add items to inventory: ${inventoryError.message}`)
    }

    // Update all pending changes to approved
    const { error: updateError } = await supabase
      .from('pending_changes')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('item_data->>batch_id', batchId)
      .eq('status', 'pending')

    if (updateError) {
      throw new Error(`Failed to update pending changes: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Approved entire batch: ${batchItems.length} items added to inventory`,
      itemsApproved: batchItems.length
    })

  } catch (error) {
    console.error('Batch approve all error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
