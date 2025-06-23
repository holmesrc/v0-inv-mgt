import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const { userId, approvalId } = req.body

  // Construct the approval dashboard URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"
  const approvalLink = `${appUrl}/approvals/${approvalId}`

  // Create the message to send to Slack
  const message = `User <@${userId}> has requested approval. Please review it here: ${approvalLink}`

  // Send the message to Slack (assuming a sendToSlack function exists)
  await sendToSlack(message)

  return res.status(200).json({ message: "Approval request sent" })
}

async function sendToSlack(message: string) {
  // Implementation for sending message to Slack
}
</merged_code>
