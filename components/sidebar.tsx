"use client"

import * as React from "react"
import Image from "next/image"
import {
  BarChart3,
  ChevronDown,
  Grid,
  LayoutGrid,
  Mail,
  Package,
  Settings,
  Users,
  Bell,
  LayoutTemplate,
  ChartNetwork,
  FileWarning,
  MonitorCog,
  House,
  Siren,
} from "lucide-react"
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation";
import image from '../public/assets/1.png'

// Add this custom hook at the top level
function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia(query)
    const updateMatch = () => setMatches(media.matches)
    
    // Initial check
    updateMatch()
    
    // Listen for changes
    media.addEventListener('change', updateMatch)
    return () => media.removeEventListener('change', updateMatch)
  }, [query])

  return matches
}

interface NavItemProps {
  icon: React.ElementType
  label: string
  isActive?: boolean
  isCollapsible?: boolean
  children?: React.ReactNode
  badge?: number
  isCollapsed?: boolean
  onExpand?: () => void
  onClick?: () => void
}

function NavItem({ icon: Icon, label, isActive, isCollapsible, children, badge, isCollapsed, onExpand, onClick }: NavItemProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleClick = () => {
    if (isCollapsed && onExpand) {
      onExpand()
    }
    if (onClick) {
      onClick()
    }
  }

  const content = (
    <Button
      variant="ghost"
      className={cn(
        "w-full transition-all duration-200",
        isCollapsible ? "justify-between" : "justify-start",
        isActive && "bg-accent text-accent-foreground font-medium",
      )}
      onClick={handleClick}
    >
      <div className="flex items-center min-w-0">
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && <span className="ml-2 truncate">{label}</span>}
      </div>
      {isCollapsible && !isCollapsed && (
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
      )}
      {badge && !isCollapsed && (
        <span className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
          {badge}
        </span>
      )}
    </Button>
  )

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (isCollapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>{content}</CollapsibleTrigger>
        <CollapsibleContent className="pl-6">{children}</CollapsibleContent>
      </Collapsible>
    )
  }

  if (label === "Settings") {
    return (
      <Link href="/settings">
        {content}
      </Link>
    )
  }

  return content
}

export function Sidebar() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [isCollapsed, setIsCollapsed] = React.useState(true) // Default to collapsed
  const router = useRouter();
  const [activeItem, setActiveItem] = React.useState("Dashboard")
  const [activeSubItem, setActiveSubItem] = React.useState<string>("")

  const handleItemClick = (label: string) => {
    setActiveItem(label)
    if (isCollapsed) {
      handleExpand()
    }
  }

  const handleSubItemClick = (label: string, path: string) => {
    setActiveSubItem(label)
    router.push(path)
  }

  // Set initial collapse state based on screen size
  React.useEffect(() => {
    setIsCollapsed(isMobile)
  }, [isMobile])

  const handleExpand = () => {
    setIsCollapsed(false)
  }

  return (
    <div
      className={cn(
        "flex h-screen border-r sticky top-0 bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        "z-50", 
      )}
    >
      <div className="flex w-full flex-col overflow-hidden">
        <div className={cn("p-4 flex justify-between items-center", isCollapsed && "flex-col items-center")}>
          <div className="flex items-center gap-2 pr-2 mb-2">
            <div className="relative">
              {isCollapsed ? (
                <Image
                  src='/assets/1.png'
                  alt="Logo"
                  width={30}
                  height={10}
                  className="object-contain"
                  priority
                />
              ) : (
                <Image
                  src="/assets/2.png"
                  alt="Logo2"
                  width={60}
                  height={40}
                  className="object-contain"
                  priority
                />
              )}
            </div>
            {!isCollapsed && <span className="font-semibold">QUANTA</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-full border bg-background")}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <TbLayoutSidebarRightCollapse className="h-6 w-6" /> : <TbLayoutSidebarLeftCollapse className="h-6 w-6" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar mt-auto">
          

          <div className="space-y-1 py-2">
            {!isCollapsed && <div className="text-sm font-medium">Overview</div>}

            <NavItem 
              icon={House} 
              label="Dashboard" 
              isCollapsed={isCollapsed} 
              onExpand={handleExpand}
              isActive={activeItem === "Dashboard"}
              onClick={() => handleItemClick("Dashboard")}
            />
            <NavItem 
              icon={LayoutTemplate} 
              label="Templates" 
              isCollapsed={isCollapsed} 
              onExpand={handleExpand}
              isActive={activeItem === "Templates"}
              onClick={() => handleItemClick("Templates")}
            />
            <NavItem 
              icon={ChartNetwork} 
              label="System Topology" 
              isCollapsed={isCollapsed} 
              onExpand={handleExpand}
              isActive={activeItem === "System Topology"}
              onClick={() => handleItemClick("System Topology")}
            />
          </div>

          <div className="space-y-1 py-2">
            {!isCollapsed && <div className="text-sm font-medium mb-2">System Administration</div>}
            <NavItem
              icon={MonitorCog}
              label="Manage Systems"
              isCollapsible={!isCollapsed}
              isCollapsed={isCollapsed}
              onExpand={handleExpand}
              isActive={activeItem === "Manage Systems"}
              onClick={() => handleItemClick("Manage Systems")}
            >
              <div className="space-y-1 py-1">
                <div className="max-w-full overflow-hidden space-y-2">
                  {[
                  { path: "#", label: "Extarction Config" },
                  { path: "#", label: "KPI Config" },
                  { path: "#", label: "Master Filters Config" },
                  { path: "#", label: "User Access" },
                  ].map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-sm py-2 px-2 h-auto whitespace-normal text-left",
                      activeSubItem === item.label && "bg-accent text-accent-foreground font-medium"
                    )}
                    onClick={() => handleSubItemClick(item.label, item.path)}
                  >
                    {item.label}
                  </Button>
                  ))}
                </div>
              </div>
            </NavItem>
          </div>

          <div className="space-y- py-3">
            {!isCollapsed && <div className="text-sm font-medium">Alerts</div>}

            <NavItem 
              icon={Siren} 
              label="Alert Monitering" 
              isCollapsed={isCollapsed} 
              onExpand={handleExpand}
              isActive={activeItem === "Alert Monitering"}
              onClick={() => handleItemClick("Alert Monitering")}
            />
          </div>
        </div>

        <div className="border-t p-4 mt-auto">
          <div className="space-y-1">
            <NavItem 
              icon={Bell} 
              label="Notifications" 
              badge={3} 
              isCollapsed={isCollapsed} 
              onExpand={handleExpand}
              isActive={activeItem === "Notifications"}
              onClick={() => handleItemClick("Notifications")}
            />
            <NavItem 
              icon={Settings} 
              label="Settings" 
              isCollapsed={isCollapsed} 
              onExpand={handleExpand}
              isActive={activeItem === "Settings"}
              onClick={() => handleItemClick("Settings")}
            />
          </div>
          {!isCollapsed && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border p-4">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1 truncate">
                <div className="text-sm font-medium">John Doe</div>
                <div className="truncate text-xs text-muted-foreground">johndoe@gmail.com</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}