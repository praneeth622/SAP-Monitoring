"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
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
  SortAscIcon 
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface System {
  id: number;
  systemId: string;
  systemName: string;
  systemType: string;
  pollingStatus: string;
  connectionStatus: string;
  isActive: boolean;
  no?: number; // Added to match backend response
}

interface SystemStats {
  totalSystems: number;
  pollingStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  systemStatus: {
    connected: number;
    disconnected: number;
  };
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
  variant: 'blue' | 'green' | 'red';
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

export default function ManageSystemsPage() {
  const [isAddSystemSheetOpen, setIsAddSystemSheetOpen] = useState(false)
  const [systems, setSystems] = useState<System[]>([])
  const [stats, setStats] = useState<SystemStats>({
    totalSystems: 0,
    pollingStatusBreakdown: [],
    systemStatus: {
      connected: 0,
      disconnected: 0
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const [systemToDelete, setSystemToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchSystemStats();
    fetchSystems();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3000/api/system-stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch system stats');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch system statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3000/api/systems');
      const result = await response.json();
      
      if (result.success) {
        setSystems(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch systems');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch systems",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSystem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setIsLoading(true);
    
    try {
      // First validate the system
      const validateResponse = await fetch('http://localhost:3000/api/system-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemName: formData.get('name'),
          systemType: formData.get('description'),
          systemSource: formData.get('source'),
          username: formData.get('username'),
          password: formData.get('password'),
        }),
      });

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        throw new Error(errorData.message || 'System validation failed');
      }

      const validatedSystem = await validateResponse.json();

      setIsAddSystemSheetOpen(false);
      toast({
        title: "Success",
        description: "System validated and added successfully.",
      });
      handleAddSystemSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add system",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSystemSuccess = async () => {
    await Promise.all([
      fetchSystemStats(),
      fetchSystems()
    ]);
  };

  const handleDeleteSystem = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/systems/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete system');
      
      await Promise.all([fetchSystemStats(), fetchSystems()]);
      
      toast({
        title: "Success",
        description: "System deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete system",
        variant: "destructive"
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

        {/* Stats Cards */}
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
            value={stats.systemStatus.connected}
            icon={Activity}
            loading={isLoading}
            variant="green"
          />
          <StatsCard
            title="Disconnected"
            value={stats.systemStatus.disconnected}
            icon={AlertCircle}
            loading={isLoading}
            variant="red"
          />
        </div>

        {/* Systems Table */}
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search systems..."
                  className="pl-9"
                />
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
              onEdit={(id) => console.log('Edit:', id)} // TODO: Implement edit
              onSettings={(id) => console.log('Settings:', id)} // TODO: Implement settings
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
  )
}

// Helper Components
const StatsCard = ({ title, value, icon: Icon, loading, variant }: StatsCardProps) => (
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

const SystemsTable = ({ systems, onDelete, onEdit, onSettings }: SystemsTableProps) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No</TableHead>
          <TableHead>System Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Polling Status</TableHead>
          <TableHead>Connection Status</TableHead>
          <TableHead>Active Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {systems.map((system, index) => (
          <TableRow key={system.id}>
            <TableCell>{system.no || index + 1}</TableCell>
            <TableCell className="font-medium">{system.systemName}</TableCell>
            <TableCell>{system.systemType}</TableCell>
            <TableCell>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                system.pollingStatus === 'Active'
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {system.pollingStatus}
              </div>
            </TableCell>
            <TableCell>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                system.connectionStatus === 'Connected'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {system.connectionStatus}
              </div>
            </TableCell>
            <TableCell>
              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                system.isActive
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {system.isActive ? 'Active' : 'Inactive'}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(system.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(system.id)}
                >
                  <Trash2 className="h-4 w-4" />
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
);

const TableLoadingState = () => (
  <div className="p-8">
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
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

const DeleteConfirmationDialog = ({ open, onClose, onConfirm }: DeleteConfirmationDialogProps) => (
  <AlertDialog open={open} onOpenChange={onClose}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete the
          system and remove all associated data.
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

const AddSystemSheet = ({ open, onClose, onSubmit, isLoading }: AddSystemSheetProps) => (
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

            <div>
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
              'Add System'
            )}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
);

// Utility function for variant classes
const getVariantClasses = (variant: 'blue' | 'green' | 'red'): string => {
  switch (variant) {
    case 'blue':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    case 'green':
      return 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400';
    case 'red':
      return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400';
  }
};