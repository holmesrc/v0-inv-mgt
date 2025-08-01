# Slack Workflow Integration Setup Guide

## Current Issue
The workflow link in Slack messages doesn't pre-fill the form because Slack workflows require specific integration methods to populate data automatically.

## Solution Options

### Option 1: Workflow Webhook (Recommended)
This allows direct triggering of your workflow with pre-filled data.

#### Steps:
1. **Open your Slack workflow** (Purchase Request - Ft07D5F2JPPW)
2. **Go to workflow settings** → **Webhooks**
3. **Enable "Accept webhook requests"**
4. **Copy the webhook URL** (looks like: `https://hooks.slack.com/workflows/...`)
5. **Add to Vercel environment variables**:
   - Variable: `SLACK_WORKFLOW_WEBHOOK_URL`
   - Value: Your workflow webhook URL

#### Benefits:
- ✅ Automatically triggers workflow with pre-filled data
- ✅ No manual copying required
- ✅ Seamless user experience

### Option 2: Enhanced Slack Message (Current Implementation)
Provides formatted data that's easy to copy into the workflow form.

#### Features:
- 📋 All part data formatted in a code block for easy copying
- 🔗 Direct workflow link
- 📊 Clear visual formatting
- ⚡ Action buttons for workflow management

#### User Process:
1. Click "Send to Slack" on low-stock page
2. Go to Slack and find the reorder message
3. Copy the formatted data from the code block
4. Click "Open Workflow" button
5. Paste data into workflow form
6. Submit purchase request

### Option 3: Slack App Integration (Advanced)
Create a custom Slack app with interactive components.

#### Requirements:
- Custom Slack app development
- OAuth token management
- Interactive component handling
- More complex setup

## Current Implementation

The system now sends a comprehensive Slack message with:

```
🔄 Reorder Request

Part Number: ABC-123
Description: Widget Assembly
Current Stock: 2
Reorder Point: 10
Supplier: TBD
Urgency: 🟡 MEDIUM - Low Stock
Requested By: System

📋 Copy this data for your workflow:

```
Part Number: ABC-123
Description: Widget Assembly
Current Quantity: 2
Reorder Point: 10
Supplier: TBD
Urgency: Medium
Status: Low Stock
Requested By: System
Date: 8/1/2025
Time: 2:30:00 PM
```

🔗 To complete this reorder:
1. Search for `Purchase Request` in Slack workflows
2. Copy the data above into the workflow form
3. Submit the purchase request

[✅ Mark as Ordered] [⏭️ Skip for Now] [🔄 Open Workflow]
```

## Recommended Next Steps

1. **Try Option 1** (Workflow Webhook) for automatic pre-filling
2. **If that's not available**, the current Option 2 provides an excellent user experience
3. **Test the current implementation** - it should be much easier to use than manual entry

## Environment Variables Needed

```bash
# Required
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...

# Optional (for automatic workflow triggering)
SLACK_WORKFLOW_WEBHOOK_URL=https://hooks.slack.com/workflows/...
```

## Testing

1. Update your Slack webhook URL in Vercel
2. Test the reorder button on your low-stock page
3. Check Slack for the formatted message
4. Try copying the data into your workflow form
