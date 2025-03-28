"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Shield, Edit, Trash2 } from "lucide-react";

// Define types
interface User {
  user_id: string;
  name: string;
  mail_id: string;
  role: string;
}

interface System {
  instance: string;
  activeStatus: boolean;
  system_id: string;
  client: number;
  description: string;
  type: string;
  pollingStatus: boolean;
}

interface UserSystem {
  id: string;
  user_id: string;
  name: string;
  email: string;
  auth_level: string;
  system: string;
}

interface MonitoringArea {
  system_name: string;
  mon_area_name: string;
  mon_area_desc: string;
  created_at: string;
  created_by: string;
  modified_at: string;
  modified_by: string;
}

interface KpiGroup {
  system_name: string;
  kpi_grp_name: string;
  kpi_grp_desc: string;
  mon_area: string;
  instance: boolean;
  is_active: boolean;
  sapfrequency: string;
  sysfrequency: string;
  created_at: string;
  created_by: string;
  modified_at: string;
  modified_by: string;
}

interface Kpi {
  system_name: string;
  kpi_name: string;
  kpi_desc: string;
  kpi_group: string;
  parent: boolean;
  unit: string;
  drilldown: boolean;
  filter: boolean;
  g2y: number | null;
  y2r: number | null;
  direction: string;
  criticality: string;
}

type AuthLevelType = "Monitoring Areas" | "KPI Group" | "KPIs";

