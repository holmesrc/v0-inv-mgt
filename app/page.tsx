import InventoryDashboard from "@/components/inventory-dashboard"
import SlackSetupGuide from "@/components/slack-setup-guide"

export default function Home() {
  return (
    <div>
      <InventoryDashboard />
      <SlackSetupGuide />
    </div>
  )
}
