import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const { changeIds, action, notes } = await request.json()

    if (!changeIds || !Array.isArray(changeIds) || !action) {
      return NextResponse.json({
        error: 'Missing required fields: changeIds (array) and action'
      }, { status: 400 })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const changeId of changeIds) {
      try {
        // Get the pending change
        const { data: change, error: fetchError } = await supabase
          .from('pending_changes')
          .select('*')
          .eq('id', changeId)
          .single()

        if (fetchError || !change) {
          errors.push(`Change ${changeId} not found`)
          errorCount++
          continue
        }

        if (change.status !== 'pending') {
          errors.push(`Change ${changeId} has already been reviewed`)
          errorCount++
          continue
        }

        // Update the change status
        const { error: updateError } = await supabase
          .from('pending_changes')
          .update({
            status: action,
            reviewed_by: 'Admin',
            review_date: new Date().toISOString(),
            review_notes: notes
          })
          .eq('id', changeId)

        if (updateError) {
          errors.push(`Failed to update change ${changeId}: ${updateError.message}`)
          errorCount++
          continue
        }

        // If approved, apply the change to the main inventory
        if (action === 'approved') {
          const itemData = change.item_data

          if (change.change_type === 'add') {
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
              errors.push(`Failed to add item ${itemData.part_number}: ${insertError.message}`)
              errorCount++
              continue
            }
          } else if (change.change_type === 'update') {
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
              errors.push(`Failed to update item ${itemData.part_number}: ${updateInventoryError.message}`)
              errorCount++
              continue
            }
          } else if (change.change_type === 'delete') {
            const { error: deleteError } = await supabase
              .from('inventory')
              .delete()
              .eq('part_number', change.original_data.part_number)

            if (deleteError) {
              errors.push(`Failed to delete item ${change.original_data.part_number}: ${deleteError.message}`)
              errorCount++
              continue
            }
          }
        }

        successCount++
      } catch (error) {
        errors.push(`Error processing change ${changeId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        errorCount++
      }
    }

    console.log(`✅ Batch review completed: ${successCount} successful, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: `Batch review completed: ${successCount} successful, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error in batch review:', error)
    return NextResponse.json({
      error: 'Failed to process batch review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
