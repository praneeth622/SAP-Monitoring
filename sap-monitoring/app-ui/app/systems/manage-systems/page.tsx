"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  MonitorDot,
  Activity,
  AlertCircle,
  Edit,
  Settings,
  Trash2,
  SearchIcon,
  FilterIcon,
  SortAscIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import EditSystemSheet from "@/components/edit-system-sheet";
import { toast } from "sonner";
import { PopoverWarningButton } from "@/components/ui/popover-warning-button";
import { cn } from "@/lib/utils";

// Update the System interface
interface System {
  system_id: string;
  instance: string;
  client: number;
  description: string;
  type: string;
  pollingStatus: boolean;
  activeStatus: boolean;
  no?: number;
  id?: string; // Add this for backward compatibility
}

// Update the SystemStats interface
interface SystemStats {
  totalSystems: number;
  activeSystems: number;
  inactiveSystems: number;
  connectionStats: {
    connected: number;
    disconnected: number;
  };
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
  variant: "blue" | "green" | "red";
}

interface EmptyStateProps {
  onAdd: () => void;
}

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface AddSystemSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

interface UpdatePollingStatusRequest {
  systemId: string;
  pollingStatus: boolean;
}

interface UpdateActiveStatusRequest {
  systemId: string;
  activeStatus: boolean;
}

// Update the StatsCards component interface
interface StatsCardsProps {
  stats: SystemStats;
  isLoading: boolean;
}

interface EditSystemSheetProps {
  open: boolean;
  onClose: () => void;
  system: System | null;
  onSubmit: (systemId: string, description: string) => Promise<void>;
}

