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
        <head><title>Invalid Request</title></head>
        <body>
          <h1>❌ Invalid Request</h1>
          <p>Missing required parameters: action, part, or quantity</p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
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

    // Return a confirmation page
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${actionText}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: #f5f5f5;
          }
          .card {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .emoji { font-size: 48px; margin-bottom: 20px; }
          .title { color: ${actionColor}; margin-bottom: 10px; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .button { 
            background: ${actionColor}; 
            color: white; 
            padding: 10px 20px; 
            border: none; 
            border-radius: 6px; 
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="emoji">${actionEmoji}</div>
          <h1 class="title">${actionText}</h1>
          <div class="details">
            <strong>Part Number:</strong> ${partNumber}<br>
            <strong>Quantity:</strong> ${quantity} units<br>
            <strong>Decision by:</strong> ${user}<br>
            <strong>Time:</strong> ${new Date().toLocaleString()}
          </div>
          <p>A notification has been sent to the Slack channel.</p>
          <a href="javascript:window.close()" class="button">Close Window</a>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('❌ Order action error:', error)
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body>
        <h1>❌ Error</h1>
        <p>Failed to process order action: ${error instanceof Error ? error.message : 'Unknown error'}</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
