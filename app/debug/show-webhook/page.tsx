"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ShowWebhookPage() {
  const [webhookInfo, setWebhookInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadWebhookInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/show-webhook-url")
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
    loadWebhookInfo()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Webhook URL Debug</CardTitle>
          <p className="text-sm text-gray-600">Shows exactly what webhook URL the code is actually using</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button onClick={loadWebhookInfo} disabled={loading}>
            {loading ? "🔄 Loading..." : "🔄 Refresh Webhook Info"}
          </Button>

          {webhookInfo && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">📊 Environment Variables Status:</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {Object.entries(webhookInfo.environmentVariables || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-mono">{key}:</span>
                      <span className={value === "EXISTS" ? "text-green-600" : "text-red-600"}>
                        {value === "EXISTS" ? "✅ EXISTS" : "❌ NOT_SET"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">🎯 Actual Webhook Being Used:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Exists:</span>
                    <span className={webhookInfo.actualWebhookUsed?.exists ? "text-green-600" : "text-red-600"}>
                      {webhookInfo.actualWebhookUsed?.exists ? "✅ YES" : "❌ NO"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Length:</span>
                    <span className="font-mono">{webhookInfo.actualWebhookUsed?.length} characters</span>
                  </div>
                  <div className="flex justify-between">
                    <span>First Part:</span>
                    <span className="font-mono text-xs">{webhookInfo.actualWebhookUsed?.firstPart}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Part:</span>
                    <span className="font-mono text-xs">{webhookInfo.actualWebhookUsed?.lastPart}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span
                      className={`font-semibold ${
                        webhookInfo.actualWebhookUsed?.source === "HARDCODED_FALLBACK"
                          ? "text-orange-600"
                          : webhookInfo.actualWebhookUsed?.source === "SLACK_WEBHOOK_URL_NEW"
                            ? "text-green-600"
                            : webhookInfo.actualWebhookUsed?.source === "SLACK_WEBHOOK_URL_BACKUP"
                              ? "text-blue-600"
                              : "text-gray-600"
                      }`}
                    >
                      {webhookInfo.actualWebhookUsed?.source}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Is Working Webhook:</span>
                    <span
                      className={webhookInfo.actualWebhookUsed?.isWorkingWebhook ? "text-green-600" : "text-red-600"}
                    >
                      {webhookInfo.actualWebhookUsed?.isWorkingWebhook ? "✅ YES" : "❌ NO"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">🔄 Fallback Logic:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {webhookInfo.fallbackLogic?.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">⏰ Timestamp:</h3>
                <p className="text-sm font-mono">{webhookInfo.timestamp}</p>
              </div>

              {webhookInfo.error && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-700">❌ Error:</h3>
                  <p className="text-sm text-red-600">{webhookInfo.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