export default function ManageSystemsPage() {
  const [isAddSystemSheetOpen, setIsAddSystemSheetOpen] = useState(false);
  const [systems, setSystems] = useState<System[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalSystems: 0,
    activeSystems: 0,
    inactiveSystems: 0,
    connectionStats: {
      connected: 0,
      disconnected: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [systemToDelete, setSystemToDelete] = useState<number | null>(null);

  // First, let's add a new confirmation dialog state and component for system status changes
  const [systemStatusChange, setSystemStatusChange] = useState<{
    id: number;
    systemName: string;
    newStatus: boolean;
  } | null>(null);

  useEffect(() => {
    fetchSystemStats();
    fetchSystems();
  }, []);

  // Update the fetchSystemStats function
  const fetchSystemStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("https://shwsckbvbt.a.pinggy.link/api/sys");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const systems = await response.json();

      // Calculate stats from systems array
      const calculatedStats = {
        totalSystems: systems.length,
        activeSystems: systems.filter((sys: any) => sys.activeStatus).length,
        inactiveSystems: systems.filter((sys: any) => !sys.activeStatus).length,
        connectionStats: {
          connected: systems.filter((sys: any) => sys.connectionStatus).length,
          disconnected: systems.filter((sys: any) => !sys.connectionStatus)
            .length,
        },
      };

      setStats(calculatedStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to fetch system statistics", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the fetchSystems function
  const fetchSystems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("https://shwsckbvbt.a.pinggy.link/api/sys");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (result) {
        // Transform the API response to match our table structure
        const transformedSystems = result.map((system: any, index: number) => ({
          system_id: system.system_id,
          instance: system.instance,
          client: system.client,
          description: system.description,
          type: system.type,
          pollingStatus: system.pollingStatus,
          activeStatus: system.activeStatus,
          no: index + 1,
          id: system.system_id // Add this for backward compatibility
        }));

        setSystems(transformedSystems);
      } else {
        throw new Error("Failed to fetch systems");
      }
    } catch (error) {
      console.error("Error fetching systems:", error);
      toast.error("Failed to fetch systems", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSystem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);

    try {
      // First validate the system
      const validateResponse = await fetch(
        "http://localhost:3000/api/system-validation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemName: formData.get("name"),
            systemType: formData.get("description"),
            systemSource: formData.get("source"),
            username: formData.get("username"),
            password: formData.get("password"),
          }),
        }
      );

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        throw new Error(errorData.message || "System validation failed");
      }

      const validatedSystem = await validateResponse.json();

      setIsAddSystemSheetOpen(false);
      toast.success("System added successfully", {
        description: "System has been validated and added to the database",
      });
      handleAddSystemSuccess();
    } catch (error) {
      toast.error("Failed to add system", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSystemSuccess = async () => {
    await Promise.all([fetchSystemStats(), fetchSystems()]);
  };

  const handleDeleteSystem = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/systems/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete system");

      await Promise.all([fetchSystemStats(), fetchSystems()]);

      toast.success("System deleted", {
        description: "System has been successfully removed",
      });
    } catch (error) {
      toast.error("Failed to delete system", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
    setSystemToDelete(null);
  };

  // Add this function to handle system status toggle
  const handleToggleSystemStatus = (system: System, newStatus: boolean) => {
    // If turning off an active system, show confirmation dialog
    if (system.activeStatus && !newStatus) {
      setSystemStatusChange({
        id: parseInt(system.system_id),
        systemName: system.system_id,
        newStatus,
      });
    } else {
      // Otherwise, just update the status directly
      updateSystemStatus(parseInt(system.system_id), newStatus);
    }
  };

  // Add this function to handle the actual status update
  const updateSystemStatus = async (systemId: number, isActive: boolean) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/systems/${systemId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive }),
        }
      );

      if (!response.ok) throw new Error("Failed to update system status");

      // Refresh data after update
      await Promise.all([fetchSystemStats(), fetchSystems()]);

      toast.success(
        isActive
          ? "System activated successfully"
          : "System deactivated and polling stopped"
      );
    } catch (error) {
      toast.error("Failed to update system status", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to the ManageSystemsPage component
  const handleUpdateStats = (updatedStats: SystemStats) => {
    setStats(updatedStats);
  };

  const handleRefreshStats = () => {
    fetchSystemStats();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-background/95">
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent">
            Manage Systems
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your connected SAP systems
          </p>
        </div>

        {/* Pass stats and isLoading as props */}
        <StatsCards stats={stats} isLoading={isLoading} />

        {/* Systems Table */}
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Search systems..." className="pl-9" />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon">
                  <FilterIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <SortAscIcon className="h-4 w-4" />
                </Button>
                <Button onClick={() => setIsAddSystemSheetOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add System
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <TableLoadingState />
          ) : systems.length === 0 ? (
            <EmptyState onAdd={() => setIsAddSystemSheetOpen(true)} />
          ) : (
            <SystemsTable
              systems={systems}
              onDelete={setSystemToDelete}
              onEdit={(id) => console.log("Edit:", id)} // TODO: Implement edit
              onSettings={(id) => console.log("Settings:", id)} // TODO: Implement settings
              onToggleStatus={handleToggleSystemStatus}
              onUpdateStats={handleUpdateStats} // Add this line
              onRefreshStats={handleRefreshStats} // Pass refresh stats function
            />
          )}
        </Card>
      </main>

      {/* Add System Sheet */}
      <AddSystemSheet
        open={isAddSystemSheetOpen}
        onClose={() => setIsAddSystemSheetOpen(false)}
        onSubmit={handleAddSystem}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!systemToDelete}
        onClose={() => setSystemToDelete(null)}
        onConfirm={() => systemToDelete && handleDeleteSystem(systemToDelete)}
      />

      {/* System Status Confirmation Dialog */}
      {systemStatusChange && (
        <SystemStatusConfirmationDialog
          open={!!systemStatusChange}
          onClose={() => setSystemStatusChange(null)}
          onConfirm={() => {
            updateSystemStatus(
              systemStatusChange.id,
              systemStatusChange.newStatus
            );
            setSystemStatusChange(null);
          }}
          systemName={systemStatusChange.systemName}
        />
      )}
    </div>
  );
}

