"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  MonitorDot,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import { app_globals } from "../../../config/config"; 

interface User {
  user_id: string;
  name: string;
  mail_id: string;
  role: string;
  // Keep existing fields for compatibility
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface UserStats {
  totalUsers: number;
  roleBreakdown: Array<{
    role: string;
    count: number;
  }>;
  userStatus: {
    active: number;
    inactive: number;
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

interface AddUserSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  role: string;
  setRole: (role: string) => void;
  userToEdit?: User | null;
}

interface UpdateUserSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  userToEdit: User | null;
  role: string;
  setRole: (role: string) => void;
}

// Update roleColorMap keys to match the exact case used in the API
const roleColorMap: Record<
  string,
  {
    bg: string;
    text: string;
    darkBg: string;
    darkText: string;
  }
> = {
  "user": {
    bg: "bg-green-100",
    text: "text-green-700",
    darkBg: "dark:bg-green-900/40",
    darkText: "dark:text-green-400",
  },
  "admin": {
    bg: "bg-blue-100",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-900/40",
    darkText: "dark:text-blue-400",
  },
  "super admin": {
    bg: "bg-purple-100", 
    text: "text-purple-700",
    darkBg: "dark:bg-purple-900/40",
    darkText: "dark:text-purple-400",
  },
  // Default color for any other role
  default: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    darkBg: "dark:bg-gray-900/40",
    darkText: "dark:text-gray-400",
  },
};

const getRoleColor = (roleName: string) => {
  const role = roleName.toLowerCase();
  return {
    bg: roleColorMap[role]?.bg || roleColorMap.default.bg,
    text: roleColorMap[role]?.text || roleColorMap.default.text,
    darkBg: roleColorMap[role]?.darkBg || roleColorMap.default.darkBg,
    darkText: roleColorMap[role]?.darkText || roleColorMap.default.darkText,
  };
};

