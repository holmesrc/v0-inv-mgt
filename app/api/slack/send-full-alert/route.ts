import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { items, labName, labSlug } = await request.json()

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: "Slack webhook URL not configured" }, { status: 500 })
    }

    const appUrl = process.env.APP_URL || "https://v0-inv-mgt.vercel.app"
    const labLabel = labName || "Unknown Lab"

    // Map raw inventory items to consistent shape
    const mappedItems = items.map((item: any) => ({
      partNumber: item.partNumber || item["Part number"] || "Unknown",
      description: item.description || item["Part description"] || "No description",
      currentStock: item.currentStock ?? item.QTY ?? 0,
      reorderPoint: item.reorderPoint || 10,
      supplier: item.supplier || item.Supplier || "N/A",
      location: item.location || item.Location || "N/A",
    }))

    const displayItems = mappedItems.slice(0, 10)
    const totalCount = mappedItems.length
    const remainingCount = totalCount - displayItems.length

    let message = `🚨 *Complete Low Stock Report — ${labLabel}* 🚨\n\n`
    message += `*${totalCount} item${totalCount === 1 ? '' : 's'}* are below their reorder points:\n\n`

    displayItems.forEach((item: any, index: number) => {
      const baseUrl = `${appUrl}/api/slack/purchase-request`
      const params = new URLSearchParams({
        partNumber: item.partNumber,
        description: item.description,
        quantity: String(Math.max(item.reorderPoint - item.currentStock + 5, 1)),
        supplier: item.supplier,
      })
      const purchaseRequestUrl = `${baseUrl}?${params.toString()}`

      message += `${index + 1}. *${item.partNumber}* - ${item.description}\n`
      message += `   Current: ${item.currentStock} | Reorder: ${item.reorderPoint}\n`
      message += `   Supplier: ${item.supplier} | Location: ${item.location}\n`
      message += `   🛒 <${purchaseRequestUrl}|Create Purchase Request>\n\n`
    })

    if (remainingCount > 0) {
      const lowStockUrl = `${appUrl}/${labSlug || ""}/low-stock`
      message += `_...and ${remainingCount} more item${remainingCount === 1 ? '' : 's'}_ 🔗 <${lowStockUrl}|View ${labLabel} Low Stock Items>`
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        channel: "#inventory-alerts",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slack API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending full alert:", error)
    return NextResponse.json(
      {
        error: "Failed to send full alert",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
