# Automatic DST Handling for Inventory Alerts

This system automatically handles Daylight Saving Time (DST) transitions to ensure your Monday 9:00 AM Eastern inventory alerts always work correctly.

## 🕐 How It Works

### Current Configuration
- **Summer (EDT)**: Monday 9:00 AM EDT = 13:00 UTC → Cron: `0 13 * * 1`
- **Winter (EST)**: Monday 9:00 AM EST = 14:00 UTC → Cron: `0 14 * * 1`

### Automatic Monitoring
- **Daily Check**: Runs every day at 12:00 PM UTC (`0 12 * * *`)
- **DST Detection**: Monitors for transitions within 24 hours
- **Notifications**: Sends Slack alerts when transitions are detected

## 📅 DST Transition Dates (2025)
- **Spring Forward**: Sunday, March 9, 2025 at 2:00 AM → 3:00 AM (EDT begins)
- **Fall Back**: Sunday, November 2, 2025 at 2:00 AM → 1:00 AM (EST begins)

## 🔧 API Endpoints

### Core Functionality
- `/api/alerts/cron` - Main inventory alert (runs Monday 9 AM Eastern)
- `/api/alerts/dst-monitor` - Daily DST monitoring (runs daily at noon UTC)

### Testing & Management
- `/api/alerts/test-timezone` - Test timezone calculations
- `/api/alerts/timezone-info` - Get current timezone info
- `/api/alerts/update-dst` - Get DST update configuration
- `/api/alerts/dst-notification` - Send DST notifications

## 🚨 What Happens During DST Transitions

### Automatic Detection
1. **Daily monitoring** detects upcoming DST transition
2. **Slack notification** sent to #inventory-alerts channel
3. **New cron schedule** calculated automatically

### Manual Action Required
When you receive a DST notification:

1. **Update vercel.json**:
   ```json
   {
     "crons": [
       {
         "path": "/api/alerts/cron",
         "schedule": "0 14 * * 1"  // New schedule from notification
       },
       {
         "path": "/api/alerts/dst-monitor",
         "schedule": "0 12 * * *"
       }
     ]
   }
   ```

2. **Commit and push** changes to trigger redeployment

3. **Verify** in Vercel dashboard that new schedule is active

## 🧪 Testing the System

### Test Current Timezone Setup
```bash
curl https://your-app.vercel.app/api/alerts/test-timezone
```

### Check DST Status
```bash
curl https://your-app.vercel.app/api/alerts/dst-notification
```

### Manual DST Check
```bash
curl -X POST https://your-app.vercel.app/api/alerts/dst-monitor \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 📋 Deployment Checklist

### Initial Setup
- [x] `vercel.json` configured with cron jobs
- [x] `CRON_SECRET` environment variable set
- [x] Timezone utilities implemented
- [x] DST monitoring system active

### During DST Transitions
- [ ] Receive Slack notification
- [ ] Update `vercel.json` with new cron schedule
- [ ] Commit and push changes
- [ ] Verify new schedule in Vercel dashboard
- [ ] Test next Monday alert timing

## 🔍 Monitoring & Logs

### Vercel Function Logs
Check your Vercel dashboard for:
- Daily DST monitoring logs (noon UTC)
- Monday inventory alert logs (9 AM Eastern)
- Any error messages or failures

### Slack Notifications
You'll receive notifications for:
- DST transition alerts
- Cron schedule update requirements
- System status updates

## 🛠️ Troubleshooting

### If Alerts Stop Working
1. Check current timezone: `/api/alerts/test-timezone`
2. Verify cron schedule matches expected: `/api/alerts/timezone-info`
3. Test manual alert: `/api/alerts/test-cron`
4. Check Vercel function logs for errors

### If DST Monitoring Fails
1. Verify `CRON_SECRET` environment variable
2. Check DST monitor endpoint: `/api/alerts/dst-monitor`
3. Review Slack webhook configuration

## 📞 Support

The system provides comprehensive logging and error reporting. Check:
- Vercel function logs
- Slack notifications
- API endpoint responses for debugging information

## 🔄 Future Improvements

Potential enhancements:
- Fully automated vercel.json updates
- Integration with GitHub API for automatic commits
- Email backup notifications
- Multi-timezone support
- Custom DST transition handling for other regions
