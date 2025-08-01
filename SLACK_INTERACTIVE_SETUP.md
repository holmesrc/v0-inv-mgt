# Slack Interactive Components Setup

## Why Buttons Don't Work Yet

The Approve/Deny/Request Changes buttons in Slack are currently just visual elements. To make them functional, you need to configure Slack to send button click events to your application.

## Setup Steps

### 1. Create/Configure Slack App

1. **Go to https://api.slack.com/apps**
2. **Find your existing app** or **create a new one**
3. **Select your workspace**

### 2. Enable Interactive Components

1. **In your Slack app settings**, go to **"Interactive Components"**
2. **Turn on "Interactivity"**
3. **Set Request URL to:**
   ```
   https://v0-inv-mgt.vercel.app/api/slack/interactive
   ```
4. **Click "Save Changes"**

### 3. Configure OAuth & Permissions

1. **Go to "OAuth & Permissions"**
2. **Add these Bot Token Scopes:**
   - `chat:write` (to send messages)
   - `chat:write.public` (to write to channels)
   - `commands` (if using slash commands)

3. **Install/Reinstall the app** to your workspace
4. **Copy the "Bot User OAuth Token"** (starts with `xoxb-`)

### 4. Update Environment Variables

Add to your Vercel environment variables:

```bash
# Existing
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...

# New (optional, for enhanced features)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
```

### 5. Test the Integration

1. **Deploy your changes** (already done)
2. **Create a reorder request** from your low-stock page
3. **Check Slack** for the message with buttons
4. **Click a button** - it should now update the message!

## What Happens When Buttons Are Clicked

### ✅ Approve Order
- Message updates to show "Order Approved by [User]"
- Green color indicator
- Shows next steps for procurement

### 📝 Request Changes  
- Message updates to show "Changes Requested by [User]"
- Orange color indicator
- Indicates review and resubmission needed

### ❌ Deny Order
- Message updates to show "Order Denied by [User]"  
- Red color indicator
- Shows denial reason

## Troubleshooting

### Buttons Still Don't Work?

1. **Check Slack App Settings:**
   - Interactive Components enabled?
   - Correct Request URL?
   - App installed to workspace?

2. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Functions → View Function Logs
   - Look for `/api/slack/interactive` requests

3. **Test the Endpoint:**
   ```bash
   curl -X POST https://v0-inv-mgt.vercel.app/api/slack/interactive \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "payload={\"type\":\"test\"}"
   ```

### Common Issues

- **"URL verification failed"**: Make sure the endpoint is deployed and accessible
- **"Invalid request signature"**: Slack signing secret verification (can be added later)
- **Buttons appear but don't respond**: Check that Request URL is correct

## Security Enhancement (Optional)

For production, you should verify Slack request signatures:

1. **Get your Slack app's "Signing Secret"**
2. **Add to environment variables:**
   ```bash
   SLACK_SIGNING_SECRET=your-signing-secret-here
   ```
3. **Update the interactive endpoint** to verify signatures

## Current Status

✅ Interactive endpoint created (`/api/slack/interactive`)  
✅ Button click handling implemented  
✅ Message updating functionality ready  
⏳ **Next: Configure your Slack app settings**  

Once you complete the Slack app configuration, your buttons will be fully functional!