// Helper Components
const StatsCard = ({
  title,
  value,
  icon: Icon,
  loading,
  variant,
}: StatsCardProps) => (
  <Card className="p-6 bg-card/50 backdrop-blur border-border/50 shadow-lg transition-shadow hover:shadow-xl">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${getVariantClasses(variant)}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {loading ? (
          <div className="h-8 w-16 animate-pulse bg-muted rounded" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </div>
    </div>
  </Card>
);

interface SystemsTableProps {
  systems: System[];
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onSettings: (id: number) => void;
  onToggleStatus: (system: System, newStatus: boolean) => void;
  onUpdateStats: (stats: SystemStats) => void; // Add this prop
  onRefreshStats?: () => void; // Add this prop
}

// Update the useConnectionStatusPolling hook to prevent any stats updates
const useConnectionStatusPolling = (systems: System[], interval = 30000) => {
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkConnectionStatus = async (systemId: string) => {
      try {
        const response = await fetch(
            `https://shwsckbvbt.a.pinggy.link/api/conn?system_id=${systemId}`
        );
        if (!response.ok) throw new Error("Failed to fetch connection status");
        const data = await response.json();
        return { systemId, active: data.active };
    } catch (error) {
        console.error(
            `Error checking connection for system ${systemId}:`,
            error
        );
        return { systemId, active: false };
    }
    };

    const updateConnectionStatuses = async () => {
      // Only check connection statuses, don't update any other data
      const statusChecks = systems.map((system) =>
        checkConnectionStatus(system.system_id)
      );

      const results = await Promise.all(statusChecks);

      // Only update the connection statuses, nothing else
      setConnectionStatuses((prev) => {
        let hasChanges = false;
        const newStatuses = { ...prev };

        results.forEach(({ systemId, active }) => {
          if (newStatuses[systemId] !== active) {
            newStatuses[systemId] = active;
            hasChanges = true;
          }
        });

        // Only trigger a re-render if there are actual changes
        return hasChanges ? newStatuses : prev;
      });
    };

    // Initial check
    updateConnectionStatuses();

    // Set up polling interval
    const pollInterval = setInterval(updateConnectionStatuses, interval);

    // Clean up interval on unmount
    return () => clearInterval(pollInterval);
  }, [systems, interval]);

  return connectionStatuses;
};

