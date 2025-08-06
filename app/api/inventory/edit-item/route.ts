import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { itemId, changes, requester } = await request.json()

    console.log('Edit item API called with:', { itemId, requester })

    if (!itemId || !changes || !requester) {
      console.log('Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the existing item details
    const { data: existingItem, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', itemId)
      .single()

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Database error: ' + fetchError.message },
        { status: 500 }
      )
    }

    if (!existingItem) {
      console.log('Item not found')
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    console.log('Existing item found:', existingItem['Part number'])

    // Create a pending change record with proper data structure for display
    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert({
        change_type: 'add',  // Using allowed value
        requested_by: requester,
        status: 'pending',
        item_data: {
          // Fields for display system
          part_number: changes.partNumber,
          mfg_part_number: changes.mfgPartNumber,
          part_description: changes.description,
          quantity: parseInt(changes.quantity),
          location: changes.location,
          supplier: changes.supplier,
          package: changes.package,
          reorder_point: parseInt(changes.reorderPoint),
          
          // Additional data for processing
          item_id: itemId,
          action_type: 'edit_item',
          current_data: existingItem,
          proposed_changes: changes
        }
      })

    if (pendingError) {
      console.error('Pending change insert error:', pendingError)
      return NextResponse.json(
        { success: false, error: 'Database insert failed: ' + pendingError.message },
        { status: 500 }
      )
    }

    console.log('Edit item request completed successfully')

    // Send Slack notification for the edit request
    try {
      const slackResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-inv-mgt.vercel.app'}/api/slack/send-approval-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeType: 'update',
          itemData: {
            part_number: changes.partNumber,
            part_description: changes.description,
            qty: parseInt(changes.quantity),
            location: changes.location,
            supplier: changes.supplier,
            package: changes.package,
            reorder_point: parseInt(changes.reorderPoint)
          },
          originalData: {
            part_number: existingItem['Part number'],
            part_description: existingItem['Part description'],
            qty: existingItem.QTY,
            location: existingItem.Location,
            supplier: existingItem.Supplier,
            package: existingItem.Package,
            reorder_point: existingItem.reorderPoint
          },
          requestedBy: requester,
          changeId: `edit-${itemId}-${Date.now()}`
        })
      })

      if (!slackResponse.ok) {
        console.error('Slack notification failed:', await slackResponse.text())
        // Don't fail the whole request if Slack fails
      } else {
        console.log('Slack notification sent successfully')
      }
    } catch (slackError) {
      console.error('Error sending Slack notification:', slackError)
      // Don't fail the whole request if Slack fails
    }

    return NextResponse.json({
      success: true,
      message: 'Item changes submitted for approval'
    })

  } catch (error) {
    console.error('Edit item API error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