export default function ManageUserPage() {
  // Form states
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [authLevel, setAuthLevel] = useState<string>("");
  const [systemId, setSystemId] = useState<string>("");

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [userSystems, setUserSystems] = useState<UserSystem[]>([]);
  const [monitoringAreas, setMonitoringAreas] = useState<MonitoringArea[]>([]);
  const [kpiGroups, setKpiGroups] = useState<KpiGroup[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  
  // Selection states
  const [selectedMAs, setSelectedMAs] = useState<Set<string>>(new Set());
  const [selectedKPIGroups, setSelectedKPIGroups] = useState<Set<string>>(new Set());
  const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMA, setIsLoadingMA] = useState(false);
  const [isLoadingKPIGroups, setIsLoadingKPIGroups] = useState(false);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(false);
  
  // UI states
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<UserSystem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTitle, setSidebarTitle] = useState("");

  // Form validation
  const isSystemSelectEnabled = Boolean(userId);
  const isAuthLevelEnabled = Boolean(userId && systemId);

  // Fetch data
  useEffect(() => {
    fetchUsers();
    fetchSystems();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        "https://shwsckbvbt.a.pinggy.link/api/um"
      );
      if (response.status === 200) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users", {
        description: "Please try again or contact support",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystems = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        "https://shwsckbvbt.a.pinggy.link/api/sys"
      );
      if (response.status === 200) {
        setSystems(response.data);
      }
    } catch (error) {
      console.error("Error fetching systems:", error);
      toast.error("Failed to fetch systems", {
        description: "Please try again or contact support",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Find user details
  const findUserDetails = (selectedUserId: string) => {
    const selectedUser = users.find((user) => user.user_id === selectedUserId);
    if (selectedUser) {
      setName(selectedUser.name);
      setEmail(selectedUser.mail_id);
    } else {
      setName("");
      setEmail("");
    }
  };

  // Add user system
  const handleAddUserSystem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !systemId || !authLevel) {
      toast.error("Missing required fields", {
        description: "Please fill in all required fields",
      });
      return;
    }

    // Find user details
    const user = users.find((u) => u.user_id === userId);
    const system = systems.find((s) => s.system_id === systemId);

    if (!user || !system) {
      toast.error("Invalid selection", {
        description: "Please select valid user and system",
      });
      return;
    }

    // Check if this combination already exists
    const exists = userSystems.some(
      (item) => item.user_id === userId && item.system === systemId
    );

    if (exists && !isEditing) {
      toast.error("Duplicate assignment", {
        description: "This user already has access to this system",
      });
      return;
    }

    const newUserSystem: UserSystem = {
      id: `${userId}-${systemId}`,
      user_id: userId,
      name: user.name,
      email: user.mail_id,
      auth_level: authLevel,
      system: systemId,
    };

    if (isEditing && editItem) {
      // Update existing
      setUserSystems((prevItems) =>
        prevItems.map((item) =>
          item.id === editItem.id ? newUserSystem : item
        )
      );

      toast.success("Access updated", {
        description: `Updated system access for ${user.name}`,
      });

      setIsEditing(false);
      setEditItem(null);
    } else {
      // Add new
      setUserSystems((prev) => [...prev, newUserSystem]);

      toast.success("Access granted", {
        description: `${user.name} now has ${authLevel} access to ${systemId}`,
      });
    }

    // Reset form
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setUserId("");
    setName("");
    setEmail("");
    setAuthLevel("");
    setSystemId("");
  };

  // Edit user system
  const handleEdit = (item: UserSystem) => {
    setUserId(item.user_id);
    setName(item.name);
    setEmail(item.email);
    setAuthLevel(item.auth_level);
    setSystemId(item.system);
    setIsEditing(true);
    setEditItem(item);
  };

  // Delete confirmation
  const handleDeleteConfirm = (id: string) => {
    setItemToDelete(id);
    setIsDeleting(true);
  };

  // Delete user system
  const confirmDelete = () => {
    if (itemToDelete) {
      setUserSystems((prev) => prev.filter((item) => item.id !== itemToDelete));

      toast.success("Access removed", {
        description: "User's system access has been revoked",
      });

      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  // Cancel operations
  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false);
      setEditItem(null);
      resetForm();
    }
  };

  // Add these API fetch functions for sidebar
  const fetchMonitoringAreas = async () => {
    setIsLoadingMA(true);
    try {
      const response = await axios.get(
        `https://shwsckbvbt.a.pinggy.link/api/ma?system=${systemId}`
      );
      if (response.status === 200) {
        setMonitoringAreas(response.data);
      } else {
        throw new Error("Failed to fetch monitoring areas");
      }
    } catch (error) {
      console.error("Error fetching monitoring areas:", error);
      toast.error("Failed to fetch monitoring areas", {
        description: "Please try again or contact support"
      });
    } finally {
      setIsLoadingMA(false);
    }
  };

  const fetchAllKPIGroups = async () => {
    setIsLoadingKPIGroups(true);
    try {
      const response = await axios.get(
        `https://shwsckbvbt.a.pinggy.link/api/kpigrp?system=${systemId}`
      );
      if (response.status === 200) {
        setKpiGroups(response.data);
      } else {
        throw new Error("Failed to fetch KPI groups");
      }
    } catch (error) {
      console.error("Error fetching KPI groups:", error);
      toast.error("Failed to fetch KPI groups", {
        description: "Please try again or contact support"
      });
    } finally {
      setIsLoadingKPIGroups(false);
    }
  };

  const fetchKPIGroups = async (monArea: string) => {
    setIsLoadingKPIGroups(true);
    try {
      const response = await axios.get(
        `https://shwsckbvbt.a.pinggy.link/api/kpigrp?mon_area=${monArea}&system=${systemId}`
      );
      if (response.status === 200) {
        // Add to existing KPI groups instead of replacing
        setKpiGroups(prev => {
          const newGroups = response.data;
          // Filter out duplicates based on kpi_grp_name
          const existingGroupNames = new Set(prev.map((g: KpiGroup) => g.kpi_grp_name));
          const filteredNewGroups = newGroups.filter(
            (g: KpiGroup) => !existingGroupNames.has(g.kpi_grp_name)
          );
          return [...prev, ...filteredNewGroups];
        });
      } else {
        throw new Error(`Failed to fetch KPI groups for ${monArea}`);
      }
    } catch (error) {
      console.error(`Error fetching KPI groups for ${monArea}:`, error);
      toast.error(`Failed to fetch KPI groups for ${monArea}`, {
        description: "Please try again or contact support"
      });
    } finally {
      setIsLoadingKPIGroups(false);
    }
  };

  const fetchAllKPIs = async () => {
    setIsLoadingKPIs(true);
    try {
      const response = await axios.get(
        `https://shwsckbvbt.a.pinggy.link/api/kpi?system=${systemId}`
      );
      if (response.status === 200) {
        setKpis(response.data);
      } else {
        throw new Error("Failed to fetch KPIs");
      }
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      toast.error("Failed to fetch KPIs", {
        description: "Please try again or contact support"
      });
    } finally {
      setIsLoadingKPIs(false);
    }
  };

  const fetchKPIs = async (kpiGroup: string) => {
    setIsLoadingKPIs(true);
    try {
      const response = await axios.get(
        `https://shwsckbvbt.a.pinggy.link/api/kpi?kpi_grp=${kpiGroup}&system=${systemId}`
      );
      if (response.status === 200) {
        // Add to existing KPIs instead of replacing
        setKpis(prev => {
          const newKpis = response.data;
          // Filter out duplicates based on kpi_name
          const existingKpiNames = new Set(prev.map((k: Kpi) => k.kpi_name));
          const filteredNewKpis = newKpis.filter(
            (k: Kpi) => !existingKpiNames.has(k.kpi_name)
          );
          return [...prev, ...filteredNewKpis];
        });
      } else {
        throw new Error(`Failed to fetch KPIs for ${kpiGroup}`);
      }
    } catch (error) {
      console.error(`Error fetching KPIs for ${kpiGroup}:`, error);
      toast.error(`Failed to fetch KPIs for ${kpiGroup}`, {
        description: "Please try again or contact support"
      });
    } finally {
      setIsLoadingKPIs(false);
    }
  };

  const handleMAChange = async (maName: string, checked: boolean) => {
    const newSelection = new Set(selectedMAs);

    if (checked) {
      newSelection.add(maName);
      await fetchKPIGroups(maName);
    } else {
      newSelection.delete(maName);

      // Remove KPI groups associated with this MA
      const relatedGroups = kpiGroups
        .filter(kg => kg.mon_area === maName)
        .map(kg => kg.kpi_grp_name);

      // Update KPI groups state - remove groups related to this MA
      setKpiGroups(prev => prev.filter(kg => kg.mon_area !== maName));

      // Also remove the related KPIs and their selections
      const newKPIGroupSelection = new Set(selectedKPIGroups);
      relatedGroups.forEach(group => {
        newKPIGroupSelection.delete(group);
      });

      setSelectedKPIGroups(newKPIGroupSelection);

      // Update KPI selections to remove any that were from these groups
      setSelectedKPIs(prev => {
        const newKPISelection = new Set(prev);
        kpis
          .filter(kpi => relatedGroups.includes(kpi.kpi_group))
          .forEach(kpi => {
            newKPISelection.delete(kpi.kpi_name);
          });
        return newKPISelection;
      });

      // Remove KPIs associated with the removed groups
      setKpis(prev => prev.filter(kpi => !relatedGroups.includes(kpi.kpi_group)));
    }

    setSelectedMAs(newSelection);
  };

  const handleKPIGroupChange = async (kpiGroup: string, checked: boolean) => {
    const newSelection = new Set(selectedKPIGroups);

    if (checked) {
      newSelection.add(kpiGroup);
      await fetchKPIs(kpiGroup);
    } else {
      newSelection.delete(kpiGroup);

      // Get KPIs associated with this group
      const relatedKPIs = kpis
        .filter(kpi => kpi.kpi_group === kpiGroup)
        .map(kpi => kpi.kpi_name);

      // Remove KPIs associated with this KPI Group
      setKpis(prev => prev.filter(kpi => kpi.kpi_group !== kpiGroup));

      // Update KPI selections to remove any that were from this group
      setSelectedKPIs(prev => {
        const newKPISelection = new Set(prev);
        relatedKPIs.forEach(kpiName => {
          newKPISelection.delete(kpiName);
        });
        return newKPISelection;
      });
    }

    setSelectedKPIGroups(newSelection);
  };

  const handleKPIChange = (kpiName: string, checked: boolean) => {
    setSelectedKPIs(prev => {
      const newSelection = new Set(prev);
      if (checked) {
        newSelection.add(kpiName);
      } else {
        newSelection.delete(kpiName);
      }
      return newSelection;
    });
  };

  // Handle saving the selections
  const handleSaveSelections = () => {
    // Format the data into a structure to save
    const authData = {
      userId,
      systemId,
      authLevel,
      selections: {
        monitoringAreas: Array.from(selectedMAs),
        kpiGroups: Array.from(selectedKPIGroups),
        kpis: Array.from(selectedKPIs)
      }
    };

    // Log for now, but this would send to an API
    console.log("Saving authorization data:", authData);

    // Would call an API here
    // Example: await axios.post("https://shwsckbvbt.a.pinggy.link/api/auth", authData);

    toast.success("User access configured", {
      description: `Authorization settings saved for ${name}`
    });

    setIsSidebarOpen(false);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">Manage User System Access</h1>
          <p className="text-muted-foreground mt-2">
            Assign systems to users and set their access levels
          </p>
        </div>

        {/* Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit User Access" : "Add User Access"}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "Modify system access for this user"
                : "Grant users access to specific systems"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUserSystem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* User Selection */}
                <div>
                  <Label htmlFor="userId" className="mb-2 block">
                    User ID <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={userId}
                    onValueChange={(value) => {
                      setUserId(value);
                      setSystemId(""); // Reset system when user changes
                      setAuthLevel(""); // Reset auth level when user changes
                      findUserDetails(value);
                    }}
                    disabled={isEditing}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Details (Auto-filled) */}
                <div>
                  <Label htmlFor="name" className="mb-2 block">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    readOnly
                    disabled
                    className="h-10 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    readOnly
                    disabled
                    className="h-10 disabled:cursor-not-allowed"
                  />
                </div>

                {/* System Selection */}
                <div>
                  <Label htmlFor="systemId" className="mb-2 block">
                    System <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={systemId}
                    onValueChange={(value) => {
                      setSystemId(value);
                      setAuthLevel(""); // Reset auth level when system changes
                    }}
                    disabled={!isSystemSelectEnabled || isEditing}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={
                        !isSystemSelectEnabled
                          ? "Select a user first"
                          : "Select a system"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {systems.map((system) => (
                        <SelectItem
                          key={system.system_id}
                          value={system.system_id}
                        >
                          {system.system_id} ({system.client})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Authorization Level */}
                <div>
                  <Label htmlFor="authLevel" className="mb-2 block">
                    Auth Level <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={authLevel}
                    onValueChange={(value) => {
                      setAuthLevel(value);
                      setSidebarTitle(value);
                      setIsSidebarOpen(true);
                      
                      // Clear previous selections when changing auth level
                      setSelectedMAs(new Set());
                      setSelectedKPIGroups(new Set());
                      setSelectedKPIs(new Set());
                      
                      // Empty data arrays
                      setMonitoringAreas([]);
                      setKpiGroups([]);
                      setKpis([]);
                      
                      // Fetch appropriate data based on auth level
                      if (value === "Monitoring Areas") {
                        fetchMonitoringAreas();
                      } else if (value === "KPI Group") {
                        fetchAllKPIGroups();
                      } else if (value === "KPIs") {
                        fetchAllKPIs();
                      }
                    }}
                    disabled={!isAuthLevelEnabled}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={
                        !isSystemSelectEnabled
                          ? "Select a user first"
                          : !isAuthLevelEnabled
                          ? "Select a system first"
                          : "Select level"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monitoring Areas">Monitoring Areas</SelectItem>
                      <SelectItem value="KPI Group">KPI Group</SelectItem>
                      <SelectItem value="KPIs">KPIs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={!userId || !systemId || !authLevel}
                >
                  {isEditing ? "Update Access" : "Grant Access"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* User Systems Table */}
        <Card>
          <CardHeader>
            <CardTitle>User System Access</CardTitle>
            <CardDescription>
              List of all user-system access assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userSystems.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <UserIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No access assignments found</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Assign users to systems using the form above
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Auth Level</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSystems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.user_id}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.system}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.auth_level}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteConfirm(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this system access? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authorization Configuration Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {authLevel} Configuration
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Configure {authLevel ? authLevel.toLowerCase() : ''} access for {name} on system {systemId}
            </p>
          </SheetHeader>

          <div className="py-6 space-y-8">
            {/* Monitoring Areas Section - only show for "Monitoring Areas" auth level */}
            {authLevel === "Monitoring Areas" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Monitoring Areas</h3>
                  <Badge variant="outline">
                    {selectedMAs.size} selected
                  </Badge>
                </div>

                {isLoadingMA ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : monitoringAreas.length > 0 ? (
                  <div className="space-y-2">
                    {monitoringAreas.map(ma => (
                      <div
                        key={ma.mon_area_name}
                        className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent/5"
                      >
                        <Checkbox
                          id={`ma-${ma.mon_area_name}`}
                          checked={selectedMAs.has(ma.mon_area_name)}
                          onCheckedChange={(checked) =>
                            handleMAChange(ma.mon_area_name, checked === true)
                          }
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`ma-${ma.mon_area_name}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {ma.mon_area_name}
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {ma.mon_area_desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No monitoring areas available for this system
                  </div>
                )}
              </div>
            )}

            {/* KPI Groups Section - show for "Monitoring Areas" and "KPI Group" auth levels */}
            {(authLevel === "Monitoring Areas" || authLevel === "KPI Group") && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">KPI Groups</h3>
                  <Badge variant="outline">
                    {selectedKPIGroups.size} selected
                  </Badge>
                </div>

                {isLoadingKPIGroups ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : kpiGroups.length > 0 ? (
                  <div className="space-y-2">
                    {kpiGroups.map(kg => (
                      <div
                        key={kg.kpi_grp_name}
                        className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent/5"
                      >
                        <Checkbox
                          id={`kg-${kg.kpi_grp_name}`}
                          checked={selectedKPIGroups.has(kg.kpi_grp_name)}
                          onCheckedChange={(checked) =>
                            handleKPIGroupChange(kg.kpi_grp_name, checked === true)
                          }
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`kg-${kg.kpi_grp_name}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {kg.kpi_grp_name}
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {kg.kpi_grp_desc}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Area: {kg.mon_area}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              SAP Freq: {kg.sapfrequency}s
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Sys Freq: {kg.sysfrequency}s
                            </Badge>
                            {kg.instance && (
                              <Badge variant="outline" className="text-xs">
                                Instance
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {authLevel === "Monitoring Areas"
                      ? "Select a monitoring area to view KPI groups"
                      : "No KPI groups available for this system"}
                  </div>
                )}
              </div>
            )}

            {/* KPIs Section - show for all auth levels */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">KPIs</h3>
                <Badge variant="outline">
                  {selectedKPIs.size} selected
                </Badge>
              </div>

              {isLoadingKPIs ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : kpis.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {kpis.map(kpi => (
                    <div
                      key={kpi.kpi_name}
                      className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent/5"
                    >
                      <Checkbox
                        id={`kpi-${kpi.kpi_name}`}
                        checked={selectedKPIs.has(kpi.kpi_name)}
                        onCheckedChange={(checked) =>
                          handleKPIChange(kpi.kpi_name, checked === true)
                        }
                      />
                      <div className="flex-1">
                        
                        <p className="text-sm text-muted-foreground">
                          {kpi.kpi_desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {authLevel === "KPIs"
                    ? "No KPIs available for this system"
                    : authLevel === "KPI Group"
                      ? "Select a KPI group to view KPIs"
                      : "Select a monitoring area and KPI group to view KPIs"}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsSidebarOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSelections}>
                Save Configuration
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}