export default function ManageUsersPage() {
  const [isAddUserSheetOpen, setIsAddUserSheetOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    roleBreakdown: [],
    userStatus: {
      active: 0,
      inactive: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${app_globals.base_url}/api/um`);

      if (response.status === 200) {
        setUsers(response.data);

        // Update stats based on fetched users
        setStats({
          totalUsers: response.data.length,
          roleBreakdown: calculateRoleBreakdown(response.data),
          userStatus: {
            active: response.data.length,
            inactive: 0,
          },
        });
      } else {
        throw new Error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentUserRole = async () => {
    try {
      const response = await axios.get(`${app_globals.base_url}/api/um`);
      if (response.status === 200) {
        const users = response.data;
        const currentUser = users.find((user: any) => user.user_id === app_globals.default_user_id);
        if (currentUser) {
          setCurrentUserRole(currentUser.role);
        }
      }
    } catch (error) {
      console.error("Error fetching current user role:", error);
      // Set a default role if fetch fails
      setCurrentUserRole("user");
    }
  };

  // Helper function to calculate role breakdown
  const calculateRoleBreakdown = (users: User[]) => {
    const roleCount: Record<string, number> = {};

    users.forEach((user) => {
      if (roleCount[user.role]) {
        roleCount[user.role]++;
      } else {
        roleCount[user.role] = 1;
      }
    });

    return Object.entries(roleCount).map(([role, count]) => ({
      role,
      count,
    }));
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);

    try {
      const userData = {
        user_id: formData.get("userId"),
        name: `${formData.get("firstname")} ${formData.get("lastname")}`,
        mail_id: formData.get("email"),
        role: role,
      };

      // Wrap the userData in an array as required by the API
      const requestData = [userData];

      const response = await axios.post(
        `${app_globals.base_url}/api/um`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to add user");
      }

      // Close the form first
      setIsAddUserSheetOpen(false);

      // Show success message
      toast.success("User added successfully", {
        description: `User ${userData.name} has been created`,
      });

      // Fetch fresh data from the server
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Failed to add user", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await axios.delete(
        `${app_globals.base_url}/api/um/${userId}`
      );

      if (response.status !== 200) {
        throw new Error("Failed to delete user");
      }

      await fetchUsers();

      toast.success("User deleted successfully", {
        description: "User has been removed from the system",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
    setUserToDelete(null);
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);

    try {
      if (!userToEdit) throw new Error("No user selected for update");

      const userData = {
        user_id: formData.get("userId") || userToEdit.user_id,
        name: `${formData.get("firstname")} ${formData.get("lastname")}`,
        mail_id: formData.get("email"),
        role: role,
      };

      // Wrap the userData in an array as required by the API
      const requestData = [userData];

      // Use POST for update instead of PUT
      const response = await axios.post(
        `${app_globals.base_url}/api/um`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to update user");
      }

      setIsUpdateSheetOpen(false);
      setUserToEdit(null);
      toast.success("User updated successfully", {
        description: `User ${userData.name} has been updated`,
      });
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setRole(user.role);
    setIsUpdateSheetOpen(true);
  };

  const handleUserSettings = (id: string) => {
    // Implementation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-background/95">
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent">
            Manage User
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage user profiles
          </p>
        </div>

        {/* Users Table */}
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
                <Button onClick={() => setIsAddUserSheetOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New User
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <TableLoadingState />
          ) : users.length === 0 ? (
            <EmptyState onAdd={() => setIsAddUserSheetOpen(true)} />
          ) : (
            <UsersTable
              users={users}
              onDelete={setUserToDelete}
              onEdit={handleEditUser}
              onSettings={handleUserSettings}
              currentUserRole={currentUserRole}
            />
          )}
        </Card>
      </main>
      <AddUserSheet
        open={isAddUserSheetOpen}
        onClose={() => setIsAddUserSheetOpen(false)}
        onSubmit={handleAddUser}
        isLoading={isLoading}
        role={role}
        setRole={setRole}
        userToEdit={userToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => userToDelete && handleDeleteUser(userToDelete)}
      />

      {/* Create User Sheet */}
      <AddUserSheet
        open={isAddUserSheetOpen}
        onClose={() => setIsAddUserSheetOpen(false)}
        onSubmit={handleAddUser}
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

interface UsersTableProps {
  users: User[];
  onDelete: (id: string) => void;
  onEdit: (user: User) => void;
  onSettings: (id: string) => void;
  currentUserRole: string;
}

const UsersTable = ({
  users,
  onDelete,
  onEdit,
  onSettings,
  currentUserRole,
}: UsersTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <TableRow key={user.user_id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{user.user_id}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.mail_id}</TableCell>
              <TableCell>
                <div
                  className={cn(
                    "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                    roleColorMap[user.role.toLowerCase()]?.bg ||
                      roleColorMap.default.bg,
                    roleColorMap[user.role.toLowerCase()]?.text ||
                      roleColorMap.default.text,
                    roleColorMap[user.role.toLowerCase()]?.darkBg ||
                      roleColorMap.default.darkBg,
                    roleColorMap[user.role.toLowerCase()]?.darkText ||
                      roleColorMap.default.darkText
                  )}
                >
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
                  {currentUserRole.toLowerCase() === "super admin" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(user.user_id)}
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
      <h3 className="text-lg font-medium">No users found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Get started by adding your first user to the system.
      </p>
      <Button onClick={onAdd} className="mt-4">
        <Plus className="w-4 h-4 mr-2" />
        Add New User
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
          This action cannot be undone. This will permanently delete the user
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

const RoleSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="relative">
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select role">
          {value && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  roleColorMap[value.toLowerCase()]?.bg ||
                    roleColorMap.default.bg
                )}
              />
              {value}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {["User", "Admin", "Super Admin"].map((roleOption) => (
          <SelectItem
            key={roleOption}
            value={roleOption}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2 w-full">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  getRoleColor(roleOption).bg
                )}
              />
              <span className={getRoleColor(roleOption).text}>
                {roleOption}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const AddUserSheet = ({
  open,
  onClose,
  onSubmit,
  isLoading,
  role,
  setRole,
  userToEdit,
}: AddUserSheetProps) => (
  <Sheet open={open} onOpenChange={onClose}>
    <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px]">
      <SheetHeader>
        <SheetTitle>{userToEdit ? "Edit User" : "Add User"}</SheetTitle>
        <p className="text-sm text-muted-foreground">
          {userToEdit
            ? "Update the user details below."
            : "Enter the user details below to add a new user."}
        </p>
      </SheetHeader>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* User ID Field */}
          <div>
            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
              User ID <span className="text-red-500">*</span>
            </label>
            <Input
              name="userId"
              placeholder="Enter User ID"
              required
              disabled={isLoading || (userToEdit?.user_id ? true : false)}
              defaultValue={userToEdit?.user_id || ""}
            />
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
                defaultValue={userToEdit ? userToEdit.name.split(" ")[0] : ""}
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
                defaultValue={
                  userToEdit
                    ? userToEdit.name.split(" ").slice(1).join(" ")
                    : ""
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground/90 block mb-1.5">
              E-Mail <span className="text-red-500">*</span>
            </label>
            <Input
              name="email"
              type="email"
              placeholder="Enter your E-mail"
              required
              disabled={isLoading}
              defaultValue={userToEdit?.mail_id || ""}
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
            </div>
            <RoleSelect value={role} onChange={setRole} />
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
          <Button type="submit" disabled={isLoading || !role}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                {userToEdit ? "Updating..." : "Adding..."}
              </>
            ) : userToEdit ? (
              "Update User"
            ) : (
              "Add User"
            )}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
);

const UpdateUserSheet = ({
  open,
  onClose,
  onSubmit,
  isLoading,
  userToEdit,
  role,
  setRole,
}: UpdateUserSheetProps) => {
  // State to manage multiple role selections - with proper initialization
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Update selectedRoles when userToEdit changes
  useEffect(() => {
    if (userToEdit?.role) {
      // Initialize with the user's existing role
      setSelectedRoles([userToEdit.role]);
    } else {
      setSelectedRoles([]);
    }
  }, [userToEdit]);

  // Update parent component's role state when selections change
  useEffect(() => {
    if (selectedRoles.length > 0) {
      setRole(selectedRoles[0]); // Use first role since API only accepts a single role
    } else {
      setRole("");
    }
  }, [selectedRoles, setRole]);

  return (
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
            {/* User ID field */}
            <div>
              <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                User ID
              </label>
              <Input
                name="userId"
                value={userToEdit?.user_id || ""}
                disabled={true}
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                User ID cannot be changed
              </p>
            </div>

            {/* First name and last name fields */}
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
                  defaultValue={userToEdit ? userToEdit.name.split(" ")[0] : ""}
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
                  defaultValue={
                    userToEdit
                      ? userToEdit.name.split(" ").slice(1).join(" ")
                      : ""
                  }
                />
              </div>
            </div>

            {/* Email field */}
            <div>
              <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                E-Mail <span className="text-red-500">*</span>
              </label>
              <Input
                name="email"
                type="email"
                placeholder="Enter your E-mail"
                required
                disabled={isLoading}
                defaultValue={userToEdit?.mail_id || ""}
              />
            </div>

            {/* Role field - Multi-select with proper handling */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="role">
                  Role <span className="text-red-500">*</span>
                </Label>
              </div>

              <Select 
                value={selectedRoles.length > 0 ? selectedRoles[0] : ""} 
                onValueChange={(value) => setSelectedRoles([value])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role">
                    {selectedRoles.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            roleColorMap[selectedRoles[0].toLowerCase()]?.bg ||
                              roleColorMap.default.bg
                          )}
                        />
                        {selectedRoles[0]}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {["User", "Admin", "Super Admin"].map((roleOption) => (
                    <SelectItem
                      key={roleOption}
                      value={roleOption}
                      className="flex items-center gap-2"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            getRoleColor(roleOption).bg
                          )}
                        />
                        <span className={getRoleColor(roleOption).text}>
                          {roleOption}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedRoles.length === 0 && (
                <p className="text-xs text-red-500">
                  Please select a role
                </p>
              )}
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
            <Button
              type="submit"
              disabled={isLoading || selectedRoles.length === 0}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⌛</span>
                  Updating...
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

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
