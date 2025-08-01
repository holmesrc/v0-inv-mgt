import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const partNumber = url.searchParams.get('part')
    const quantity = url.searchParams.get('qty')
    const user = url.searchParams.get('user') || 'Unknown User'

    if (!action || !partNumber || !quantity) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Request</title>
          <meta charset="UTF-8">
        </head>
        <body>
          <h1>Invalid Request</h1>
          <p>Missing required parameters: action, part, or quantity</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    let actionText = ''
    let actionColor = ''
    let actionEmoji = ''

    switch (action) {
      case 'approve':
        actionText = 'Order Approved'
        actionColor = '#36a64f'
        actionEmoji = '✅'
        break
      case 'changes':
        actionText = 'Changes Requested'
        actionColor = '#ff9500'
        actionEmoji = '📝'
        break
      case 'deny':
        actionText = 'Order Denied'
        actionColor = '#ff0000'
        actionEmoji = '❌'
        break
      default:
        actionText = 'Unknown Action'
        actionColor = '#cccccc'
        actionEmoji = '❓'
    }

    // Send update to Slack
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      const message = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${actionEmoji} *${actionText}*\n\n*Part:* ${partNumber}\n*Quantity:* ${quantity} units\n*Decision by:* ${user}\n*Time:* ${new Date().toLocaleString()}`
            }
          }
        ],
        attachments: [
          {
            color: actionColor,
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

    // Return a clean confirmation page that auto-closes
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${actionText}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 500px; 
            margin: 50px auto; 
            padding: 20px;
            background: #f5f5f5;
            text-align: center;
          }
          .card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .emoji { 
            font-size: 64px; 
            margin-bottom: 20px; 
            display: block;
          }
          .title { 
            color: ${actionColor}; 
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: 600;
          }
          .details { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            text-align: left;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e9ecef;
          }
          .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }
          .label { font-weight: 600; color: #495057; }
          .value { color: #212529; }
          .success-message {
            color: #28a745;
            font-weight: 500;
            margin: 20px 0;
          }
          .auto-close {
            color: #6c757d;
            font-size: 14px;
            margin-top: 20px;
          }
        </style>
        <script>
          // Auto-close after 3 seconds
          setTimeout(function() {
            window.close();
          }, 3000);
        </script>
      </head>
      <body>
        <div class="card">
          <span class="emoji">${actionEmoji}</span>
          <h1 class="title">${actionText}</h1>
          
          <div class="details">
            <div class="detail-row">
              <span class="label">Part Number:</span>
              <span class="value">${partNumber}</span>
            </div>
            <div class="detail-row">
              <span class="label">Quantity:</span>
              <span class="value">${quantity} units</span>
            </div>
            <div class="detail-row">
              <span class="label">Decision by:</span>
              <span class="value">${user}</span>
            </div>
            <div class="detail-row">
              <span class="label">Time:</span>
              <span class="value">${new Date().toLocaleString()}</span>
            </div>
          </div>
          
          <div class="success-message">
            ✓ Notification sent to Slack channel
          </div>
          
          <div class="auto-close">
            This window will close automatically in 3 seconds
          </div>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('Order action error:', error)
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <meta charset="UTF-8">
      </head>
      <body>
        <h1>Error</h1>
        <p>Failed to process order action: ${error instanceof Error ? error.message : 'Unknown error'}</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }
}
