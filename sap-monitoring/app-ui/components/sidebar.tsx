"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Settings,
  Users,
  Bell,
  LayoutTemplate,
  ChartNetwork,
  MonitorCog,
  House,
  Siren,
  Tickets,
  Users2,
  LogOut,
  UserCircle,
} from "lucide-react";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarRightCollapse,
} from "react-icons/tb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

// Create context for sidebar state
interface SidebarContextType {
  isCollapsed: boolean;
  isHovering: boolean;
  toggleCollapsed: () => void;
  setIsHovering: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Apply padding to main content based on sidebar state
  useEffect(() => {
    const mainContent = document.getElementById('main-content-wrapper');
    if (mainContent) {
      if (isCollapsed && !isHovering) {
        mainContent.style.paddingLeft = '64px'; // 16rem (w-16)
      } else {
        mainContent.style.paddingLeft = isHovering ? '64px' : '256px'; // 64rem (w-64)
      }
    }
  }, [isCollapsed, isHovering]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, isHovering, toggleCollapsed, setIsHovering }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Add this custom hook at the top level
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);

    // Initial check
    updateMatch();

    // Listen for changes
    media.addEventListener("change", updateMatch);
    return () => media.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isCollapsible?: boolean;
  children?: React.ReactNode;
  badge?: number;
  isCollapsed?: boolean;
  onExpand?: () => void;
  onClick?: () => void;
}

// Update the NavItem button styles
function NavItem({
  icon: Icon,
  label,
  isActive,
  isCollapsible,
  children,
  badge,
  isCollapsed,
  onExpand,
  onClick,
}: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (isCollapsed && onExpand) {
      onExpand();
    }
    if (onClick) {
      onClick();
    }
    // Only toggle if not hovering for systems management
    if (isCollapsible && label !== "Manage Systems") {
      setIsOpen(!isOpen);
    }
  };

  // Handle mouse enter/leave for hover effect
  const handleMouseEnter = () => {
    if (isCollapsible && label === "Manage Systems") {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsible && label === "Manage Systems") {
      setIsHovering(false);
    }
  };

  useEffect(() => {
    // Additional effect for mouse events outside component bounds
    if (label === "Manage Systems") {
      const handleClickOutside = (event: MouseEvent) => {
        if (itemRef.current && !itemRef.current.contains(event.target as Node)) {
          setIsHovering(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [label]);

  const content = (
    <Button
      variant="ghost"
      className={cn(
        "w-full transition-all duration-200 flex items-center",
        isCollapsible
          ? "justify-between"
          : isCollapsed
          ? "justify-center"
          : "justify-start", 
        isActive && "bg-accent text-accent-foreground font-medium",
        "hover:bg-accent/50"
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "flex items-center min-w-0",
          isCollapsed && "justify-center w-full"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span className="ml-3 truncate">{label}</span>}
      </div>
      {isCollapsible && !isCollapsed && (
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-transform",
            (isOpen || isHovering) && "rotate-180"
          )}
        />
      )}
      {badge && !isCollapsed && (
        <span className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
          {badge}
        </span>
      )}
    </Button>
  );

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
    );
  }

  if (isCollapsible) {
    if (label === "Manage Systems") {
      return (
        <div 
          ref={itemRef}
          className="relative" 
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          {content}
          <div 
            className={cn(
              "pl-6 overflow-hidden transition-all duration-200 max-h-0",
              (isOpen || isHovering) && "max-h-[200px]" // Use max-height for smoother animation
            )}
          >
            {children}
          </div>
        </div>
      );
    }
    
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>{content}</CollapsibleTrigger>
        <CollapsibleContent className="pl-6">{children}</CollapsibleContent>
      </Collapsible>
    );
  }

  if (label === "Settings") {
    return <Link href="/settings">{content}</Link>;
  }

  return content;
}

