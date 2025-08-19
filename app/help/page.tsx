"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, Package, Plus, RefreshCw, Globe, AlertTriangle, Download, Settings } from "lucide-react"
import Link from "next/link"

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const helpSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Package className="h-5 w-5" />,
      content: [
        {
          title: "Dashboard Overview",
          description: "Understanding your inventory at a glance",
          details: [
            "**Total Items**: Shows the complete count of unique parts in your inventory",
            "**Low Stock Items**: Red number indicating parts at or below their reorder point",
            "**Pending Changes**: Items waiting for approval before being added to inventory",
            "**Search Bar**: Find parts by number, description, or location",
            "**Filter Options**: View All Items, Low Stock, or Approaching Low Stock"
          ]
        },
        {
          title: "Navigation Basics",
          description: "Key buttons and their functions",
          details: [
            "**Add Item**: Create new inventory entries (manual or auto-populate)",
            "**Supplier Lookup**: Research parts across Digi-Key and Mouser",
            "**Download Excel**: Export your complete inventory data",
            "**Settings**: Configure default reorder points and Slack notifications",
            "**Send Alert Now**: Manually trigger low stock notifications"
          ]
        }
      ]
    },
    {
      id: "adding-items",
      title: "Adding Items",
      icon: <Plus className="h-5 w-5" />,
      content: [
        {
          title: "Manual Entry",
          description: "Adding items by typing all information",
          details: [
            "1. Click **Add Item** button",
            "2. Fill in **Requester Name** (your name for tracking)",
            "3. Enter **Part Number** (your internal part number)",
            "4. Add **MFG Part Number** (manufacturer's part number)",
            "5. Write **Description** (what the component is)",
            "6. Set **Quantity** (how many you have)",
            "7. Choose **Location** (where it's stored)",
            "8. Select **Supplier** (where you buy it from)",
            "9. Pick **Package Type** (Exact: 1-100, Estimated: 101-500, Reel: 500+)",
            "10. Set **Reorder Point** (when to reorder, default is 10)"
          ]
        },
        {
          title: "Auto-Populate Magic ✨",
          description: "Let the system fill in details automatically",
          details: [
            "**How it works**: Type a part number and wait 0.5 seconds",
            "**Digi-Key parts**: Numbers ending in -ND, -CT, -TR (e.g., 587-1231-1-ND)",
            "**Mouser parts**: Numbers starting with digits (e.g., 81-EVA86QR7TF472KD1K)",
            "**What gets filled**: MFG Part Number, Description, Supplier",
            "**Smart supplier detection**: Automatically sets correct supplier",
            "**Fallback descriptions**: Creates description from manufacturer + part number if needed"
          ]
        },
        {
          title: "Batch Mode",
          description: "Adding multiple items efficiently",
          details: [
            "1. Toggle **Batch Mode** switch",
            "2. Add multiple items in the table view",
            "3. Edit any field by clicking on it",
            "4. Remove items with the trash icon",
            "5. Submit entire batch at once",
            "6. Perfect for inventory uploads or bulk additions"
          ]
        }
      ]
    },
    {
      id: "auto-populate",
      title: "Auto-Populate System",
      icon: <RefreshCw className="h-5 w-5" />,
      content: [
        {
          title: "How Auto-Populate Works",
          description: "Automatic data retrieval from supplier APIs",
          details: [
            "**Trigger**: Type part number and pause for 0.5 seconds",
            "**Searches**: Both Digi-Key and Mouser simultaneously",
            "**Prioritization**: Matches part number pattern to correct supplier",
            "**Speed**: Results typically appear in 1-2 seconds",
            "**Visual feedback**: Shows spinning icon and 'Searching...' message"
          ]
        },
        {
          title: "Supported Part Numbers",
          description: "What part numbers work with auto-populate",
          details: [
            "**Digi-Key patterns**:",
            "  • -ND (Cut Tape): 587-1231-1-ND",
            "  • -CT (Cut Tape): 296-1234-CT", 
            "  • -TR (Tape & Reel): 445-5678-TR",
            "**Mouser patterns**:",
            "  • Starts with digits: 81-EVA86QR7TF472KD1K",
            "  • Format: ###-PARTNUMBER",
            "**Generic parts**: LM358N, 1N4148 (searches both suppliers)"
          ]
        },
        {
          title: "What Gets Auto-Filled",
          description: "Fields that populate automatically",
          details: [
            "**MFG Part Number**: Manufacturer's actual part number",
            "**Description**: Technical description of the component",
            "**Supplier**: Digi-Key or Mouser (based on where part was found)",
            "**Package**: Quantity-based packaging type (auto-suggests based on quantity)",
            "**Not filled**: Quantity, Location, Reorder Point (you set these)"
          ]
        }
      ]
    },
    {
      id: "supplier-lookup",
      title: "Supplier Lookup",
      icon: <Globe className="h-5 w-5" />,
      content: [
        {
          title: "Comparing Suppliers",
          description: "Research parts across multiple suppliers",
          details: [
            "1. Click **Supplier Lookup** button",
            "2. Enter any part number or description",
            "3. View results from both Digi-Key and Mouser",
            "4. Compare **prices**, **availability**, and **descriptions**",
            "5. Click **Select** to auto-fill Add Item form",
            "6. Perfect for finding the best deal or checking stock"
          ]
        },
        {
          title: "Search Tips",
          description: "Getting the best search results",
          details: [
            "**Exact part numbers**: Most accurate results",
            "**Generic terms**: 'LM358', '1N4148' work well",
            "**Descriptions**: Try 'ceramic capacitor 1uF' or 'op amp'",
            "**Manufacturer codes**: Some work across suppliers",
            "**Check both suppliers**: Prices and availability vary"
          ]
        }
      ]
    },
    {
      id: "inventory-management",
      title: "Managing Inventory",
      icon: <Package className="h-5 w-5" />,
      content: [
        {
          title: "Finding Items",
          description: "Locating parts in your inventory",
          details: [
            "**Search bar**: Type part number, description, or location",
            "**Category filters**: All Items, Low Stock, Approaching Low Stock",
            "**Column sorting**: Click any column header to sort",
            "**Quick filters**: Click on supplier names or locations to filter",
            "**Search is instant**: Results update as you type"
          ]
        },
        {
          title: "Editing Items",
          description: "Updating inventory information",
          details: [
            "1. Click the **pencil icon** next to any item",
            "2. Modify any field in the edit dialog",
            "3. **Quantity changes**: Update stock levels",
            "4. **Location updates**: Move items to new locations",
            "5. **Description fixes**: Correct or improve descriptions",
            "6. Click **Save** to apply changes"
          ]
        },
        {
          title: "Stock Status Indicators",
          description: "Understanding inventory health",
          details: [
            "**🔴 Low Stock**: At or below reorder point - order immediately",
            "**🟡 Approaching Low**: Within 50% above reorder point - monitor closely",
            "**⚪ Good Stock**: More than 50% above reorder point",
            "**Numbers**: Show current quantity vs reorder point",
            "**Automatic calculation**: Based on your reorder point settings"
          ]
        }
      ]
    },
    {
      id: "reordering",
      title: "Reordering System",
      icon: <AlertTriangle className="h-5 w-5" />,
      content: [
        {
          title: "Submitting Reorder Requests",
          description: "Requesting more components",
          details: [
            "1. Click **Reorder** button on any low stock item",
            "2. **Quantity**: How many to order (pre-filled with reorder point)",
            "3. **Urgency**: Low, Normal, High, or Urgent",
            "4. **Timeframe**: ASAP, 1 week, 1-2 weeks, 2-4 weeks, 1 month+",
            "5. **Your Name**: For tracking who requested it",
            "6. **Notes**: Special instructions or requirements",
            "7. **Submit**: Creates request and sends Slack notification"
          ]
        },
        {
          title: "Reorder Point System",
          description: "When items trigger reorder alerts",
          details: [
            "**Default reorder point**: 10 units (configurable in Settings)",
            "**Item-specific points**: Set custom reorder points per item",
            "**Automatic alerts**: System sends weekly low stock reports",
            "**Manual alerts**: Click 'Send Alert Now' for immediate notification",
            "**Smart defaults**: Urgent priority for zero-stock items"
          ]
        },
        {
          title: "Slack Notifications",
          description: "Automatic notifications for reorder requests",
          details: [
            "**Reorder requests**: Sent immediately when submitted",
            "**Low stock alerts**: Weekly summary of items needing reorder",
            "**Information included**: Part details, current stock, requested quantity",
            "**Request tracking**: Each request gets unique ID for tracking",
            "**Channel**: Notifications sent to #inventory-alerts"
          ]
        }
      ]
    },
    {
      id: "alerts-monitoring",
      title: "Alerts & Monitoring",
      icon: <AlertTriangle className="h-5 w-5" />,
      content: [
        {
          title: "Low Stock Monitoring",
          description: "Keeping track of inventory levels",
          details: [
            "**Dashboard indicator**: Red number shows low stock count",
            "**View Low Stock Page**: Click to see all items needing reorder",
            "**Automatic weekly alerts**: Sent every Monday at 10 AM EST",
            "**Manual alerts**: 'Send Alert Now' for immediate notification",
            "**Slack integration**: Notifications sent to your team channel"
          ]
        },
        {
          title: "Alert Settings",
          description: "Configuring notification preferences",
          details: [
            "**Default reorder point**: Set global minimum stock level",
            "**Slack notifications**: Enable/disable automatic alerts",
            "**Custom reorder points**: Set per-item minimum levels",
            "**Alert frequency**: Currently weekly (Mondays)",
            "**Access settings**: Click Settings button in main navigation"
          ]
        }
      ]
    },
    {
      id: "data-management",
      title: "Data Management",
      icon: <Download className="h-5 w-5" />,
      content: [
        {
          title: "Exporting Data",
          description: "Getting your inventory data out",
          details: [
            "**Excel export**: Click 'Download Excel' for complete inventory",
            "**CSV format**: Opens in Excel, Google Sheets, or any spreadsheet app",
            "**All fields included**: Part numbers, descriptions, quantities, locations",
            "**Current data**: Export reflects real-time inventory status",
            "**Backup purposes**: Regular exports recommended for data backup"
          ]
        },
        {
          title: "Data Sync",
          description: "Keeping data synchronized",
          details: [
            "**Auto-sync**: Changes save automatically to database",
            "**Manual sync**: 'Sync to Database' button for manual refresh",
            "**Pending changes**: Items awaiting approval shown separately",
            "**Real-time updates**: Multiple users see changes immediately",
            "**Data persistence**: All changes permanently stored"
          ]
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <Settings className="h-5 w-5" />,
      content: [
        {
          title: "Common Issues",
          description: "Solutions to frequent problems",
          details: [
            "**Auto-populate not working**:",
            "  • Check internet connection",
            "  • Verify part number format (see Auto-Populate section)",
            "  • Wait full 0.5 seconds after typing",
            "  • Try manual Supplier Lookup as alternative",
            "",
            "**Supplier field not populating**:",
            "  • New suppliers are automatically added to dropdown",
            "  • Refresh page if supplier doesn't appear",
            "  • Use 'Add Custom Supplier' option if needed",
            "",
            "**Slack notifications not working**:",
            "  • Check Settings → Slack notifications enabled",
            "  • Verify webhook URL is configured",
            "  • Test with 'Send Alert Now' button"
          ]
        },
        {
          title: "Performance Tips",
          description: "Getting the best experience",
          details: [
            "**Search performance**: Use specific terms for faster results",
            "**Large inventories**: Use filters to reduce displayed items",
            "**Batch operations**: Use batch mode for multiple additions",
            "**Mobile usage**: All features work on mobile devices",
            "**Browser compatibility**: Works best in Chrome, Firefox, Safari"
          ]
        }
      ]
    }
  ]

  const filteredSections = helpSections.filter(section =>
    searchTerm === "" || 
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.details.some(detail => detail.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Help & Documentation</h1>
              <p className="text-gray-600">Complete guide to using the Inventory Management System</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search help topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Navigation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>Jump to specific topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {helpSections.map((section) => (
                <Button
                  key={section.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="justify-start"
                >
                  {section.icon}
                  <span className="ml-2 text-xs">{section.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Sections */}
        <div className="space-y-6">
          {filteredSections.map((section) => (
            <Card key={section.id} id={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {section.content.map((item, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 mb-3">{item.description}</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {item.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="text-sm text-gray-700">
                            {detail.includes('**') ? (
                              <span dangerouslySetInnerHTML={{
                                __html: detail
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\n/g, '<br />')
                              }} />
                            ) : (
                              detail
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p>Need more help? Contact your system administrator.</p>
          <p className="text-sm mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}
