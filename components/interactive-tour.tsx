"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, ArrowRight, ArrowLeft, Play } from "lucide-react"

interface TourStep {
  id: string
  title: string
  description: string
  target: string
  position: "top" | "bottom" | "left" | "right"
  action?: string
}

interface InteractiveTourProps {
  isActive: boolean
  onComplete: () => void
  onSkip: () => void
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Inventory Management!",
    description: "Let's take a quick tour of the key features. This will only take 2 minutes.",
    target: "body",
    position: "top"
  },
  {
    id: "stats",
    title: "Dashboard Overview",
    description: "These cards show your inventory health at a glance. Red numbers indicate items needing attention.",
    target: "[data-tour='stats-cards']",
    position: "bottom"
  },
  {
    id: "add-item",
    title: "Adding New Items",
    description: "Click here to add new components. The system can auto-populate data from Digi-Key and Mouser!",
    target: "[data-tour='add-item-btn']",
    position: "bottom",
    action: "Try typing a part number like '587-1231-1-ND' and watch it auto-fill!"
  },
  {
    id: "supplier-lookup",
    title: "Supplier Research",
    description: "Compare prices and availability across multiple suppliers before adding items.",
    target: "[data-tour='supplier-lookup-btn']",
    position: "bottom"
  },
  {
    id: "search",
    title: "Finding Items",
    description: "Search by part number, description, or location. Use filters to find low stock items quickly.",
    target: "[data-tour='search-bar']",
    position: "bottom"
  },
  {
    id: "inventory-table",
    title: "Your Inventory",
    description: "All your components are listed here. Click column headers to sort, use the edit/delete buttons to manage items.",
    target: "[data-tour='inventory-table']",
    position: "top"
  },
  {
    id: "reorder-btn",
    title: "Reordering Components",
    description: "When stock is low, click 'Reorder' to submit a purchase request. It automatically sends Slack notifications!",
    target: "[data-tour='reorder-btn']",
    position: "top"
  },
  {
    id: "help",
    title: "Getting Help",
    description: "Need help? Use these buttons for quick help or comprehensive documentation.",
    target: "[data-tour='help-btn']",
    position: "bottom"
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "That's the tour! You're ready to manage your inventory efficiently. Remember, auto-populate saves tons of time!",
    target: "body",
    position: "top"
  }
]

export default function InteractiveTour({ isActive, onComplete, onSkip }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tourPosition, setTourPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!isActive) return

    const updatePosition = () => {
      const step = tourSteps[currentStep]
      const target = document.querySelector(step.target)
      
      if (target && step.target !== "body") {
        const rect = target.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
        
        let top = 0
        let left = 0
        
        switch (step.position) {
          case "bottom":
            top = rect.bottom + scrollTop + 10
            left = rect.left + scrollLeft + (rect.width / 2) - 200
            break
          case "top":
            top = rect.top + scrollTop - 10
            left = rect.left + scrollLeft + (rect.width / 2) - 200
            break
          case "right":
            top = rect.top + scrollTop + (rect.height / 2) - 100
            left = rect.right + scrollLeft + 10
            break
          case "left":
            top = rect.top + scrollTop + (rect.height / 2) - 100
            left = rect.left + scrollLeft - 410
            break
        }
        
        // Keep tooltip on screen
        top = Math.max(10, Math.min(top, window.innerHeight - 200))
        left = Math.max(10, Math.min(left, window.innerWidth - 410))
        
        setTourPosition({ top, left })
        
        // Highlight target element
        target.classList.add('tour-highlight')
        
        // Scroll target into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        // Center on screen for body target
        setTourPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 200
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    
    return () => {
      window.removeEventListener('resize', updatePosition)
      // Remove highlights
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight')
      })
    }
  }, [currentStep, isActive])

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const skipTour = () => {
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })
    onSkip()
  }

  if (!isActive) return null

  const step = tourSteps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
      
      {/* Tour Card */}
      <Card 
        className="fixed z-50 w-96 shadow-2xl"
        style={{ 
          top: `${tourPosition.top}px`, 
          left: `${tourPosition.left}px`,
          transform: step.target === "body" ? "translate(-50%, -50%)" : "none"
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Step {currentStep + 1} of {tourSteps.length}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={skipTour}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">{step.description}</p>
          
          {step.action && (
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
              <p className="text-xs text-blue-800 font-medium">💡 Try it:</p>
              <p className="text-xs text-blue-700">{step.action}</p>
            </div>
          )}
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <span className="text-xs text-gray-500">
              {currentStep + 1} / {tourSteps.length}
            </span>
            
            <Button size="sm" onClick={nextStep}>
              {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
              {currentStep < tourSteps.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Tour styles */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2) !important;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
      `}</style>
    </>
  )
}
