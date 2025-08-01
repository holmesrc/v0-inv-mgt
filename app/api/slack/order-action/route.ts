import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const partNumber = url.searchParams.get('part')
    const quantity = url.searchParams.get('qty')
    const requester = url.searchParams.get('requester') || 'Unknown User'

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

    // Handle Approve - direct redirect to Slack workflow
    if (action === 'approve') {
      // Send approval notification to Slack first
      const webhookUrl = process.env.SLACK_WEBHOOK_URL
      if (webhookUrl) {
        const approvalMessage = {
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `✅ *Order Approved*\n\n*Part:* ${partNumber}\n*Quantity:* ${quantity} units\n*Requester:* ${requester}\n*Approved by:* Procurement Team\n*Time:* ${new Date().toLocaleString()}\n\n*Status:* Opening workflow for processing...`
              }
            }
          ],
          attachments: [
            {
              color: "#36a64f",
              blocks: []
            }
          ]
        }

        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(approvalMessage)
        })
      }

      // Redirect directly to Slack workflow
      return Response.redirect('https://slack.com/shortcuts/Ft07D5F2JPPW/61b58ca025323cfb63963bcc8321c031', 302)
    }

    // Handle Request Changes - show change options
    if (action === 'changes') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Request Changes</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .emoji { font-size: 64px; margin-bottom: 20px; text-align: center; }
            .title { color: #ff9500; margin-bottom: 20px; font-size: 24px; font-weight: 600; text-align: center; }
            .part-info { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .change-option {
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0;
              cursor: pointer;
              transition: all 0.2s;
            }
            .change-option:hover {
              border-color: #ff9500;
              background: #fff8f0;
            }
            .change-title { font-weight: 600; color: #495057; margin-bottom: 5px; }
            .change-desc { color: #6c757d; font-size: 14px; }
            .custom-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; }
            .form-group { margin-bottom: 15px; }
            .form-control { 
              width: 100%; 
              padding: 10px; 
              border: 1px solid #ced4da; 
              border-radius: 4px; 
              font-size: 14px;
            }
            .btn { 
              background: #ff9500; 
              color: white; 
              padding: 10px 20px; 
              border: none; 
              border-radius: 6px; 
              cursor: pointer;
              font-weight: 500;
            }
            .btn:hover { background: #e8860c; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="emoji">📝</div>
            <h1 class="title">Request Changes</h1>
            
            <div class="part-info">
              <strong>Order Details:</strong><br>
              Part: ${partNumber} | Quantity: ${quantity} units | Requester: ${requester}
            </div>
            
            <p>Select the type of change needed:</p>
            
            <div class="change-option" onclick="sendChangeMessage('availability')">
              <div class="change-title">🔍 Part Availability Issue</div>
              <div class="change-desc">Part is not available or discontinued</div>
            </div>
            
            <div class="change-option" onclick="sendChangeMessage('quantity')">
              <div class="change-title">📊 Quantity Adjustment Needed</div>
              <div class="change-desc">Requested quantity needs to be modified</div>
            </div>
            
            <div class="change-option" onclick="sendChangeMessage('supplier')">
              <div class="change-title">🏢 Supplier Information Required</div>
              <div class="change-desc">Need different supplier or supplier details</div>
            </div>
            
            <div class="change-option" onclick="sendChangeMessage('budget')">
              <div class="change-title">💰 Budget Approval Required</div>
              <div class="change-desc">Order exceeds budget limits</div>
            </div>
            
            <div class="change-option" onclick="sendChangeMessage('specification')">
              <div class="change-title">📋 Specification Clarification</div>
              <div class="change-desc">Need more details about part specifications</div>
            </div>
            
            <div class="custom-section">
              <div class="form-group">
                <label><strong>Custom Message:</strong></label>
                <textarea id="customMessage" class="form-control" rows="3" placeholder="Enter custom change request message..."></textarea>
              </div>
              <button class="btn" onclick="sendCustomMessage()">Send Custom Message</button>
            </div>
          </div>
          
          <script>
            function sendChangeMessage(type) {
              const messages = {
                availability: "The requested part (${partNumber}) is currently not available or may be discontinued. Please verify the part number or suggest an alternative.",
                quantity: "The requested quantity (${quantity} units) needs adjustment. Please review and resubmit with the correct quantity needed.",
                supplier: "Additional supplier information is required for ${partNumber}. Please specify preferred supplier or provide supplier details.",
                budget: "The order for ${partNumber} (${quantity} units) requires budget approval before processing. Please obtain necessary approvals.",
                specification: "Need clarification on specifications for ${partNumber}. Please provide additional details about requirements."
              };
              
              sendToSlack(messages[type]);
            }
            
            function sendCustomMessage() {
              const message = document.getElementById('customMessage').value;
              if (message.trim()) {
                sendToSlack(message);
              } else {
                alert('Please enter a custom message');
              }
            }
            
            function sendToSlack(message) {
              fetch('/api/slack/send-change-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  partNumber: '${partNumber}',
                  quantity: '${quantity}',
                  requester: '${requester}',
                  message: message
                })
              }).then(response => response.json())
                .then(data => {
                  if (data.success) {
                    alert('✅ Change request sent to ' + '${requester}');
                    window.close();
                  } else {
                    alert('❌ Failed to send message: ' + data.error);
                  }
                });
            }
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Handle Deny - show denial options
    if (action === 'deny') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Deny Order</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .emoji { font-size: 64px; margin-bottom: 20px; text-align: center; }
            .title { color: #dc3545; margin-bottom: 20px; font-size: 24px; font-weight: 600; text-align: center; }
            .part-info { background: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .denial-option {
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              border-radius: 8px;
              padding: 15px;
              margin: 10px 0;
              cursor: pointer;
              transition: all 0.2s;
            }
            .denial-option:hover {
              border-color: #dc3545;
              background: #fdf2f2;
            }
            .denial-title { font-weight: 600; color: #495057; margin-bottom: 5px; }
            .denial-desc { color: #6c757d; font-size: 14px; }
            .custom-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; }
            .form-group { margin-bottom: 15px; }
            .form-control { 
              width: 100%; 
              padding: 10px; 
              border: 1px solid #ced4da; 
              border-radius: 4px; 
              font-size: 14px;
            }
            .btn { 
              background: #dc3545; 
              color: white; 
              padding: 10px 20px; 
              border: none; 
              border-radius: 6px; 
              cursor: pointer;
              font-weight: 500;
            }
            .btn:hover { background: #c82333; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="emoji">❌</div>
            <h1 class="title">Deny Order</h1>
            
            <div class="part-info">
              <strong>Order to Deny:</strong><br>
              Part: ${partNumber} | Quantity: ${quantity} units | Requester: ${requester}
            </div>
            
            <p>Select the reason for denial:</p>
            
            <div class="denial-option" onclick="sendDenialMessage('budget')">
              <div class="denial-title">💰 Budget Constraints</div>
              <div class="denial-desc">Order exceeds available budget</div>
            </div>
            
            <div class="denial-option" onclick="sendDenialMessage('unnecessary')">
              <div class="denial-title">❓ Order Not Necessary</div>
              <div class="denial-desc">Current stock levels are adequate</div>
            </div>
            
            <div class="denial-option" onclick="sendDenialMessage('alternative')">
              <div class="denial-title">🔄 Alternative Available</div>
              <div class="denial-desc">Suitable alternative part exists in stock</div>
            </div>
            
            <div class="denial-option" onclick="sendDenialMessage('policy')">
              <div class="denial-title">📋 Policy Violation</div>
              <div class="denial-desc">Order doesn't meet company purchasing policies</div>
            </div>
            
            <div class="denial-option" onclick="sendDenialMessage('timing')">
              <div class="denial-title">⏰ Poor Timing</div>
              <div class="denial-desc">Not the right time for this purchase</div>
            </div>
            
            <div class="custom-section">
              <div class="form-group">
                <label><strong>Custom Denial Reason:</strong></label>
                <textarea id="customReason" class="form-control" rows="3" placeholder="Enter custom denial reason..."></textarea>
              </div>
              <button class="btn" onclick="sendCustomDenial()">Send Denial</button>
            </div>
          </div>
          
          <script>
            function sendDenialMessage(type) {
              const messages = {
                budget: "Your order for ${partNumber} (${quantity} units) has been denied due to budget constraints. Please review budget allocation or request approval for additional funds.",
                unnecessary: "Your order for ${partNumber} (${quantity} units) has been denied as current stock levels are adequate. Please verify actual need before reordering.",
                alternative: "Your order for ${partNumber} (${quantity} units) has been denied. A suitable alternative is available in current stock. Please check with inventory team.",
                policy: "Your order for ${partNumber} (${quantity} units) has been denied as it doesn't meet company purchasing policies. Please review procurement guidelines.",
                timing: "Your order for ${partNumber} (${quantity} units) has been denied due to timing constraints. Please resubmit at a more appropriate time."
              };
              
              sendToSlack(messages[type]);
            }
            
            function sendCustomDenial() {
              const reason = document.getElementById('customReason').value;
              if (reason.trim()) {
                const message = \`Your order for ${partNumber} (\${${quantity}} units) has been denied. Reason: \${reason}\`;
                sendToSlack(message);
              } else {
                alert('Please enter a denial reason');
              }
            }
            
            function sendToSlack(message) {
              fetch('/api/slack/send-denial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  partNumber: '${partNumber}',
                  quantity: '${quantity}',
                  requester: '${requester}',
                  message: message
                })
              }).then(response => response.json())
                .then(data => {
                  if (data.success) {
                    alert('✅ Denial sent to ' + '${requester}');
                    window.close();
                  } else {
                    alert('❌ Failed to send denial: ' + data.error);
                  }
                });
            }
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    return new Response('Unknown action', { status: 400 })

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
