'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugAlertsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [testTime, setTestTime] = useState('')

  const handleManualTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/alerts/manual-test', {
        method: 'POST'
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ success: false, error: 'Failed to trigger test' })
    }
    setLoading(false)
  }

  const handleScheduleTest = async () => {
    if (!testTime) {
      alert('Please enter a test time')
      return
    }

    const [hours, minutes] = testTime.split(':')
    const cronMinute = parseInt(minutes)
    const cronHour = parseInt(hours) + 5 // Convert Eastern to UTC (approximate)
    
    alert(`Would set cron to: ${cronMinute} ${cronHour} * * * (${testTime} Eastern)`)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Debug Slack Alerts</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Manual Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Trigger a low stock alert immediately to test Slack integration
            </p>
            <Button 
              onClick={handleManualTest} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Test Alert Now'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Set a specific time for testing (Eastern Time)
            </p>
            <div className="flex gap-2">
              <Input
                type="time"
                value={testTime}
                onChange={(e) => setTestTime(e.target.value)}
                placeholder="10:30"
              />
              <Button onClick={handleScheduleTest}>
                Schedule Test
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Time Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Local Time:</strong> {new Date().toLocaleString()}</div>
              <div><strong>Eastern Time:</strong> {new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</div>
              <div><strong>UTC Time:</strong> {new Date().toISOString()}</div>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Test Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
