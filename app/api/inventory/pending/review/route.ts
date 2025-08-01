import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const { changeId, action, notes } = await request.json()

    if (!changeId || !action) {
      return NextResponse.json({
        error: 'Missing required fields: changeId and action'
      }, { status: 400 })
    }

    // Get the pending change
    const { data: change, error: fetchError } = await supabase
      .from('pending_changes')
      .select('*')
      .eq('id', changeId)
      .single()

    if (fetchError || !change) {
      return NextResponse.json({
        error: 'Change not found'
      }, { status: 404 })
    }

    if (change.status !== 'pending') {
      return NextResponse.json({
        error: 'Change has already been reviewed'
      }, { status: 400 })
    }

    // Update the change status
    const { error: updateError } = await supabase
      .from('pending_changes')
      .update({
        status: action,
        reviewed_by: 'Admin', // You might want to get this from auth
        review_date: new Date().toISOString(),
        review_notes: notes
      })
      .eq('id', changeId)

    if (updateError) {
      throw updateError
    }

    // If approved, apply the change to the main inventory
    if (action === 'approved') {
      const itemData = change.item_data

      if (change.change_type === 'add') {
        // Add new item
        const { error: insertError } = await supabase
          .from('inventory')
          .insert({
            part_number: itemData.part_number,
            mfg_part_number: itemData.mfg_part_number || '',
            part_description: itemData.part_description,
            quantity: itemData.quantity,
            location: itemData.location,
            supplier: itemData.supplier,
            package: itemData.package,
            reorder_point: itemData.reorder_point || 10
          })

        if (insertError) {
          throw insertError
        }
      } else if (change.change_type === 'update') {
        // Update existing item
        const { error: updateInventoryError } = await supabase
          .from('inventory')
          .update({
            mfg_part_number: itemData.mfg_part_number || '',
            part_description: itemData.part_description,
            quantity: itemData.quantity,
            location: itemData.location,
            supplier: itemData.supplier,
            package: itemData.package,
            reorder_point: itemData.reorder_point || 10
          })
          .eq('part_number', itemData.part_number)

        if (updateInventoryError) {
          throw updateInventoryError
        }
      } else if (change.change_type === 'delete') {
        // Delete item
        const { error: deleteError } = await supabase
          .from('inventory')
          .delete()
          .eq('part_number', change.original_data.part_number)

        if (deleteError) {
          throw deleteError
        }
      }
    }

    console.log(`✅ Change ${changeId} ${action} successfully`)

    return NextResponse.json({
      success: true,
      message: `Change ${action} successfully`,
      changeId
    })

  } catch (error) {
    console.error('Error reviewing change:', error)
    return NextResponse.json({
      error: 'Failed to review change',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