const SystemsTable = ({
  systems,
  onDelete,
  onEdit,
  onSettings,
  onToggleStatus,
  onUpdateStats,
  onRefreshStats,
}: SystemsTableProps) => {
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string>("");
  const [localSystems, setLocalSystems] = useState<System[]>(systems);
  const connectionStatuses = useConnectionStatusPolling(localSystems);
  const [connectionDisplay, setConnectionDisplay] = useState({
    connected: 0,
    disconnected: 0,
  });

  // First, add these state variables in the SystemsTable component
  const [showPollingConfirmDialog, setShowPollingConfirmDialog] =
    useState(false);
  const [showActiveConfirmDialog, setShowActiveConfirmDialog] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    systemId: string;
    currentStatus: boolean;
    type: "polling" | "active";
    description?: string;
    activeStatus?: boolean;
    pollingStatus?: boolean;
  } | null>(null);

  // Add a new state for the activation reminder dialog
  const [showActivationReminderDialog, setShowActivationReminderDialog] =
    useState(false);

  // Update local state when systems prop changes
  useEffect(() => {
    setLocalSystems(systems);
  }, [systems]);

  useEffect(() => {
    // This effect ONLY updates the visual display of connection status
    // It does NOT update the API or global stats
    if (Object.keys(connectionStatuses).length > 0) {
      // Count connected and disconnected systems for visual display only
      const connectedCount = Object.values(connectionStatuses).filter(
        (status) => status
      ).length;

      // Update local state variable for display purposes only
      setConnectionDisplay({
        connected: connectedCount,
        disconnected: localSystems.length - connectedCount,
      });
    }
  }, [connectionStatuses, localSystems.length]);

  const handlePollingStatusChange = async (
    systemId: string,
    currentStatus: boolean,
    currentActiveStatus: boolean,
    description: string
  ) => {
    setIsUpdating(`polling-${systemId}`);

    try {
      console.log(
        "Polling status change:",
        systemId,
        !currentStatus,
        description
      );

      const formData = new FormData();
      formData.append("systemId", systemId);
      formData.append("pollingStatus", (!currentStatus).toString());
      formData.append("activeStatus", currentActiveStatus.toString());
      formData.append("description", description);

      const response = await axios.post(
        "https://shwsckbvbt.a.pinggy.link/api/sys",
        formData,
        {
          headers: {
            Accept: "*/*",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status !== 200)
        throw new Error("Failed to update polling status");

      // Update local state after successful API call
      const updatedSystems = localSystems.map((sys) =>
        sys.system_id === systemId
          ? { ...sys, pollingStatus: !currentStatus }
          : sys
      );

      setLocalSystems(updatedSystems);

      // Update stats based on the local state change
      updateLocalStats(updatedSystems);

      // FIXED: Correct toast.success usage
      toast.success(`Polling status updated`, {
        description: `Polling ${
          !currentStatus ? "enabled" : "disabled"
        } for system ${systemId}`,
      });
    } catch (error) {
      // FIXED: Correct toast.error usage
      toast.error(`Failed to update polling status`, {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsUpdating("");
    }
  };

  const handleActiveStatusChange = async (
    systemId: string,
    currentStatus: boolean
  ) => {
    setIsUpdating(`active-${systemId}`);

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append("systemId", systemId);

      // Set the new active status (opposite of current)
      const newActiveStatus = !currentStatus;
      formData.append("activeStatus", newActiveStatus.toString());

      // Get the current system to include its description
      const currentSystem = localSystems.find(
        (sys) => sys.system_id === systemId
      );
      if (!currentSystem) throw new Error("System not found");

      formData.append("description", currentSystem.description || "");

      // When turning active status OFF, also set polling to OFF
      // When turning active status ON, keep polling status as is
      const newPollingStatus = newActiveStatus
        ? currentSystem.pollingStatus
        : false;
      formData.append("pollingStatus", newPollingStatus.toString());

      // Make the API request using FormData
      const response = await axios.post(
        "https://shwsckbvbt.a.pinggy.link/api/sys",
        formData,
        {
          headers: {
            Accept: "*/*",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status !== 200)
        throw new Error("Failed to update active status");

      // Update local state after successful API call - update BOTH active and polling status
      const updatedSystems = localSystems.map((sys) =>
        sys.system_id === systemId
          ? {
              ...sys,
              activeStatus: !currentStatus,
              // If turning active OFF, also turn polling OFF
              pollingStatus: newActiveStatus ? sys.pollingStatus : false,
            }
          : sys
      );

      setLocalSystems(updatedSystems);

      // Update stats based on the local state change
      updateLocalStats(updatedSystems);

      // Different messages for activation vs deactivation
      if (newActiveStatus) {
        // System was activated
        toast.success(`System activated successfully`, {
          description: `The system ${systemId} has been activated`,
        });

        // Show a reminder toast for polling if it's not enabled
        if (!currentSystem.pollingStatus) {
          toast.info(`Reminder: Turn on polling`, {
            description: `Remember to enable polling for ${systemId} to start collecting data`,
            duration: 5000,
            action: {
              label: "Enable Now",
              onClick: () => {
                // Enable polling for this system
                handlePollingStatusChange(
                  systemId,
                  false, // current status (false = not polling)
                  true, // active status is now true
                  currentSystem.description || ""
                );
              },
            },
          });
        }
      } else {
        // System was deactivated
        toast.success(`System deactivated successfully`, {
          description: `The system ${systemId} has been deactivated and polling has been stopped`,
        });
      }
    } catch (error) {
      toast.error("Failed to update active status", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUpdating("");
    }
  };

  const handleEditClick = (system: System) => {
    setSelectedSystem(system);
    setIsEditSheetOpen(true);
  };

  const handleUpdateDescription = async (
    systemId: string,
    description: string
  ) => {
    try {
      const response = await fetch("https://shwsckbvbt.a.pinggy.link/api/sys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemId,
          description,
        }),
      });

      if (!response.ok) throw new Error("Failed to update system");

      // Update local state
      setLocalSystems((prev) =>
        prev.map((sys) =>
          sys.system_id === systemId ? { ...sys, description } : sys
        )
      );
    } catch (error) {
      throw error;
    }
  };

  // Update the toggle handlers to handle both cases
  const handlePollingToggleClick = (
    systemId: string,
    currentStatus: boolean,
    currentActiveStatus: boolean,
    description: string
  ) => {
    // If trying to turn ON polling while system is NOT active, show warning
    if (!currentStatus && !currentActiveStatus) {
      // Show a more prominent toast warning
      toast.error("System Must Be Active First", {
        description:
          "You need to activate the system before enabling polling for data collection.",
        duration: 5000,
        position: "top-center",
        action: {
          label: "Activate System",
          onClick: () => {
            // Turn on active status first
            handleActiveToggleClick(
              systemId,
              false, // current active status (false = not active)
              false // current polling status (false)
            );
          },
        },
      });
      return;
    }

    // Continue with normal polling toggle logic for other cases
    setPendingChange({
      systemId,
      currentStatus,
      type: "polling",
      description,
      activeStatus: currentActiveStatus,
    });
    setShowPollingConfirmDialog(true);
  };

  const handleActiveToggleClick = (
    systemId: string,
    currentStatus: boolean,
    pollingStatus: boolean
  ) => {
    // If turning OFF an active system, show deactivation warning
    if (currentStatus) {
      setPendingChange({
        systemId,
        currentStatus,
        type: "active",
        pollingStatus: pollingStatus,
      });
      setShowActiveConfirmDialog(true);
    }
    // When turning ON, no need for warning about deactivation,
    // but remind about polling if needed
    else {
      // Set pending change for the system being activated
      setPendingChange({
        systemId,
        currentStatus,
        type: "active",
        pollingStatus: pollingStatus,
      });

      // If polling is already on, no need for reminder, just activate
      if (pollingStatus) {
        handleActiveStatusChange(systemId, currentStatus);
      }
      // If polling is off, show the reminder dialog
      else {
        setShowActivationReminderDialog(true);
      }
    }
  };

  // Add confirmation dialog components
  const PollingConfirmationDialog = () => {
    // Check if trying to enable polling on inactive system (defensive)
    const isEnablingPollingOnInactiveSystem =
      pendingChange &&
      !pendingChange.currentStatus &&
      !pendingChange.activeStatus;

    return (
      <AlertDialog
        open={showPollingConfirmDialog}
        onOpenChange={() => {
          setShowPollingConfirmDialog(false);
          setPendingChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Polling Status</AlertDialogTitle>
            {isEnablingPollingOnInactiveSystem ? (
              <AlertDialogDescription className="space-y-2">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">System must be active first</p>
                    <p className="text-sm">
                      You cannot enable polling for an inactive system. Please
                      activate the system first.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription>
                Are you sure you want to{" "}
                {pendingChange?.currentStatus ? "disable" : "enable"} polling
                for this system? This will affect the system's monitoring
                status.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowPollingConfirmDialog(false);
                setPendingChange(null);
              }}
            >
              {isEnablingPollingOnInactiveSystem ? "Understood" : "Cancel"}
            </AlertDialogCancel>
            {!isEnablingPollingOnInactiveSystem && (
              <AlertDialogAction
                onClick={() => {
                  if (pendingChange) {
                    handlePollingStatusChange(
                      pendingChange.systemId,
                      pendingChange.currentStatus,
                      pendingChange.activeStatus!,
                      pendingChange.description!
                    );
                  }
                  setShowPollingConfirmDialog(false);
                  setPendingChange(null);
                }}
              >
                Confirm
              </AlertDialogAction>
            )}
            {isEnablingPollingOnInactiveSystem && (
              <Button
                onClick={() => {
                  // Close this dialog
                  setShowPollingConfirmDialog(false);
                  setPendingChange(null);

                  // If we have system details, attempt to activate it
                  if (pendingChange) {
                    handleActiveToggleClick(
                      pendingChange.systemId,
                      false, // current active status (false)
                      false // current polling status (false)
                    );
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Activate System
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const ActiveConfirmationDialog = () => (
    <AlertDialog
      open={showActiveConfirmDialog}
      onOpenChange={() => {
        setShowActiveConfirmDialog(false);
        setPendingChange(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Deactivate System and Stop Polling?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to deactivate system{" "}
              <strong>{pendingChange?.systemId}</strong>.
            </p>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3 text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Note: Deactivating the system will automatically disable
                  Polling
                </p>
                {pendingChange?.pollingStatus && (
                  <p className="text-sm mt-1 font-bold">
                    Warning: Polling is currently active. Deactivating this
                    system will immediately stop data collection.
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setShowActiveConfirmDialog(false);
              setPendingChange(null);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingChange) {
                handleActiveStatusChange(
                  pendingChange.systemId,
                  pendingChange.currentStatus
                );
              }
              setShowActiveConfirmDialog(false);
              setPendingChange(null);
            }}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
          >
            Deactivate System
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const ActivationReminderDialog = () => (
    <AlertDialog
      open={showActivationReminderDialog}
      onOpenChange={() => {
        setShowActivationReminderDialog(false);
        setPendingChange(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Activate System</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are activating system{" "}
              <strong>{pendingChange?.systemId}</strong>, but polling is
              currently disabled.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Activity className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Enable Polling for Data Collection
                </p>
                <p className="text-sm">
                  For the system to collect data, you'll need to turn on polling
                  after activation. Would you like to activate the system with
                  polling turned on?
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setShowActivationReminderDialog(false);
              setPendingChange(null);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              // Just activate the system without turning on polling
              if (pendingChange) {
                handleActiveStatusChange(
                  pendingChange.systemId,
                  pendingChange.currentStatus
                );
              }
              setShowActivationReminderDialog(false);
              setPendingChange(null);
            }}
          >
            Activate Only
          </Button>
          <AlertDialogAction
            onClick={() => {
              // Activate the system WITH polling in a single API call
              if (pendingChange) {
                handleActivateWithPolling(
                  pendingChange.systemId,
                  pendingChange.currentStatus
                );
              }
              setShowActivationReminderDialog(false);
              setPendingChange(null);
            }}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
          >
            Activate with Polling
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Update this function to separate connection status from other stats
  const updateLocalStats = (systems: System[]) => {
    // NEVER update connection stats here - those are handled separately
    const updatedStats = {
      totalSystems: systems.length,
      activeSystems: systems.filter((sys) => sys.activeStatus).length,
      inactiveSystems: systems.filter((sys) => !sys.activeStatus).length,
      // Keep the connectionStats unchanged - handled by the useConnectionStatusPolling hook
      connectionStats: {
        connected: connectionDisplay.connected, // Use the local connection display state
        disconnected: connectionDisplay.disconnected,
      },
    };

    onUpdateStats(updatedStats);
  };

  // Add this new function to handle activating with polling in one API call
  const handleActivateWithPolling = async (
    systemId: string,
    currentActiveStatus: boolean
  ) => {
    setIsUpdating(`active-${systemId}`);

    try {
      // Get the current system to include its description
      const currentSystem = localSystems.find(
        (sys) => sys.system_id === systemId
      );
      if (!currentSystem) throw new Error("System not found");

      // Create FormData for a single API call that sets both statuses
      const formData = new FormData();
      formData.append("systemId", systemId);
      formData.append("activeStatus", "true"); // Always true when activating
      formData.append("pollingStatus", "true"); // Always true with this function
      formData.append("description", currentSystem.description || "");

      // Make the API request using FormData
      const response = await axios.post(
        "https://shwsckbvbt.a.pinggy.link/api/sys",
        formData,
        {
          headers: {
            Accept: "*/*",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to update system status");
      }

      // Update local state after successful API call
      const updatedSystems = localSystems.map((sys) =>
        sys.system_id === systemId
          ? {
              ...sys,
              activeStatus: true, // Set active to true
              pollingStatus: true, // Set polling to true
            }
          : sys
      );

      setLocalSystems(updatedSystems);

      // Update stats based on the local state change
      updateLocalStats(updatedSystems);

      // Success toast for both activations
      toast.success(`System activated with polling`, {
        description: `System ${systemId} has been activated and polling has been enabled`,
      });
    } catch (error) {
      toast.error("Failed to update system status", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUpdating("");
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>System ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Instance</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Connection Status</TableHead>
              <TableHead>Polling Status</TableHead>
              <TableHead>Active Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localSystems.map((system) => (
              <TableRow key={system.system_id}>
                <TableCell>{system.no}</TableCell>
                <TableCell className="font-medium">{system.system_id}</TableCell>
                <TableCell>{system.type}</TableCell>
                <TableCell>{system.instance}</TableCell>
                <TableCell>{system.client}</TableCell>
                <TableCell>{system.description}</TableCell>
                <TableCell>
                  <div
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      connectionStatuses[system.system_id]
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          connectionStatuses[system.system_id]
                            ? "bg-blue-600 dark:bg-blue-400 animate-pulse"
                            : "bg-red-600 dark:bg-red-400"
                        }`}
                      ></div>
                      {connectionStatuses[system.system_id]
                        ? "Connected"
                        : "Disconnected"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {!system.activeStatus ? (
                    // Use PopoverWarningButton for inactive systems
                    <div className="flex items-center">
                      <PopoverWarningButton
                        hint="System must be active to enable polling"
                        disabled={true}
                        className="flex items-center justify-start p-0 m-0 cursor-not-allowed"
                      >
                        <Switch
                        />
                      </PopoverWarningButton>
                    </div>
                  ) : (
                    // Use standard Switch with improved tooltip for active systems
                    <div className="group relative">
                      <Switch
                        checked={system.pollingStatus}
                        disabled={isUpdating === `polling-${system.system_id}`}
                        onCheckedChange={() =>
                          handlePollingToggleClick(
                            system.system_id,
                            system.pollingStatus,
                            system.activeStatus,
                            system.description
                          )
                        }
                      />
                      {/* Enhanced tooltip with arrow for active systems */}
                      <div
                        className={cn(
                          "absolute z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200",
                          "w-max max-w-xs bottom-full left-1/2 -translate-x-1/2 mb-2",
                          "bg-black/90 text-white border border-gray-700",
                          "rounded-md shadow-lg py-2 px-3 text-xs",
                          "after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:top-full",
                          "after:border-5 after:border-transparent",
                          "after:border-t-black/90"
                        )}
                      >
                        <span>
                          {system.pollingStatus
                            ? "Click to disable polling"
                            : "Click to enable polling"}
                        </span>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={system.activeStatus}
                    // disabled={isUpdating === `active-${system.system_id}`}
                    onCheckedChange={() =>
                      handleActiveToggleClick(
                        system.system_id,
                        system.activeStatus,
                        system.pollingStatus // Pass the current polling status
                      )
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(system)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSettings(parseInt(system.system_id))}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PollingConfirmationDialog />
      <ActiveConfirmationDialog />
      <ActivationReminderDialog />
      <EditSystemSheet
        open={isEditSheetOpen}
        onClose={() => {
          setIsEditSheetOpen(false);
          setSelectedSystem(null);
        }}
        system={selectedSystem ? {
          ...selectedSystem,
          systemId: selectedSystem.system_id,
          id: selectedSystem.system_id
        } : null}
        onSubmit={handleUpdateDescription}
      />
    </>
  );
};

const TableLoadingState = () => (
  <div className="p-8">
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
      ))}
    </div>
  </div>
);

const EmptyState = ({ onAdd }: EmptyStateProps) => (
  <div className="p-12 text-center">
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 rounded-full bg-primary/10">
        <MonitorDot className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium">No systems found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Get started by adding your first SAP system for monitoring.
      </p>
      <Button onClick={onAdd} className="mt-4">
        <Plus className="w-4 h-4 mr-2" />
        Add New System
      </Button>
    </div>
  </div>
);

const DeleteConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
}: DeleteConfirmationDialogProps) => (
  <AlertDialog open={open} onOpenChange={onClose}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the system
          and remove all associated data.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const AddSystemSheet = ({
  open,
  onClose,
  onSubmit,
  isLoading,
}: AddSystemSheetProps) => (
  <Sheet open={open} onOpenChange={onClose}>
    <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px]">
      <SheetHeader>
        <SheetTitle>Add New System</SheetTitle>
        <p className="text-sm text-muted-foreground">
          Enter the system details below to add a new monitoring system.
        </p>
      </SheetHeader>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
              System Source <span className="text-red-500">*</span>
            </label>
            <Input
              name="source"
              placeholder="Enter system URL (e.g., http://system.example.com)"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The URL of the system you want to monitor
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <Input
                name="username"
                placeholder="Enter username"
                required
                disabled={isLoading}
              />
            </div>

            <div></div>
            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              name="password"
              placeholder="Enter password"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground/90 block mb-1.5">
            System Name
          </label>
          <Input
            name="name"
            placeholder="Enter a friendly name for this system"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            A descriptive name to identify this system
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground/90 block mb-1.5">
            Description
          </label>
          <Textarea
            name="description"
            placeholder="Enter system description"
            className="resize-none"
            rows={3}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Additional details about this system (optional)
          </p>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Validating...
              </>
            ) : (
              "Add System"
            )}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
);

// Utility function for variant classes
const getVariantClasses = (variant: "blue" | "green" | "red"): string => {
  switch (variant) {
    case "blue":
    case "red":
      return "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

// Update the stats cards section
const StatsCards = ({ stats, isLoading }: StatsCardsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <StatsCard
      title="Total Systems"
      value={stats.totalSystems}
      icon={MonitorDot}
      loading={isLoading}
      variant="blue"
    />
    <StatsCard
      title="Active Systems"
      value={stats.activeSystems}
      icon={Activity}
      loading={isLoading}
      variant="green"
    />
    <StatsCard
      title="Inactive Systems"
      value={stats.inactiveSystems}
      icon={AlertCircle}
      loading={isLoading}
      variant="red"
    />
  </div>
);

// Now let's create the confirmation dialog component
const SystemStatusConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  systemName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  systemName: string;
}) => (
  <AlertDialog open={open} onOpenChange={onClose}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Deactivate System and Stop Polling?</AlertDialogTitle>
        <AlertDialogDescription>
          You are about to deactivate system <strong>{systemName}</strong>. This
          will automatically stop the polling process for this system. Data
          collection will cease until the system is activated again.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
        >
          Deactivate System
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