export function Sidebar() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { isCollapsed, isHovering, toggleCollapsed, setIsHovering } = useSidebar();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [activeSubItem, setActiveSubItem] = useState<string>("");
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Improved hover handlers with debouncing
  const handleMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    
    if (isCollapsed) {
      setIsHovering(true);
    }
  }, [isCollapsed, setIsHovering]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    
    // Add a small delay to prevent flickering
    hoverTimerRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 100);
  }, [setIsHovering]);

  // Update the handleItemClick function
  const handleItemClick = useCallback((label: string) => {
    setActiveItem(label);
    // Add proper routing based on label
    switch (label) {
      case "Dashboard":
        router.push("/dashboard");
        break;
      case "Templates":
        router.push("/templates");
        break;
      case "Manage Systems":
        router.push("/systems/manage-systems");
        break;
      case "System Topology":
        router.push("/system-topology");
        break;
      case "User Access":
        router.push("/user-management/user-access");
        break;
      case "Manage User":
        router.push("/user-management/manage-users");
        break;
      case "Alert Monitering":
        router.push("/alerts");
        break;
      case "Incidents":
        router.push("/incidents");
        break;
      default:
        break;
    }
  }, [router]);

  // Update the handleSubItemClick function
  const handleSubItemClick = useCallback((label: string, path: string) => {
    setActiveSubItem(label);
    router.push(path);
  }, [router]);

  // Update the useEffect to maintain collapsed state except on mobile
  useEffect(() => {
    if (isMobile) {
      setIsHovering(false);
    }
    
    // Clean up hover timer on unmount
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isMobile, setIsHovering]);

  const handleExpand = useCallback(() => {
    setIsHovering(true);
  }, [setIsHovering]);

  // Add click outside handler to close expanded sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isHovering && isMobile) {
        setIsHovering(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHovering, isMobile, setIsHovering]);

  // Calculate width and position styles for better performance
  const sidebarStyles = {
    width: isCollapsed ? (isHovering ? '16rem' : '4rem') : '16rem',
    position: 'fixed' as 'fixed',
    height: '100vh',
    zIndex: 60,
  };

  return (
    <div
      ref={sidebarRef}
      style={sidebarStyles}
      className={cn(
        "flex border-r bg-background transition-all duration-300",
        "shadow-md" // Add shadow for better depth
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex w-full flex-col overflow-hidden">
        {/* Header */}
        <div
          className={cn(
            "p-4 flex items-center border-b",
            isCollapsed && !isHovering ? "justify-center" : "justify-between"
          )}
        >
          <div
            className={cn(
              "flex items-center",
              isCollapsed && !isHovering
                ? "justify-center w-full"
                : "gap-2"
            )}
          >
            {/* Logo section */}
            <div className="relative flex items-center">
              {isCollapsed && !isHovering ? (
                <div className="w-6 h-6">
                  <Image
                    src="/assets/Logo.png"
                    alt="SwiftAI Logo"
                    width={24}
                    height={24}
                    className="object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="h-8 w-32 relative">
                  <Image
                    src="/assets/13.png"
                    alt="SwiftAI"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar">
          <nav className="space-y-6">
            {/* Overview section */}
            <div className="space-y-1">
              {!(isCollapsed && !isHovering) && (
                <div className="text-xs uppercase font-medium text-muted-foreground mb-2 px-2">
                  Overview
                </div>
              )}
              <NavItem
                icon={House}
                label="Dashboard"
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "Dashboard"}
                onClick={() => handleItemClick("Dashboard")}
              />
              <NavItem
                icon={LayoutTemplate}
                label="Templates"
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "Templates"}
                onClick={() => handleItemClick("Templates")}
              />
              <NavItem
                icon={ChartNetwork}
                label="System Topology"
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "System Topology"}
                onClick={() => handleItemClick("System Topology")}
              />
            </div>
            
            {/* System Administration section */}
            <div className="space-y-1 py-2">
              {!(isCollapsed && !isHovering) && (
                <div className="text-sm text-muted-foreground font-medium mb-2">
                  System Administration
                </div>
              )}
              <NavItem
                icon={MonitorCog}
                label="Manage Systems"
                isCollapsible={!(isCollapsed && !isHovering)}
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "Manage Systems"}
                onClick={() => handleItemClick("Manage Systems")}
              >
                <div className="space-y-1 py-1">
                  <div className="max-w-full overflow-hidden space-y-2">
                    {[
                      {
                        path: "/systems/extraction-config",
                        label: "Extraction Config",
                      },
                    ].map((item, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-sm py-2 px-2 h-auto whitespace-normal text-left",
                          activeSubItem === item.label &&
                            "bg-accent text-accent-foreground font-medium"
                        )}
                        onClick={() =>
                          handleSubItemClick(item.label, item.path)
                        }
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </NavItem>
            </div>
            
            {/* Alerts section */}
            <div className="space-y-1 py-2">
              {!(isCollapsed && !isHovering) && (
                <div className="text-sm text-muted-foreground font-medium">
                  Alerts
                </div>
              )}
              <NavItem
                icon={Siren}
                label="Alert Monitoring"
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "Alert Monitering"}
                onClick={() => handleItemClick("Alert Monitering")}
              />
              <NavItem
                icon={Tickets}
                label="Incidents"
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "Incidents"}
                onClick={() => handleItemClick("Incidents")}
              />
            </div>
            
            {/* User Management section */}
            <div className="space-y-1 py-2">
              {!(isCollapsed && !isHovering) && (
                <div className="text-sm text-muted-foreground font-medium">
                  User Management
                </div>
              )}
              <NavItem
                icon={Users2}
                label="Manage User"
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "Manage User"}
                onClick={() => handleItemClick("Manage User")}
              />
              <NavItem
                icon={Users}
                label="User Access"
                isCollapsed={isCollapsed && !isHovering}
                onExpand={handleExpand}
                isActive={activeItem === "User Access"}
                onClick={() => handleItemClick("User Access")}
              />
            </div>
          </nav>
        </div>

        {/* Footer with hover profile menu */}
        <div className="border-t p-3 mt-auto bg-card/50">
          <div className="space-y-1">
            {isCollapsed && !isHovering ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={() => setIsHovering(true)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatars/user.png" alt="User" />
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Profile</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatars/user.png" alt="User" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">John Doe</div>
                      <div className="text-xs text-muted-foreground truncate">
                        johndoe@gmail.com
                      </div>
                    </div>
                  </div>
                </Button>

                {/* Hover menu for profile */}
                <div className="absolute bottom-full mb-1 right-0 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-popover rounded-md shadow-md border border-border p-1">
                    <div className="text-sm font-medium px-2 py-1.5">My Account</div>
                    <div className="h-px bg-muted my-1" />
                    <div className="space-y-1">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm px-2 h-9"
                        onClick={() => router.push("/profile")}
                      >
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm px-2 h-9"
                        onClick={() => router.push("/settings")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm px-2 h-9"
                        onClick={() => router.push("/notifications")}
                      >
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Notifications</span>
                        <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                          3
                        </span>
                      </Button>
                    </div>
                    <div className="h-px bg-muted my-1" />
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm px-2 h-9"
                      onClick={() => router.push("/logout")}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
