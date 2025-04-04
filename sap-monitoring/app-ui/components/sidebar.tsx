"use client";

import * as React from "react";
import Image from "next/image";
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
import image from "../public/assets/1.png";

// Add this custom hook at the top level
function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
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
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClick = () => {
    if (isCollapsed && onExpand) {
      onExpand();
    }
    if (onClick) {
      onClick();
    }
  };

  const content = (
    <Button
      variant="ghost"
      className={cn(
        "w-full transition-all duration-200 flex items-center",
        isCollapsible
          ? "justify-between"
          : isCollapsed
          ? "justify-center"
          : "justify-start", // Add center alignment
        isActive && "bg-accent text-accent-foreground font-medium",
        "hover:bg-accent/50" // Add hover effect
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          "flex items-center min-w-0",
          isCollapsed && "justify-center w-full" // Center icon when collapsed
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" /> {/* Slightly larger icons */}
        {!isCollapsed && <span className="ml-3 truncate">{label}</span>}
      </div>
      {isCollapsible && !isCollapsed && (
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-transform",
            isOpen && "rotate-180"
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
  // Change the initial state to true (collapsed)
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const router = useRouter();
  const [activeItem, setActiveItem] = React.useState("Dashboard");
  const [activeSubItem, setActiveSubItem] = React.useState<string>("");

  // Update the handleItemClick function
  const handleItemClick = (label: string) => {
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
      case "System Topology":
        router.push("/system-topology");
        break;
      case "User Access":
        router.push("/user-management/user-access");
        break;
      case "Manage User":
        router.push("/user-management/manage-user");
        break;
      default:
        break;
    }
  };

  // Update the handleSubItemClick function
  const handleSubItemClick = (label: string, path: string) => {
    setActiveSubItem(label);
    if (label === "Add Systems") {
      router.push("/systems/manage-systems");
    } else {
      router.push(path);
    }
  };

  // Update the useEffect to maintain collapsed state except on mobile
  React.useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const handleExpand = () => {
    setIsCollapsed(false);
  };

  return (
    <div
      className={cn(
        "flex h-screen border-r sticky top-0 bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        "z-50 shadow-md" // Add shadow for better depth
      )}
    >
      <div className="flex w-full flex-col overflow-hidden">
        {/* Update header styles */}
        <div
          className={cn(
            "p-4 flex items-center border-b",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <div
            className={cn(
              "flex items-center",
              isCollapsed ? "justify-center w-full pr-6" : "gap-2" // Add padding-right when collapsed
            )}
          >
            {/* Updated Logo section with images */}
            <div className="relative flex items-center">
              {isCollapsed ? (
                // Small logo for collapsed sidebar
                <div className="w-6 h-6">
                  <Image
                    src="/assets/Logo.png"
                    alt="SwiftAI Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="h-8 w-32">
                  <Image
                    src="/assets/1.png"
                    alt="SwiftAI"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full p-2 hover:bg-accent/50",
              isCollapsed && "absolute right-1 top-4" // Positioned absolutely when collapsed
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <TbLayoutSidebarRightCollapse className="h-5 w-5" />
            ) : (
              <TbLayoutSidebarLeftCollapse className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Update navigation sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 custom-scrollbar">
          <nav className="space-y-6">
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="text-xs uppercase font-medium text-muted-foreground mb-2 px-2">
                  Overview
                </div>
              )}
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
              {!isCollapsed && (
                <div className="text-sm text-muted-foreground font-medium mb-2">
                  System Administration
                </div>
              )}
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
                  <div className="max-w-full  overflow-hidden space-y-2">
                    {[
                      {
                        path: "/systems/extraction-config",
                        label: "Extarction Config",
                      },
                      // { path: "/kpi-config", label: "KPI Config" },
                      // { path: "/master-filters", label: "Master Filters Config" },
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
            <div className="space-y- py-2">
              {!isCollapsed && (
                <div className="text-sm text-muted-foreground font-medium">
                  Alerts
                </div>
              )}
              <NavItem
                icon={Siren}
                label="Alert Monitering"
                isCollapsed={isCollapsed}
                onExpand={handleExpand}
                isActive={activeItem === "Alert Monitering"}
                onClick={() => handleItemClick("Alert Monitering")}
              />
              <NavItem
                icon={Tickets}
                label="Incidents"
                isCollapsed={isCollapsed}
                onExpand={handleExpand}
                isActive={activeItem === "Incidents"}
                onClick={() => handleItemClick("Incidents")}
              />
            </div>
            <div className="space-y- py-2">
              {!isCollapsed && (
                <div className="text-sm text-muted-foreground font-medium">
                  Account
                </div>
              )}
              <NavItem
                icon={UserCircle}
                label="Profile"
                isCollapsed={isCollapsed}
                onExpand={handleExpand}
                isActive={activeItem === "Profile"}
                onClick={() => {
                  setIsCollapsed(false);
                  const dropdown = document.getElementById(
                    "profile-dropdown-trigger"
                  );
                  if (dropdown) {
                    dropdown.click();
                  }
                }}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger id="profile-dropdown-trigger" className="hidden">
                <span />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="right">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push("/account/profile")}
                  >
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/account/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>General Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/account/notifications")}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                      3
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/auth/logout")}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="space-y- py-2">
              {!isCollapsed && (
                <div className="text-sm text-muted-foreground font-medium">
                  User Management
                </div>
              )}
              <NavItem
                icon={Users2}
                label="Manage User"
                isCollapsed={isCollapsed}
                onExpand={handleExpand}
                isActive={activeItem === "Manage User"}
                onClick={() => handleItemClick("Manage User")}
              />
              <NavItem
                icon={Tickets}
                label="User Access"
                isCollapsed={isCollapsed}
                onExpand={handleExpand}
                isActive={activeItem === "User Access"}
                onClick={() => handleItemClick("User Access")}
              />
            </div>
          </nav>
        </div>

        {/* Update footer section */}
        <div className="border-t p-3 mt-auto bg-card/50">
          <div className="space-y-1">
            {isCollapsed ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-center"
                      onClick={() => setIsCollapsed(false)}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
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
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" side="right">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/notifications")}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                      {/* Optional: Add notification badge */}
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                        3
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/logout")}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
