"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link  from 'next/link';

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
    role: string;
    setRole: (role: string) => void;
    userToEdit?: User | null;
}

interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

// Add this interface with the other interfaces
interface UpdateUserSheetProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    userToEdit: User | null;
    role: string;
    setRole: (role: string) => void;
}

export default function ManageSystemsPage() {
    const [isAddSystemSheetOpen, setIsAddSystemSheetOpen] = useState(false);
    const [systems, setSystems] = useState<System[]>([]);
    const [role, setRole] = useState<string>("");
    const [stats, setStats] = useState<SystemStats>({
        totalSystems: 0,
        pollingStatusBreakdown: [],
        systemStatus: {
            connected: 0,
            disconnected: 0,
        },
    });
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [systemToDelete, setSystemToDelete] = useState<number | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);

    useEffect(() => {
        fetchSystemStats();
        fetchSystems();
    }, []);

    const fetchSystemStats = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("http://localhost:3000/api/system-stats");
            const result = await response.json();

            if (result.success) {
                setStats(result.data);
            } else {
                throw new Error(result.message || "Failed to fetch system stats");
            }
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch system statistics",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSystems = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("http://localhost:3000/api/systems");
            const result = await response.json();

            if (result.success) {
                setSystems(result.data);
            } else {
                throw new Error(result.message || "Failed to fetch systems");
            }
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to fetch systems",
                variant: "destructive",
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
            toast({
                title: "Success",
                description: "System validated and added successfully.",
            });
            handleAddSystemSuccess();
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to add system",
                variant: "destructive",
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

            toast({
                title: "Success",
                description: "System deleted successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description:
                    error instanceof Error ? error.message : "Failed to delete system",
                variant: "destructive",
            });
        }
        setSystemToDelete(null);
    };

    // Add this function to handle user updates
    const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setIsLoading(true);
    
        try {
            if (!userToEdit) throw new Error("No user selected for update");
    
            const response = await fetch(`http://localhost:3000/api/users/${userToEdit.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    firstName: formData.get("firstname"),
                    lastName: formData.get("lastname"),
                    email: formData.get("email"),
                    role: role,
                }),
            });
    
            if (!response.ok) {
                throw new Error("Failed to update user");
            }
    
            setIsUpdateSheetOpen(false);
            setUserToEdit(null);
            toast({
                title: "Success",
                description: "User updated successfully.",
            });
            await fetchSystems(); // Refresh the user list
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update user",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-background/95">
            <main className="container mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent">
                        User Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor and manage User Profiles
                    </p>
                </div>

                {/* Systems Table */}
                <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg">
                    <div className="p-6 border-b border-border/50">
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input placeholder="Search Users..." className="pl-9" />
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
                                    Add New User
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
                            onEdit={(user) => {
                                setUserToEdit(user);
                                setRole(user.role);
                                setIsUpdateSheetOpen(true);
                            }}
                            onSettings={(id) => console.log("Settings:", id)} // TODO: Implement settings
                        />
                    )}
                </Card>
            </main>
            <AddSystemSheet
                open={isAddSystemSheetOpen}
                onClose={() => setIsAddSystemSheetOpen(false)}
                onSubmit={handleAddSystem}
                isLoading={isLoading}
                role={role}
                setRole={setRole}
                userToEdit={userToEdit}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={!!systemToDelete}
                onClose={() => setSystemToDelete(null)}
                onConfirm={() => systemToDelete && handleDeleteSystem(systemToDelete)}
            />

            {/* Create User Sheet */}
            <AddSystemSheet
                open={isAddSystemSheetOpen}
                onClose={() => setIsAddSystemSheetOpen(false)}
                onSubmit={handleAddSystem}
                isLoading={isLoading}
                role={role}
                setRole={setRole}
            />

            {/* Update User Sheet */}
            <UpdateUserSheet
                open={isUpdateSheetOpen}
                onClose={() => {
                    setIsUpdateSheetOpen(false);
                    setUserToEdit(null);
                    setRole("");
                }}
                onSubmit={handleUpdateUser}
                isLoading={isLoading}
                userToEdit={userToEdit}
                role={role}
                setRole={setRole}
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
    onEdit: (user: User) => void;
    onSettings: (id: number) => void;
}

const SystemsTable = ({
    systems,
    onDelete,
    onEdit,
    onSettings,
}: SystemsTableProps) => {
    const mockUsers: User[] = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'Admin' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'User' },
        { id: 3, firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com', role: 'Manager' },
    ];

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>User Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mockUsers.map((user, index) => (
                        <TableRow key={user.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">
                                {`${user.firstName} ${user.lastName}`}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <div className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    {user.role}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(user)}
                                        title="Edit Profile"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(user.id)}
                                        title="Delete User"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onSettings(user.id)}
                                        title="User Settings"
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
    role,
    setRole,
    userToEdit
}: AddSystemSheetProps) => (
    <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px]">
            <SheetHeader>
                <SheetTitle>{userToEdit ? 'Edit User' : 'Add User'}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                    {userToEdit 
                        ? 'Update the user details below.'
                        : 'Enter the user details below to add a new user.'}
                </p>
            </SheetHeader>
            <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        {/* <label className="text-sm font-medium text-foreground/90 block mb-1.5">
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
            </p> */}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="firstname"
                                placeholder="Enter First name"
                                required
                                disabled={isLoading}
                                defaultValue={userToEdit?.firstName || ''}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="lastname"
                                placeholder="Enter Last Name"
                                required
                                disabled={isLoading}
                                defaultValue={userToEdit?.lastName || ''}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                            E-Mail
                        </label>
                        <Input
                            name="email"
                            placeholder="Enter your E-mail"
                            disabled={isLoading}
                            defaultValue={userToEdit?.email || ''}
                        />
                    </div>

                    {/* Role Field */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="role">Role</Label>
                            
                        </div>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="User">User</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                            </SelectContent>
                        </Select>
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
                                {userToEdit ? 'Updating...' : 'Adding...'}
                            </>
                        ) : (
                            userToEdit ? 'Update User' : 'Add System'
                        )}
                    </Button>
                </div>
            </form>
        </SheetContent>
    </Sheet>
);

// Add this new component at the bottom of the file
const UpdateUserSheet = ({
    open,
    onClose,
    onSubmit,
    isLoading,
    userToEdit,
    role,
    setRole,
}: UpdateUserSheetProps) => (
    <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px]">
            <SheetHeader>
                <SheetTitle>Edit User</SheetTitle>
                <p className="text-sm text-muted-foreground">
                    Update the user details below.
                </p>
            </SheetHeader>
            <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="firstname"
                                placeholder="Enter First name"
                                required
                                disabled={isLoading}
                                defaultValue={userToEdit?.firstName || ''}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                name="lastname"
                                placeholder="Enter Last Name"
                                required
                                disabled={isLoading}
                                defaultValue={userToEdit?.lastName || ''}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                            E-Mail
                        </label>
                        <Input
                            name="email"
                            placeholder="Enter your E-mail"
                            disabled={isLoading}
                            defaultValue={userToEdit?.email || ''}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="role">Role</Label>
                        </div>
                        <Select 
                            value={role || userToEdit?.role || ''} 
                            onValueChange={setRole}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="User">User</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                            </SelectContent>
                        </Select>
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
                                Updating...
                            </>
                        ) : (
                            'Update User'
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
