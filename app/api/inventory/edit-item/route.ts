import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { itemId, changes, requester } = await request.json()

    console.log('Edit item request received:', { itemId, requester, changes })

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

    // Create a simple pending change record following the same pattern as add-stock
    const pendingData = {
      change_type: 'edit_item',
      requester: requester,
      status: 'pending',
      item_data: {
        item_id: itemId,
        part_number: existingItem['Part number'],
        part_description: existingItem['Part description'],
        current_data: existingItem,
        proposed_changes: changes
      }
    }

    console.log('Inserting pending change...')

    const { error: pendingError } = await supabase
      .from('pending_changes')
      .insert(pendingData)

    if (pendingError) {
      console.error('Pending change insert error:', pendingError)
      return NextResponse.json(
        { success: false, error: 'Database insert failed: ' + pendingError.message },
        { status: 500 }
      )
    }

    console.log('Edit item request completed successfully')

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
