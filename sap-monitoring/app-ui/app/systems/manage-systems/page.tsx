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

// Update the System interface
interface System {
  id: string;
  systemId: string;
  instance: string;
  client: number;
  description: string;
  type: string;
  pollingStatus: boolean;
  activeStatus: boolean;
  no?: number;
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
          id: system.system_id,
          systemId: system.system_id,
          instance: system.instance,
          client: system.client,
          description: system.description,
          type: system.type,
          pollingStatus: system.pollingStatus,
          activeStatus: system.activeStatus,
          no: index + 1,
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
}

// First, add a custom hook for polling connection status
const useConnectionStatusPolling = (systems: System[], interval = 60000) => {
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<string, boolean>
  >({});

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

    const updateAllStatuses = async () => {
      const statusUpdates = await Promise.all(
        systems.map((system) => checkConnectionStatus(system.systemId))
      );

      setConnectionStatuses(
        statusUpdates.reduce((acc, { systemId, active }) => {
          acc[systemId] = active;
          return acc;
        }, {} as Record<string, boolean>)
      );
    };

    // Initial check
    updateAllStatuses();

    // Set up polling interval
    const pollInterval = setInterval(updateAllStatuses, interval);

    // Cleanup
    return () => clearInterval(pollInterval);
  }, [systems, interval]);

  return connectionStatuses;
};

// Update in your page.tsx
const SystemsTable = ({
  systems,
  onDelete,
  onEdit,
  onSettings,
}: SystemsTableProps) => {
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string>("");
  const [localSystems, setLocalSystems] = useState<System[]>(systems);
  const connectionStatuses = useConnectionStatusPolling(localSystems);

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
  } | null>(null);

  // Update local state when systems prop changes
  useEffect(() => {
    setLocalSystems(systems);
  }, [systems]);

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
      setLocalSystems((prev) =>
        prev.map((sys) =>
          sys.systemId === systemId
            ? { ...sys, pollingStatus: !currentStatus }
            : sys
        )
      );

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
      formData.append("activeStatus", (!currentStatus).toString());

      // Get the current system to include its description and polling status
      const currentSystem = localSystems.find(
        (sys) => sys.systemId === systemId
      );
      if (currentSystem) {
        formData.append("description", currentSystem.description || "");
        formData.append(
          "pollingStatus",
          currentSystem.pollingStatus.toString()
        );
      }

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

      // Update local state after successful API call
      setLocalSystems((prev) =>
        prev.map((sys) =>
          sys.systemId === systemId
            ? { ...sys, activeStatus: !currentStatus }
            : sys
        )
      );

      toast.success(
        `System ${!currentStatus ? "activated" : "deactivated"} successfully`,
        {
          description: `The system ${systemId} has been ${
            !currentStatus ? "activated" : "deactivated"
          }`,
        }
      );
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
          sys.systemId === systemId ? { ...sys, description } : sys
        )
      );
    } catch (error) {
      throw error;
    }
  };

  // Update the toggle handlers to show confirmation first
  const handlePollingToggleClick = (
    systemId: string,
    currentStatus: boolean,
    currentActiveStatus: boolean,
    description: string
  ) => {
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
    currentStatus: boolean
  ) => {
    setPendingChange({
      systemId,
      currentStatus,
      type: "active",
    });
    setShowActiveConfirmDialog(true);
  };

  // Add confirmation dialog components
  const PollingConfirmationDialog = () => (
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
          <AlertDialogDescription>
            Are you sure you want to{" "}
            {pendingChange?.currentStatus ? "disable" : "enable"} polling for
            this system? This will affect the system's monitoring status.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              setShowPollingConfirmDialog(false);
              setPendingChange(null);
            }}
          >
            Cancel
          </AlertDialogCancel>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

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
          <AlertDialogTitle>Change Active Status</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to{" "}
            {pendingChange?.currentStatus ? "deactivate" : "activate"} this
            system? This will affect the system's overall functionality.
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
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

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
              <TableRow key={system.id}>
                <TableCell>{system.no}</TableCell>
                <TableCell className="font-medium">{system.systemId}</TableCell>
                <TableCell>{system.type}</TableCell>
                <TableCell>{system.instance}</TableCell>
                <TableCell>{system.client}</TableCell>
                <TableCell>{system.description}</TableCell>
                <TableCell>
                  <div
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      connectionStatuses[system.systemId]
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {connectionStatuses[system.systemId]
                      ? "Connected"
                      : "Disconnected"}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={system.pollingStatus}
                    disabled={isUpdating === `polling-${system.systemId}`}
                    onCheckedChange={() =>
                      handlePollingToggleClick(
                        system.systemId,
                        system.pollingStatus,
                        system.activeStatus,
                        system.description
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={system.activeStatus}
                    disabled={isUpdating === `active-${system.systemId}`}
                    onCheckedChange={() =>
                      handleActiveToggleClick(
                        system.systemId,
                        system.activeStatus
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
                      onClick={() => onSettings(system.id)}
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
      <EditSystemSheet
        open={isEditSheetOpen}
        onClose={() => {
          setIsEditSheetOpen(false);
          setSelectedSystem(null);
        }}
        system={selectedSystem}
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
      return "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "green":
      return "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400";
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
