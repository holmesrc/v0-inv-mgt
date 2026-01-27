# Supabase Keepalive Setup

## Option 1: Local Cron Job (Recommended)

1. Make the script executable:
```bash
chmod +x keepalive.js
```

2. Add to your crontab (runs every 5 days):
```bash
crontab -e
```

Add this line:
```
0 12 */5 * * cd /Users/holmesrc/Downloads/Development/inventory-management\ \(2\) && node keepalive.js
```

## Option 2: External Cron Service

Use a service like cron-job.org or EasyCron to hit:
```
https://your-app-url.vercel.app/api/keepalive
```

Set it to run every 5 days.

## Test the Scripts

Local script:
```bash
node keepalive.js
```

API endpoint (after deployment):
```bash
curl https://your-app-url.vercel.app/api/keepalive
```
