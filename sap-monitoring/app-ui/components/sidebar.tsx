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
} from "lucide-react"
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from "react-icons/tb";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation";
import image from '../public/assets/1.png'
interface NavItemProps {
  icon: React.ElementType
  label: string
  isActive?: boolean
  isCollapsible?: boolean
  children?: React.ReactNode
  badge?: number
  isCollapsed?: boolean
  onExpand?: () => void
}

function NavItem({ icon: Icon, label, isActive, isCollapsible, children, badge, isCollapsed, onExpand }: NavItemProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleClick = () => {
    if (isCollapsed && onExpand) {
      onExpand()
    }
  }

  const content = (
    <Button
      variant="ghost"
      className={cn(
        "w-full transition-all duration-200",
        isCollapsible ? "justify-between" : "justify-start",
        isActive && "bg-accent"
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
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const router = useRouter();
  const handleExpand = () => {
    setIsCollapsed(false)
  }

  return (
    <div
      className={cn(
        "flex h-screen border-r sticky top-0 bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
          {!isCollapsed && <div className="text-sm text-muted-foreground mb-4">Demo Sidebar</div>}

          <div className="space-y-1 py-2">
            {!isCollapsed && <div className="text-sm font-medium mb-2">Sidebar</div>}
            <NavItem
              icon={BarChart3}
              label="Dashboard"
              isCollapsible={!isCollapsed}
              isCollapsed={isCollapsed}
              onExpand={handleExpand}
            >
              <div className="space-y-1 py-1">
                <div className="max-w-full overflow-hidden">
                  {[
                    { path: "#", label: "Tab 1" },
                    { path: "#", label: "Tab 2" },
                    { path: "#", label: "Tab 3" },
                  ].map((item, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-sm py-1 px-2 h-auto whitespace-normal text-left"
                      onClick={() => router.push(item.path)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            </NavItem>
          </div>

          <div className="space-y-1 py-3">
            {!isCollapsed && <div className="text-sm font-medium">Menu 2</div>}
            <NavItem icon={Package} label="Products" isCollapsed={isCollapsed} onExpand={handleExpand} />
            <NavItem icon={Grid} label="Subcategories" isCollapsed={isCollapsed} onExpand={handleExpand} />
            <NavItem icon={LayoutGrid} label="Categories" isCollapsed={isCollapsed} onExpand={handleExpand} />
          </div>

          <div className="space-y- py-3">
            {!isCollapsed && <div className="text-sm font-medium">MANAGEMENT</div>}
            <NavItem icon={Mail} label="Invoices" isCollapsed={isCollapsed} onExpand={handleExpand} />
            <NavItem icon={Users} label="Team" isCollapsed={isCollapsed} onExpand={handleExpand} />
          </div>
        </div>

        <div className="border-t p-4 mt-auto">
          <div className="space-y-1">
            <NavItem icon={Bell} label="Notifications" badge={3} isCollapsed={isCollapsed} onExpand={handleExpand} />
            <NavItem icon={Settings} label="Settings" isCollapsed={isCollapsed} onExpand={handleExpand} />
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