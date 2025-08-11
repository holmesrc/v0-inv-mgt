import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { batchId, itemIndex, status, approvedBy } = await request.json()

    // Get all items in the batch
    const { data: batchItems, error: fetchError } = await supabase
      .from('pending_changes')
      .select('*')
      .eq('item_data->>batch_id', batchId)
      .order('created_at')

    if (fetchError) {
      throw new Error(`Failed to fetch batch items: ${fetchError.message}`)
    }

    if (!batchItems || itemIndex >= batchItems.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Item not found in batch' 
      }, { status: 404 })
    }

    const item = batchItems[itemIndex]
    
    if (status === 'approved') {
      // Add to inventory
      const inventoryItem = {
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
      }

      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert([inventoryItem])

      if (inventoryError) {
        throw new Error(`Failed to add item to inventory: ${inventoryError.message}`)
      }
    }

    // Update the item status in item_data
    const currentStatuses = item.item_data.item_statuses || {}
    currentStatuses[itemIndex] = status

    const { error: updateError } = await supabase
      .from('pending_changes')
      .update({
        item_data: {
          ...item.item_data,
          item_statuses: currentStatuses
        },
        ...(status === 'approved' ? {
          approved_by: approvedBy,
          approved_at: new Date().toISOString()
        } : {})
      })
      .eq('id', item.id)

    if (updateError) {
      throw new Error(`Failed to update item status: ${updateError.message}`)
    }

    // Check if all items in batch are processed
    const allStatuses = Object.values(currentStatuses)
    const allProcessed = allStatuses.length === batchItems.length && 
                        allStatuses.every(s => s === 'approved' || s === 'rejected')

    if (allProcessed) {
      // Update the main batch record status
      const hasApproved = allStatuses.some(s => s === 'approved')
      const batchStatus = hasApproved ? 'partially_approved' : 'rejected'
      
      // Find the main batch record (the one with is_batch: true)
      const mainBatchRecord = batchItems.find(b => b.item_data.is_batch === true)
      if (mainBatchRecord) {
        await supabase
          .from('pending_changes')
          .update({ status: batchStatus })
          .eq('id', mainBatchRecord.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Item ${status} successfully`,
      allProcessed
    })

  } catch (error) {
    console.error('Batch item approve error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
