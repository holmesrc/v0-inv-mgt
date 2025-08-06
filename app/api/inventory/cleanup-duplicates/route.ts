import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { action, location, requester } = await request.json()

    if (!requester) {
      return NextResponse.json(
        { success: false, error: 'Requester name is required' },
        { status: 400 }
      )
    }

    if (action === 'list_duplicates') {
      // Find all items at the specified location
      const { data: items, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('Location', location)
        .order('QTY', { ascending: true }) // Show 0 qty items first

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Database error: ' + error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        items: items,
        message: `Found ${items.length} items at location ${location}`
      })
    }

    if (action === 'delete_by_id') {
      const { itemId } = await request.json()
      
      if (!itemId) {
        return NextResponse.json(
          { success: false, error: 'Item ID is required' },
          { status: 400 }
        )
      }

      // Get item details first
      const { data: item, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', itemId)
        .single()

      if (fetchError || !item) {
        return NextResponse.json(
          { success: false, error: 'Item not found' },
          { status: 404 }
        )
      }

      // Delete the item directly (cleanup operation)
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId)

      if (deleteError) {
        return NextResponse.json(
          { success: false, error: 'Delete failed: ' + deleteError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Deleted item: ${item['Part number']} (QTY: ${item.QTY}) at ${item.Location}`
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Cleanup API error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Find all locations with multiple entries
    const { data: items, error } = await supabase
      .from('inventory')
      .select('Location, "Part number", QTY, id')
      .order('Location')

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Database error: ' + error.message },
        { status: 500 }
      )
    }

    // Group by location and part number to find duplicates
    const locationGroups: { [key: string]: any[] } = {}
    
    items.forEach(item => {
      const key = `${item.Location}-${item['Part number']}`
      if (!locationGroups[key]) {
        locationGroups[key] = []
      }
      locationGroups[key].push(item)
    })

    // Find locations with duplicates
    const duplicates = Object.entries(locationGroups)
      .filter(([key, items]) => items.length > 1)
      .map(([key, items]) => ({
        location: items[0].Location,
        partNumber: items[0]['Part number'],
        count: items.length,
        items: items
      }))

    return NextResponse.json({
      success: true,
      duplicates: duplicates,
      message: `Found ${duplicates.length} locations with duplicate entries`
    })

  } catch (error) {
    console.error('Cleanup GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
