import { NextResponse } from 'next/server';

// Handle GET requests from Slack message links
export async function GET(request: Request) {
  try {
    // Get parameters from URL
    const url = new URL(request.url);
    const partNumber = url.searchParams.get('partNumber');
    const description = url.searchParams.get('description');
    const quantity = url.searchParams.get('quantity');
    const supplier = url.searchParams.get('supplier');
    
    if (!partNumber || !description || !quantity) {
      return new Response("Missing required parameters", { status: 400 });
    }
    
    // Create an HTML page that automatically submits the request
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sending Purchase Request</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-top: 20px; }
          h1 { color: #333; }
          .field { margin-bottom: 10px; }
          .label { font-weight: bold; }
          .value { margin-left: 10px; }
          .button { background-color: #4CAF50; border: none; color: white; padding: 10px 20px; 
                   text-align: center; text-decoration: none; display: inline-block; 
                   font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px; }
          .button:disabled { background-color: #cccccc; }
          .status { margin-top: 20px; padding: 10px; border-radius: 4px; }
          .success { background-color: #dff0d8; color: #3c763d; }
          .error { background-color: #f2dede; color: #a94442; }
        </style>
      </head>
      <body>
        <h1>Purchase Request</h1>
        <div class="card">
          <div class="field"><span class="label">Part Number:</span><span class="value">${partNumber}</span></div>
          <div class="field"><span class="label">Description:</span><span class="value">${description}</span></div>
          <div class="field"><span class="label">Quantity:</span><span class="value">${quantity}</span></div>
          <div class="field"><span class="label">Supplier:</span><span class="value">${supplier || 'N/A'}</span></div>
          
          <div style="margin-top: 20px;">
            <label for="requester">Your Name:</label>
            <input type="text" id="requester" style="margin-left: 10px; padding: 5px;">
          </div>
          
          <button id="sendButton" class="button" style="margin-top: 20px;">Send to Slack</button>
          <div id="status" class="status" style="display: none;"></div>
        </div>
        
        <script>
          document.getElementById('sendButton').addEventListener('click', async function() {
            const requester = document.getElementById('requester').value;
            if (!requester) {
              alert('Please enter your name');
              return;
            }
            
            this.disabled = true;
            this.textContent = 'Sending...';
            
            try {
              const response = await fetch('/api/slack/purchase-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  partNumber: '${partNumber}',
                  description: '${description}',
                  quantity: ${quantity},
                  supplier: '${supplier || ''}',
                  requester: requester
                })
              });
              
              const result = await response.json();
              
              const statusDiv = document.getElementById('status');
              statusDiv.style.display = 'block';
              
              if (result.success) {
                statusDiv.className = 'status success';
                statusDiv.textContent = '✅ Purchase request sent successfully to Slack!';
              } else {
                statusDiv.className = 'status error';
                statusDiv.textContent = '❌ Error: ' + (result.error || 'Unknown error');
                this.disabled = false;
                this.textContent = 'Try Again';
              }
            } catch (error) {
              const statusDiv = document.getElementById('status');
              statusDiv.style.display = 'block';
              statusDiv.className = 'status error';
              statusDiv.textContent = '❌ Error: ' + error.message;
              this.disabled = false;
              this.textContent = 'Try Again';
            }
          });
        </script>
      </body>
      </html>
    `;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error("Error handling purchase request:", error);
    return new Response("Error processing request", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { partNumber, description, quantity, supplier, requester } = data;
    
    // Format the message with blocks for better presentation
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "New Purchase Request",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Part Number:*\n${partNumber}`
            },
            {
              type: "mrkdwn",
              text: `*Quantity:*\n${quantity}`
            }
          ]
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Description:*\n${description}`
            },
            {
              type: "mrkdwn",
              text: `*Supplier:*\n${supplier || "N/A"}`
            }
          ]
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Requested By:*\n${requester || "System User"}`
            },
            {
              type: "mrkdwn",
              text: `*Date:*\n${new Date().toLocaleDateString()}`
            }
          ]
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Approve",
                emoji: true
              },
              style: "primary",
              value: `approve_${partNumber}`
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Deny",
                emoji: true
              },
              style: "danger",
              value: `deny_${partNumber}`
            }
          ]
        }
      ]
    };
    
    // Send to Slack webhook - using your existing webhook URL
    const webhookUrl = "https://hooks.slack.com/services/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";
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending purchase request to Slack:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}