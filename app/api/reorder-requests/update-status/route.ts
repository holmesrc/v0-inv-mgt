import { NextRequest, NextResponse } from "next/server"

// Import the same storage (in production, use a database)
const fs = require('fs')
const path = require('path')

// Simple file-based storage for persistence
const STORAGE_FILE = path.join(process.cwd(), 'data', 'reorder-requests.json')

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function loadRequests() {
  try {
    ensureDataDir()
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading requests:', error)
  }
  return []
}

function saveRequests(requests: any[]) {
  try {
    ensureDataDir()
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(requests, null, 2))
  } catch (error) {
    console.error('Error saving requests:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requestId, status, statusNotes } = await request.json()

    if (!requestId || !status) {
      return NextResponse.json({
        error: 'Missing required fields: requestId and status'
      }, { status: 400 })
    }

    // Load current requests
    const requests = loadRequests()
    
    // Find and update the request
    const requestIndex = requests.findIndex((req: any) => req.id === requestId)
    
    if (requestIndex === -1) {
      return NextResponse.json({
        error: 'Request not found'
      }, { status: 404 })
    }

    const oldStatus = requests[requestIndex].status
    requests[requestIndex].status = status
    requests[requestIndex].statusNotes = statusNotes
    requests[requestIndex].updatedAt = new Date().toISOString()

    // Save updated requests
    saveRequests(requests)

    const updatedRequest = requests[requestIndex]

    // Send notification to Slack
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      const statusEmojis = {
        pending: '⏳',
        approved: '✅',
        ordered: '🛒',
        received: '📦',
        denied: '❌'
      }

      const statusColors = {
        pending: '#ffc107',
        approved: '#28a745',
        ordered: '#6f42c1',
        received: '#20c997',
        denied: '#dc3545'
      }

      const emoji = statusEmojis[status as keyof typeof statusEmojis] || '📋'
      const color = statusColors[status as keyof typeof statusColors] || '#6c757d'

      const message = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${emoji} Reorder Request Status Update`,
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*To:* ${updatedRequest.requester}\n*Re:* Purchase request for ${updatedRequest.partNumber}`
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Part Number:*\n${updatedRequest.partNumber}`
              },
              {
                type: "mrkdwn",
                text: `*Quantity:*\n${updatedRequest.quantity} units`
              },
              {
                type: "mrkdwn",
                text: `*Previous Status:*\n${oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1)}`
              },
              {
                type: "mrkdwn",
                text: `*New Status:*\n${emoji} ${status.charAt(0).toUpperCase() + status.slice(1)}`
              }
            ]
          },
          ...(statusNotes ? [{
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*📝 Status Notes:*\n${statusNotes}`
            }
          }] : []),
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `📅 Updated: ${new Date().toLocaleString()} | 🏷️ ${updatedRequest.partNumber} | 👤 ${updatedRequest.requester}`
              }
            ]
          }
        ],
        attachments: [
          {
            color: color,
            blocks: []
          }
        ]
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })
    }

    console.log(`✅ Status updated for request ${requestId}: ${oldStatus} → ${status}`)

    return NextResponse.json({
      success: true,
      message: 'Status updated and requester notified',
      request: updatedRequest
    })

  } catch (error) {
    console.error('Error updating request status:', error)
    return NextResponse.json({
      error: 'Failed to update request status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
