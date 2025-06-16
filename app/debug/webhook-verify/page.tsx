"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function WebhookVerifyPage() {
  const [webhookInfo, setWebhookInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkWebhook = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/webhook-check")
      const data = await response.json()
      setWebhookInfo(data)
    } catch (error) {
      setWebhookInfo({
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    checkWebhook()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Webhook URL Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkWebhook} disabled={loading}>
            {loading ? "🔄 Checking..." : "🔍 Check Current Webhook"}
          </Button>

          {webhookInfo && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Current Webhook Info:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm">{JSON.stringify(webhookInfo, null, 2)}</pre>

              {webhookInfo.exists && (
                <div className="mt-4 space-y-2">
                  <p>
                    <strong>Length:</strong> {webhookInfo.length} characters
                  </p>
                  <p>
                    <strong>First part:</strong> {webhookInfo.firstPart}...
                  </p>
                  <p>
                    <strong>Last part:</strong> ...{webhookInfo.lastPart}
                  </p>
                  <p>
                    <strong>Hash:</strong> {webhookInfo.hash}
                  </p>
                  <p>
                    <strong>Valid format:</strong> {webhookInfo.format ? "✅ Yes" : "❌ No"}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 rounded">
            <h4 className="font-semibold mb-2">🔧 If the webhook hasn't changed:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Double-check you saved the new webhook in Vercel</li>
              <li>Make sure you selected "Production" environment</li>
              <li>Try clearing your browser cache</li>
              <li>Wait a few more minutes for propagation</li>
              <li>Try a hard refresh of this page</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
