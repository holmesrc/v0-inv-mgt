# DST Automation Deployment Checklist

## Pre-Deployment ✅
- [x] DST automation code implemented
- [x] Timezone utilities created
- [x] Cron jobs configured in vercel.json
- [x] Test endpoints created
- [x] Documentation written

## Deployment Steps

### 1. Code Deployment
- [ ] Push code to GitHub repository
- [ ] Connect repository to Vercel (or update existing)
- [ ] Verify deployment succeeds
- [ ] Check build logs for errors

### 2. Environment Configuration
- [ ] Add `CRON_SECRET` environment variable in Vercel
- [ ] Verify `SLACK_WEBHOOK_URL` is still configured
- [ ] Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- [ ] Check all environment variables are in Production environment

### 3. Cron Job Verification
- [ ] Verify cron jobs appear in Vercel dashboard
- [ ] Check that both cron jobs are configured:
  - [ ] `/api/alerts/cron` - `0 13 * * 1` (Monday 9 AM EDT)
  - [ ] `/api/alerts/dst-monitor` - `0 12 * * *` (Daily noon UTC)

## Post-Deployment Testing

### 4. Basic Functionality Tests
- [ ] Test timezone endpoint: `GET /api/alerts/test-timezone`
- [ ] Test DST status: `GET /api/alerts/dst-notification`
- [ ] Test timezone info: `GET /api/alerts/timezone-info`
- [ ] Verify main app still works (inventory dashboard)

### 5. Cron Job Tests (Requires CRON_SECRET)
- [ ] Test main cron: `GET /api/alerts/cron` with Authorization header
- [ ] Test DST monitor: `GET /api/alerts/dst-monitor` with Authorization header
- [ ] Check Vercel function logs for any errors

### 6. Integration Tests
- [ ] Test manual Slack alert still works
- [ ] Verify inventory data loads correctly
- [ ] Test low stock detection
- [ ] Verify settings are preserved

## Current Configuration (July 2025)

### Timezone Status
- **Current**: Eastern Daylight Time (EDT, UTC-4)
- **Cron Schedule**: `0 13 * * 1` (13:00 UTC = 9:00 AM EDT)
- **Next DST Change**: November 2, 2025 (Fall back to EST)

### Expected Behavior
- **Monday Alerts**: Every Monday at 9:00 AM Eastern Time
- **DST Monitoring**: Daily at 12:00 PM UTC
- **Notifications**: Slack alerts for DST transitions

## Troubleshooting

### If Cron Jobs Don't Appear
1. Check vercel.json syntax
2. Verify deployment completed successfully
3. Check Vercel dashboard → Functions → Cron

### If Tests Fail
1. Check environment variables are set
2. Verify CRON_SECRET matches test requests
3. Check function logs in Vercel dashboard
4. Test endpoints return 200 status codes

### If Alerts Don't Send
1. Verify SLACK_WEBHOOK_URL is correct
2. Test manual Slack alerts work
3. Check inventory data is loading
4. Verify low stock items exist for testing

## Success Criteria ✅

### Deployment Success
- [ ] All endpoints return successful responses
- [ ] Cron jobs visible in Vercel dashboard
- [ ] No errors in deployment or function logs
- [ ] Environment variables properly configured

### Functionality Success
- [ ] Timezone calculations are correct for current season
- [ ] DST monitoring detects transitions properly
- [ ] Manual alerts still work via Slack
- [ ] Inventory dashboard functions normally

### Long-term Success
- [ ] System automatically detects DST transitions
- [ ] Slack notifications sent for DST changes
- [ ] Monday 9 AM Eastern alerts continue working
- [ ] Documentation is clear for future maintenance

## Next DST Transition (November 2, 2025)

When the system detects the fall DST transition:
1. You'll receive a Slack notification
2. Update vercel.json: change `"0 13 * * 1"` to `"0 14 * * 1"`
3. Commit and push changes
4. Verify new schedule in Vercel dashboard

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Vercel URL**: ___________
**Status**: ___________
