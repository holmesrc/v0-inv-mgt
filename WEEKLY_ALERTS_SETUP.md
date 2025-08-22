# 📅 Weekly Automatic Alerts Setup

## **Overview**
Automatic weekly low stock alerts are sent every **Monday at 10:00 AM EST** via Slack.

## **🔧 Setup Instructions**

### **1. Environment Variables**
Add to your Vercel environment variables:

```bash
CRON_SECRET=your_random_secret_here
```

**Generate a random secret:**
```bash
# Use any of these methods:
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Or use: https://generate-secret.vercel.app/32
```

### **2. Vercel Deployment**
The cron job is automatically configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-alert",
      "schedule": "0 14 * * 1"
    }
  ]
}
```

**Schedule Explanation:**
- `0 14 * * 1` = Every Monday at 14:00 UTC (10:00 AM EST)
- Cron format: `minute hour day month dayOfWeek`

### **3. Required Environment Variables**
Make sure these are set in Vercel:

- ✅ `SLACK_WEBHOOK_URL` - Your Slack webhook URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- ✅ `CRON_SECRET` - Random secret for cron security

### **4. Testing the Cron Job**

**Manual Test:**
```bash
curl -X GET "https://your-app.vercel.app/api/cron/weekly-alert" \
  -H "Authorization: Bearer your_cron_secret"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Weekly alert sent successfully",
  "itemCount": 5,
  "timestamp": "2025-01-22T14:00:00.000Z"
}
```

## **📊 Alert Content**

The weekly alert includes:
- **Header**: "📊 Weekly Low Stock Alert"
- **Item List**: Up to 10 low stock items with:
  - Part number and description
  - Current location
  - Current quantity vs reorder point
  - Status (🔴 Out of Stock, 🟠 Critically Low, 🟡 Low Stock)
- **Link**: Direct link to inventory dashboard
- **Summary**: Total count of items needing attention

## **🕐 Schedule Details**

- **Frequency**: Every Monday
- **Time**: 10:00 AM EST (14:00 UTC)
- **Timezone**: Automatically adjusts for EST/EDT
- **Condition**: Only sends if there are low stock items

## **🔍 Monitoring**

**Vercel Function Logs:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Functions" tab
4. Find `/api/cron/weekly-alert`
5. View execution logs

**Slack Delivery:**
- Check your configured Slack channel
- Alerts only sent when items are low stock
- No spam - only sends when needed

## **⚙️ Customization**

**Change Schedule:**
Edit `vercel.json` cron schedule:
```json
"schedule": "0 14 * * 1"  // Monday 10 AM EST
"schedule": "0 14 * * 5"  // Friday 10 AM EST  
"schedule": "0 14 * * 1,5" // Monday & Friday
```

**Change Timezone:**
The cron runs in UTC. Adjust hour for your timezone:
- EST: UTC-5 → Use hour 14 for 9 AM EST
- PST: UTC-8 → Use hour 17 for 9 AM PST
- GMT: UTC+0 → Use hour 9 for 9 AM GMT

## **🚨 Troubleshooting**

**No Alerts Received:**
1. Check Vercel function logs
2. Verify `CRON_SECRET` is set
3. Confirm `SLACK_WEBHOOK_URL` is correct
4. Test manual endpoint call

**Wrong Time:**
1. Remember cron uses UTC time
2. Account for EST/EDT changes
3. Check Vercel deployment region

**Too Many/Few Items:**
1. Check reorder point settings
2. Verify inventory quantities
3. Review alert logic in code

## **📈 Next Steps**

After setup:
1. ✅ Deploy to Vercel
2. ✅ Set environment variables
3. ✅ Wait for next Monday 10 AM EST
4. ✅ Check Slack for first alert
5. ✅ Monitor Vercel logs for issues

The system will automatically send weekly reports every Monday morning! 🎉
