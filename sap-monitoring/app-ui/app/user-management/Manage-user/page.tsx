// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { toast } from "sonner";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
// } from "@/components/ui/sheet";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Badge } from "@/components/ui/badge";
// import {
//   User as UserIcon,
//   Plus,
//   Edit,
//   Trash2,
//   Settings,
//   Search,
//   Filter,
//   Eye,
// } from "lucide-react";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";

// // Define types
// interface User {
//   user_id: string;
//   name: string;
//   mail_id: string;
//   role: string;
// }

// interface System {
//   instance: string;
//   activeStatus: boolean;
//   system_id: string;
//   client: number;
//   description: string;
//   type: string;
//   pollingStatus: boolean;
// }

// interface UserSystem {
//   id: string;
//   user_id: string;
//   name: string;
//   email: string;
//   auth_level: string;
//   system: string;
//   configurations?: {
//     monitoringAreas: string[];
//     kpiGroups: string[];
//     kpis: string[];
//   };
// }

// interface MonitoringArea {
//   system_name: string;
//   mon_area_name: string;
//   mon_area_desc: string;
//   created_at: string;
//   created_by: string;
//   modified_at: string;
//   modified_by: string;
// }

// interface KpiGroup {
//   system_name: string;
//   kpi_grp_name: string;
//   kpi_grp_desc: string;
//   mon_area: string;
//   instance: boolean;
//   is_active: boolean;
//   sapfrequency: string;
//   sysfrequency: string;
//   created_at: string;
//   created_by: string;
//   modified_at: string;
//   modified_by: string;
// }

// interface Kpi {
//   system_name: string;
//   kpi_name: string;
//   kpi_desc: string;
//   kpi_group: string;
//   parent: boolean;
//   unit: string;
//   drilldown: boolean;
//   filter: boolean;
//   g2y: number | null;
//   y2r: number | null;
//   direction: string;
//   criticality: string;
// }

// type AuthLevelType = "Monitoring Areas" | "KPI Group" | "KPIs";

// export default function ManageUserPage() {
//   // Form states
//   const [userId, setUserId] = useState<string>("");
//   const [name, setName] = useState<string>("");
//   const [email, setEmail] = useState<string>("");
//   const [selectedAuthLevels, setSelectedAuthLevels] = useState<string[]>([]);
//   const [systemId, setSystemId] = useState<string>("");
//   const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
//   const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
//   const [isViewMode, setIsViewMode] = useState<boolean>(false);
//   const [editingId, setEditingId] = useState<string | null>(null);

//   // Data states
//   const [users, setUsers] = useState<User[]>([]);
//   const [systems, setSystems] = useState<System[]>([]);
//   const [userSystems, setUserSystems] = useState<UserSystem[]>([]);
//   const [monitoringAreas, setMonitoringAreas] = useState<MonitoringArea[]>([]);
//   const [kpiGroups, setKpiGroups] = useState<KpiGroup[]>([]);
//   const [kpis, setKpis] = useState<Kpi[]>([]);

//   // Selection states
//   const [selectedMAs, setSelectedMAs] = useState<Set<string>>(new Set());
//   const [selectedKPIGroups, setSelectedKPIGroups] = useState<Set<string>>(
//     new Set()
//   );
//   const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());

//   // Loading states
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [isLoadingMA, setIsLoadingMA] = useState(false);
//   const [isLoadingKPIGroups, setIsLoadingKPIGroups] = useState(false);
//   const [isLoadingKPIs, setIsLoadingKPIs] = useState(false);

//   // UI states
//   const [isDeleting, setIsDeleting] = useState<boolean>(false);
//   const [itemToDelete, setItemToDelete] = useState<string | null>(null);
//   const [isEditing, setIsEditing] = useState<boolean>(false);
//   const [editItem, setEditItem] = useState<UserSystem | null>(null);
//   const [isConfigOpen, setIsConfigOpen] = useState(false);
//   const [configTitle, setConfigTitle] = useState("");

//   // Form validation
//   const isSystemSelectEnabled = Boolean(userId);
//   const isConfigButtonEnabled = Boolean(
//     selectedAuthLevels.length > 0 && systemId
//   );

//   // Fetch data
//   useEffect(() => {
//     fetchUsers();
//     fetchSystems();
//   }, []);

//   useEffect(() => {
//     // Fetch users from the API when component mounts
//     fetchAllUsers();
//   }, []);

//   // Updated fetchUsers function to handle both multiple users and single user
//   const fetchUsers = async (userId?: string) => {
//     try {
//       setIsLoading(true);
//       const url = userId
//         ? `https://shwsckbvbt.a.pinggy.link/api/um?userId=${userId}`
//         : `https://shwsckbvbt.a.pinggy.link/api/um`;

//       const response = await axios.get(url);

//       if (response.status === 200) {
//         // Handle both array and single object responses
//         const userData = Array.isArray(response.data)
//           ? response.data
//           : [response.data];

//         if (userId) {
//           // If fetching a specific user, update only that user's data
//           const userIndex = users.findIndex((u) => u.user_id === userId);
//           if (userIndex >= 0 && userData.length > 0) {
//             const updatedUsers = [...users];
//             updatedUsers[userIndex] = userData[0];
//             setUsers(updatedUsers);
//           } else if (userData.length > 0) {
//             // Add user if not found
//             setUsers((prevUsers) => [...prevUsers, userData[0]]);
//           }
//         } else {
//           // If fetching all users, replace the array
//           setUsers(userData);
//         }
//       }
//     } catch (error) {
//       console.error("Error fetching users:", error);
//       toast.error("Failed to fetch users", {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchAllUsers = async () => {
//     try {
//       setIsLoading(true);
//       const response = await axios.get(
//         "https://shwsckbvbt.a.pinggy.link/api/um"
//       );

//       if (response.status === 200) {
//         // Store the raw users data first
//         setUsers(response.data);

//         // Create UserSystem objects from the API data
//         // But don't use role as auth_level - set it to N/A
//         const userSystemData = response.data.map((user: User) => ({
//           id: `${user.user_id}-system`, // Temporary ID
//           user_id: user.user_id,
//           name: user.name,
//           email: user.mail_id,
//           auth_level: "N/A", // Set auth_level to N/A initially, NOT using the role
//           system: "N/A", // This would be filled with actual system data if available
//           configurations: {
//             monitoringAreas: [],
//             kpiGroups: [],
//             kpis: [],
//           },
//         }));

//         setUserSystems(userSystemData);
//       }
//     } catch (error) {
//       console.error("Error fetching users:", error);
//       toast.error("Failed to fetch users", {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Add function to fetch a specific user
//   const fetchUserById = async (userId: string) => {
//     await fetchUsers(userId);
//   };

//   const fetchSystems = async () => {
//     try {
//       setIsLoading(true);
//       const response = await axios.get(
//         "https://shwsckbvbt.a.pinggy.link/api/sys"
//       );
//       if (response.status === 200) {
//         setSystems(response.data);
//       }
//     } catch (error) {
//       console.error("Error fetching systems:", error);
//       toast.error("Failed to fetch systems", {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Find user details
//   const findUserDetails = (selectedUserId: string) => {
//     const selectedUser = users.find((user) => user.user_id === selectedUserId);
//     if (selectedUser) {
//       setName(selectedUser.name);
//       setEmail(selectedUser.mail_id);
//     } else {
//       setName("");
//       setEmail("");
//     }
//   };

//   // Handle auth level selection
//   const handleAuthLevelChange = (value: string) => {
//     // Add only if not already selected
//     if (!selectedAuthLevels.includes(value)) {
//       setSelectedAuthLevels([...selectedAuthLevels, value]);

//       // Show notification to guide users to configure access
//       toast.info("Action required", {
//         description: `Please configure ${value} access by clicking the Config button`,
//         action: {
//           label: "Configure",
//           onClick: openConfigSidebar,
//         },
//         dismissible: true,
//       });
//     }
//   };

//   // Form validation - update to include config check
//   const isFormValid = Boolean(
//     userId &&
//       systemId &&
//       selectedAuthLevels.length > 0 &&
//       // Ensure appropriate selections are made based on auth levels
//       (!selectedAuthLevels.includes("Monitoring Areas") ||
//         selectedMAs.size > 0) &&
//       (!selectedAuthLevels.includes("KPI Group") ||
//         selectedKPIGroups.size > 0) &&
//       (!selectedAuthLevels.includes("KPIs") || selectedKPIs.size > 0)
//   );

//   // Check if configuration is complete
//   const isConfigured = Boolean(
//     (!selectedAuthLevels.includes("Monitoring Areas") ||
//       selectedMAs.size > 0) &&
//       (!selectedAuthLevels.includes("KPI Group") ||
//         selectedKPIGroups.size > 0) &&
//       (!selectedAuthLevels.includes("KPIs") || selectedKPIs.size > 0)
//   );

//   // Add user system - update validation check
//   const handleAddUserSystem = async () => {
//     if (!isFormValid) {
//       toast.error("Missing required fields", {
//         description:
//           "Please fill in all required fields and configure access permissions",
//         dismissible: true,
//       });
//       return;
//     }

//     // Find user details
//     const user = users.find((u) => u.user_id === userId);
//     const system = systems.find((s) => s.system_id === systemId);

//     if (!user || !system) {
//       toast.error("Invalid selection", {
//         description: "Please select valid user and system",
//         dismissible: true,
//       });
//       return;
//     }

//     // Check if this combination already exists and not currently editing the same item
//     const exists = userSystems.some(
//       (item) =>
//         item.user_id === userId &&
//         item.system === systemId &&
//         (!isEditing || (isEditing && item.id !== editItem?.id))
//     );

//     if (exists) {
//       toast.error("Duplicate assignment", {
//         description: "This user already has access to this system",
//         dismissible: true,
//       });
//       return;
//     }

//     const newUserSystem: UserSystem = {
//       id: `${userId}-${systemId}`,
//       user_id: userId,
//       name: user.name,
//       email: user.mail_id,
//       auth_level: selectedAuthLevels.join(", "),
//       system: systemId,
//       configurations: {
//         monitoringAreas: Array.from(selectedMAs),
//         kpiGroups: Array.from(selectedKPIGroups),
//         kpis: Array.from(selectedKPIs),
//       },
//     };

//     // Prepare API payload
//     const apiPayload: any[] = [];

//     // Add Monitoring Areas to payload
//     if (selectedAuthLevels.includes("Monitoring Areas")) {
//       Array.from(selectedMAs).forEach((ma) => {
//         apiPayload.push({
//           user_id: userId,
//           system: systemId,
//           access_type: "MA",
//           access_value: ma,
//         });
//       });
//     }

//     // Add KPI Groups to payload
//     if (selectedAuthLevels.includes("KPI Group")) {
//       Array.from(selectedKPIGroups).forEach((kg) => {
//         apiPayload.push({
//           user_id: userId,
//           system: systemId,
//           access_type: "KG",
//           access_value: kg,
//         });
//       });
//     }

//     // Add KPIs to payload
//     if (selectedAuthLevels.includes("KPIs")) {
//       Array.from(selectedKPIs).forEach((kpi) => {
//         apiPayload.push({
//           user_id: userId,
//           system: systemId,
//           access_type: "KPI",
//           access_value: kpi,
//         });
//       });
//     }

//     try {
//       setIsLoading(true);
//       // Call the API to save access
//       const response = await axios.post(
//         "https://shwsckbvbt.a.pinggy.link/api/ua",
//         apiPayload
//       );

//       if (response.status === 200 && response.data.message === "success") {
//         if (isEditing && editItem) {
//           // Update existing
//           setUserSystems((prevItems) =>
//             prevItems.map((item) =>
//               item.id === editItem.id ? newUserSystem : item
//             )
//           );

//           toast.success("Access updated", {
//             description: `Updated system access for ${user.name}`,
//             dismissible: true,
//           });

//           setIsEditing(false);
//           setEditItem(null);
//           setEditingId(null);
//         } else {
//           // Add new
//           setUserSystems((prev) => [...prev, newUserSystem]);

//           toast.success("Access granted", {
//             description: `${user.name} now has access to ${systemId}`,
//             dismissible: true,
//           });
//         }

//         // Reset form and state
//         resetForm();
//         setIsAddingUser(false);
//       } else {
//         throw new Error("Failed to save user access");
//       }
//     } catch (error) {
//       console.error("Error saving user access:", error);
//       toast.error("Failed to save user access", {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Reset form
//   const resetForm = () => {
//     setUserId("");
//     setName("");
//     setEmail("");
//     setSelectedAuthLevels([]);
//     setSystemId("");
//     setSelectedMAs(new Set());
//     setSelectedKPIGroups(new Set());
//     setSelectedKPIs(new Set());
//   };

//   // Edit user system
//   const handleEdit = (item: UserSystem) => {
//     setEditingId(item.id);
//     setUserId(item.user_id);
//     setName(item.name);
//     setEmail(item.email);

//     // Handle the N/A case for auth_level
//     if (item.auth_level === "N/A") {
//       setSelectedAuthLevels([]);
//     } else {
//       setSelectedAuthLevels(item.auth_level.split(", "));
//     }

//     setSystemId(item.system === "N/A" ? "" : item.system);
//     setSelectedSystems(item.system === "N/A" ? [] : [item.system]);
//     setIsEditing(true);
//     setEditItem(item);
//     setConfigTitle(`Configure Access for ${item.name}`);

//     // Set configurations if available BEFORE opening the config sidebar
//     if (item.configurations) {
//       setSelectedMAs(new Set(item.configurations.monitoringAreas));
//       setSelectedKPIGroups(new Set(item.configurations.kpiGroups));
//       setSelectedKPIs(new Set(item.configurations.kpis));
//     }

//     // For users with no access levels yet, just open the editor without loading data
//     if (item.auth_level === "N/A") {
//       return;
//     }

//     // Load appropriate data based on selected auth levels
//     const loadData = async () => {
//       if (item.auth_level.includes("Monitoring Areas")) {
//         await fetchMonitoringAreas();
//       }

//       if (item.auth_level.includes("KPI Group")) {
//         await fetchAllKPIGroups();
//       }

//       if (item.auth_level.includes("KPIs")) {
//         await fetchAllKPIs();
//       }

//       // Open the config sidebar AFTER data is loaded
//       setIsConfigOpen(true);
//       setIsViewMode(false);
//     };

//     loadData();
//   };

//   // Delete confirmation
//   const handleDeleteConfirm = (id: string) => {
//     setItemToDelete(id);
//     setIsDeleting(true);
//   };

//   // Delete user system
//   const confirmDelete = () => {
//     if (itemToDelete) {
//       setUserSystems((prev) => prev.filter((item) => item.id !== itemToDelete));

//       toast.success("Access removed", {
//         description: "User's system access has been revoked",
//         dismissible: true,
//       });

//       setIsDeleting(false);
//       setItemToDelete(null);
//     }
//   };

//   // Cancel operations
//   const handleCancel = () => {
//     resetForm();
//     setIsEditing(false);
//     setEditItem(null);
//     setIsAddingUser(false);
//     setEditingId(null);
//   };

//   // Open configuration sidebar
//   const openConfigSidebar = () => {
//     setConfigTitle("Authorization Configuration");
//     setIsConfigOpen(true);
//     setIsViewMode(false);

//     // Reset data collections
//     setMonitoringAreas([]);
//     setKpiGroups([]);
//     setKpis([]);

//     // Load appropriate data based on selected auth levels
//     if (selectedAuthLevels.includes("Monitoring Areas")) {
//       fetchMonitoringAreas();
//     }

//     if (selectedAuthLevels.includes("KPI Group")) {
//       fetchAllKPIGroups();
//     }

//     if (selectedAuthLevels.includes("KPIs")) {
//       fetchAllKPIs();
//     }
//   };

//   // API fetch functions for sidebar
//   const fetchMonitoringAreas = async () => {
//     setIsLoadingMA(true);
//     try {
//       console.log("Fetching monitoring areas for system:", systemId);
//       const response = await axios.get(
//         `https://shwsckbvbt.a.pinggy.link/api/ma?system=${systemId}`
//       );
//       if (response.status === 200) {
//         console.log("Monitoring areas loaded:", response.data.length);
//         setMonitoringAreas(response.data);
//       } else {
//         throw new Error("Failed to fetch monitoring areas");
//       }
//     } catch (error) {
//       console.error("Error fetching monitoring areas:", error);
//       toast.error("Failed to fetch monitoring areas", {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoadingMA(false);
//     }
//   };

//   const fetchAllKPIGroups = async () => {
//     setIsLoadingKPIGroups(true);
//     try {
//       console.log("Fetching all KPI groups for system:", systemId);
//       const response = await axios.get(
//         `https://shwsckbvbt.a.pinggy.link/api/kpigrp?system=${systemId}`
//       );
//       if (response.status === 200) {
//         console.log("KPI groups loaded:", response.data.length);
//         setKpiGroups(response.data);
//       } else {
//         throw new Error("Failed to fetch KPI groups");
//       }
//     } catch (error) {
//       console.error("Error fetching KPI groups:", error);
//       toast.error("Failed to fetch KPI groups", {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoadingKPIGroups(false);
//     }
//   };

//   const fetchKPIGroups = async (monArea: string) => {
//     setIsLoadingKPIGroups(true);
//     try {
//       console.log("Fetching KPI groups for monitoring area:", monArea);
//       const response = await axios.get(
//         `https://shwsckbvbt.a.pinggy.link/api/kpigrp?mon_area=${monArea}&system=${systemId}`
//       );
//       if (response.status === 200) {
//         console.log(
//           "KPI groups loaded for monitoring area:",
//           response.data.length
//         );
//         // Add to existing KPI groups instead of replacing
//         setKpiGroups((prev) => {
//           const newGroups = response.data;
//           // Filter out duplicates based on kpi_grp_name
//           const existingGroupNames = new Set(
//             prev.map((g: KpiGroup) => g.kpi_grp_name)
//           );
//           const filteredNewGroups = newGroups.filter(
//             (g: KpiGroup) => !existingGroupNames.has(g.kpi_grp_name)
//           );
//           return [...prev, ...filteredNewGroups];
//         });
//       } else {
//         throw new Error(`Failed to fetch KPI groups for ${monArea}`);
//       }
//     } catch (error) {
//       console.error(`Error fetching KPI groups for ${monArea}:`, error);
//       toast.error(`Failed to fetch KPI groups for ${monArea}`, {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoadingKPIGroups(false);
//     }
//   };

//   const fetchAllKPIs = async () => {
//     setIsLoadingKPIs(true);
//     try {
//       console.log("Fetching all KPIs for system:", systemId);
//       const response = await axios.get(
//         `https://shwsckbvbt.a.pinggy.link/api/kpi?system=${systemId}`
//       );
//       if (response.status === 200) {
//         console.log("KPIs loaded:", response.data.length);
//         setKpis(response.data);
//       } else {
//         throw new Error("Failed to fetch KPIs");
//       }
//     } catch (error) {
//       console.error("Error fetching KPIs:", error);
//       toast.error("Failed to fetch KPIs", {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoadingKPIs(false);
//     }
//   };

//   const fetchKPIs = async (kpiGroup: string) => {
//     setIsLoadingKPIs(true);
//     try {
//       console.log("Fetching KPIs for KPI group:", kpiGroup);
//       const response = await axios.get(
//         `https://shwsckbvbt.a.pinggy.link/api/kpi?kpi_grp=${kpiGroup}&system=${systemId}`
//       );
//       if (response.status === 200) {
//         console.log("KPIs loaded for KPI group:", response.data.length);
//         // Add to existing KPIs instead of replacing
//         setKpis((prev) => {
//           const newKpis = response.data;
//           // Filter out duplicates based on kpi_name
//           const existingKpiNames = new Set(prev.map((k: Kpi) => k.kpi_name));
//           const filteredNewKpis = newKpis.filter(
//             (k: Kpi) => !existingKpiNames.has(k.kpi_name)
//           );
//           return [...prev, ...filteredNewKpis];
//         });
//       } else {
//         throw new Error(`Failed to fetch KPIs for ${kpiGroup}`);
//       }
//     } catch (error) {
//       console.error(`Error fetching KPIs for ${kpiGroup}:`, error);
//       toast.error(`Failed to fetch KPIs for ${kpiGroup}`, {
//         description: "Please try again or contact support",
//         dismissible: true,
//       });
//     } finally {
//       setIsLoadingKPIs(false);
//     }
//   };

//   // Add these handler functions for the sidebar
//   const handleMAChange = async (maName: string, checked: boolean) => {
//     const newSelection = new Set(selectedMAs);

//     if (checked) {
//       newSelection.add(maName);

//       // Fetch KPI Groups for this MA
//       await fetchKPIGroups(maName);

//       // If KPI Group is selected in auth levels, auto-select KPI groups from this MA
//       if (selectedAuthLevels.includes("KPI Group")) {
//         // Get all KPI groups related to this MA
//         const relatedGroups = kpiGroups
//           .filter((kg) => kg.mon_area === maName)
//           .map((kg) => kg.kpi_grp_name);

//         // Add each of these groups to selected KPI groups
//         const newKPIGroupSelection = new Set(selectedKPIGroups);
//         for (const group of relatedGroups) {
//           newKPIGroupSelection.add(group);

//           // If KPIs is selected in auth levels, fetch and select KPIs from this group
//           if (selectedAuthLevels.includes("KPIs")) {
//             await fetchKPIs(group);

//             // Auto-select KPIs from this group
//             const relatedKPIs = kpis
//               .filter((kpi) => kpi.kpi_group === group)
//               .map((kpi) => kpi.kpi_name);

//             setSelectedKPIs((prev) => {
//               const newSelection = new Set(prev);
//               for (const kpiName of relatedKPIs) {
//                 newSelection.add(kpiName);
//               }
//               return newSelection;
//             });
//           }
//         }

//         setSelectedKPIGroups(newKPIGroupSelection);
//       }
//     } else {
//       newSelection.delete(maName);

//       // Only if user explicitly wants to deselect an MA and its related items
//       if (
//         selectedAuthLevels.includes("KPI Group") ||
//         selectedAuthLevels.includes("KPIs")
//       ) {
//         // Get all KPI groups related to this MA
//         const relatedGroups = kpiGroups
//           .filter((kg) => kg.mon_area === maName)
//           .map((kg) => kg.kpi_grp_name);

//         // Remove these groups from selected KPI groups
//         const newKPIGroupSelection = new Set(selectedKPIGroups);
//         for (const group of relatedGroups) {
//           newKPIGroupSelection.delete(group);

//           // If KPIs is selected in auth levels, also deselect related KPIs
//           if (selectedAuthLevels.includes("KPIs")) {
//             // Get and deselect KPIs from this group
//             const relatedKPIs = kpis
//               .filter((kpi) => kpi.kpi_group === group)
//               .map((kpi) => kpi.kpi_name);

//             setSelectedKPIs((prev) => {
//               const newSelection = new Set(prev);
//               for (const kpiName of relatedKPIs) {
//                 newSelection.delete(kpiName);
//               }
//               return newSelection;
//             });
//           }
//         }

//         setSelectedKPIGroups(newKPIGroupSelection);
//       }
//     }

//     setSelectedMAs(newSelection);
//   };

//   const handleKPIGroupChange = async (kpiGroup: string, checked: boolean) => {
//     const newSelection = new Set(selectedKPIGroups);

//     if (checked) {
//       newSelection.add(kpiGroup);

//       // If KPIs is selected in auth levels, fetch and auto-select KPIs from this group
//       if (selectedAuthLevels.includes("KPIs")) {
//         await fetchKPIs(kpiGroup);

//         // Auto-select KPIs from this group
//         const relatedKPIs = kpis
//           .filter((kpi) => kpi.kpi_group === kpiGroup)
//           .map((kpi) => kpi.kpi_name);

//         setSelectedKPIs((prev) => {
//           const newSelection = new Set(prev);
//           for (const kpiName of relatedKPIs) {
//             newSelection.add(kpiName);
//           }
//           return newSelection;
//         });
//       }
//     } else {
//       newSelection.delete(kpiGroup);

//       // If KPIs is selected in auth levels, deselect related KPIs
//       if (selectedAuthLevels.includes("KPIs")) {
//         // Get and deselect KPIs from this group
//         const relatedKPIs = kpis
//           .filter((kpi) => kpi.kpi_group === kpiGroup)
//           .map((kpi) => kpi.kpi_name);

//         setSelectedKPIs((prev) => {
//           const newSelection = new Set(prev);
//           for (const kpiName of relatedKPIs) {
//             newSelection.delete(kpiName);
//           }
//           return newSelection;
//         });
//       }
//     }

//     setSelectedKPIGroups(newSelection);
//   };

//   const handleKPIChange = (kpiName: string, checked: boolean) => {
//     setSelectedKPIs((prev) => {
//       const newSelection = new Set(prev);
//       if (checked) {
//         newSelection.add(kpiName);
//       } else {
//         newSelection.delete(kpiName);
//       }
//       return newSelection;
//     });
//   };

//   // Handle saving the selections
//   const handleSaveSelections = () => {
//     setIsConfigOpen(false);
//     toast.success("Configuration saved", {
//       description: "User access configuration has been updated",
//       dismissible: true,
//     });
//   };

//   // Handle viewing user details
//   const handleView = async (id: string) => {
//     const userSystem = userSystems.find((item) => item.id === id);
//     if (!userSystem) return;

//     // If no access has been assigned yet, there's nothing to view
//     if (userSystem.auth_level === "N/A" && userSystem.system === "N/A") {
//       toast.info("No access assigned", {
//         description: "This user doesn't have any access assigned yet.",
//       });
//       // Instead of viewing, offer to edit the user
//       handleEdit(userSystem);
//       return;
//     }

//     setConfigTitle(`View Access for ${userSystem.name}`);
//     setIsConfigOpen(true);
//     setIsViewMode(true);

//     // Populate name and system for the sidebar header
//     setName(userSystem.name);
//     setSystemId(userSystem.system);

//     // Set selected auth levels from the item
//     setSelectedAuthLevels(userSystem.auth_level.split(", "));

//     // Reset data collections
//     setMonitoringAreas([]);
//     setKpiGroups([]);
//     setKpis([]);

//     try {
//       // Refresh user data to ensure it's up to date
//       await fetchUserById(userSystem.user_id);

//       // Fetch user access details from API
//       const accessResponse = await axios.get(
//         `https://shwsckbvbt.a.pinggy.link/api/ua?userId=${userSystem.user_id}&system=${userSystem.system}`
//       );

//       if (accessResponse.status === 200 && accessResponse.data) {
//         console.log("User access details:", accessResponse.data);

//         // If API provides configuration details, use them
//         // Otherwise use what we have stored locally
//         if (accessResponse.data.configurations) {
//           setSelectedMAs(
//             new Set(accessResponse.data.configurations.monitoringAreas || [])
//           );
//           setSelectedKPIGroups(
//             new Set(accessResponse.data.configurations.kpiGroups || [])
//           );
//           setSelectedKPIs(
//             new Set(accessResponse.data.configurations.kpis || [])
//           );
//         } else if (userSystem.configurations) {
//           // Fall back to stored configurations
//           setSelectedMAs(new Set(userSystem.configurations.monitoringAreas));
//           setSelectedKPIGroups(new Set(userSystem.configurations.kpiGroups));
//           setSelectedKPIs(new Set(userSystem.configurations.kpis));
//         }
//       }
//     } catch (error) {
//       console.error("Error fetching user details:", error);

//       // Fallback to stored configurations if API fails
//       if (userSystem.configurations) {
//         setSelectedMAs(new Set(userSystem.configurations.monitoringAreas));
//         setSelectedKPIGroups(new Set(userSystem.configurations.kpiGroups));
//         setSelectedKPIs(new Set(userSystem.configurations.kpis));
//       }

//       toast.error("Failed to fetch complete user details", {
//         description: "Using locally stored data instead",
//         dismissible: true,
//       });
//     }

//     // Load appropriate data based on selected auth levels
//     if (userSystem.auth_level.includes("Monitoring Areas")) {
//       fetchMonitoringAreas();
//     }

//     if (userSystem.auth_level.includes("KPI Group")) {
//       fetchAllKPIGroups();
//     }

//     if (userSystem.auth_level.includes("KPIs")) {
//       fetchAllKPIs();
//     }
//   };

//   // Add this new function to handle system selection
//   const handleSystemChange = (value: string, checked: boolean) => {
//     if (checked) {
//       setSelectedSystems([...selectedSystems, value]);
//       // If it's the first system selected, set it as the current systemId for UI display
//       if (selectedSystems.length === 0) {
//         setSystemId(value);
//       }
//     } else {
//       setSelectedSystems(selectedSystems.filter((s) => s !== value));
//       // If we're removing the current systemId, update it to another selected system if available
//       if (systemId === value && selectedSystems.length > 1) {
//         const remainingSystems = selectedSystems.filter((s) => s !== value);
//         setSystemId(remainingSystems[0]);
//       } else if (systemId === value && selectedSystems.length === 1) {
//         setSystemId(""); // No systems left
//       }
//     }
//   };

//   return (
//     <div className="container mx-auto py-8 px-4">
//       <div className="flex flex-col gap-6">
//         {/* Page Header */}
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-3xl font-bold">User Management</h1>
//             <p className="text-muted-foreground mt-2">
//               Manage users and their system access permissions
//             </p>
//           </div>
//           <Button
//             onClick={() => setIsAddingUser(true)}
//             disabled={isAddingUser}
//             className="flex items-center gap-2"
//           >
//             <Plus className="h-4 w-4" />
//             Add User Access
//           </Button>
//         </div>

//         {/* User list */}
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between">
//             <div>
//               <CardTitle>User Access Management</CardTitle>
//               <CardDescription>
//                 Assign and manage user access to SAP systems
//               </CardDescription>
//             </div>
//             <div className="flex items-center gap-2">
//               <div className="relative">
//                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//                 <Input placeholder="Search..." className="w-[200px] pl-8" />
//               </div>
//               <Button variant="outline" size="icon">
//                 <Filter className="h-4 w-4" />
//               </Button>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className="rounded-md border">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>User ID</TableHead>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Email</TableHead>
//                     <TableHead>System</TableHead>
//                     <TableHead>Access Level</TableHead>
//                     <TableHead className="text-right">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {userSystems.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={6} className="h-24 text-center">
//                         <div className="flex flex-col items-center justify-center">
//                           <UserIcon className="h-8 w-8 text-muted-foreground mb-2" />
//                           <p className="text-muted-foreground">
//                             No user access assigned yet
//                           </p>
//                           <p className="text-sm text-muted-foreground">
//                             Click &quot;Add User Access&quot; to get started
//                           </p>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     userSystems.map((item) => (
//                       <TableRow key={item.id}>
//                         {editingId === item.id ? (
//                           // Editing mode for this row
//                           <>
//                             <TableCell className="font-medium">
//                               {item.user_id}
//                             </TableCell>
//                             <TableCell>{item.name}</TableCell>
//                             <TableCell>{item.email}</TableCell>
//                             <TableCell>
//                               <Popover>
//                                 <PopoverTrigger asChild>
//                                   <Button
//                                     variant="outline"
//                                     className="w-full justify-between"
//                                   >
//                                     {selectedSystems.length > 0
//                                       ? `${selectedSystems.length} system${
//                                           selectedSystems.length > 1 ? "s" : ""
//                                         } selected`
//                                       : "Select System"}
//                                     <Filter className="h-4 w-4 ml-2" />
//                                   </Button>
//                                 </PopoverTrigger>
//                                 <PopoverContent
//                                   className="w-[220px] p-0"
//                                   align="start"
//                                 >
//                                   <div className="p-2">
//                                     <p className="text-sm font-medium mb-2">
//                                       Select Systems
//                                     </p>
//                                     <div className="space-y-2 max-h-[200px] overflow-y-auto">
//                                       {systems.map((system) => (
//                                         <div
//                                           key={system.system_id}
//                                           className="flex items-center space-x-2"
//                                         >
//                                           <Checkbox
//                                             id={`system-${system.system_id}`}
//                                             checked={selectedSystems.includes(
//                                               system.system_id
//                                             )}
//                                             onCheckedChange={(checked) =>
//                                               handleSystemChange(
//                                                 system.system_id,
//                                                 checked === true
//                                               )
//                                             }
//                                             disabled={!userId}
//                                           />
//                                           <Label
//                                             htmlFor={`system-${system.system_id}`}
//                                             className="text-sm cursor-pointer flex-1"
//                                           >
//                                             {system.system_id} ({system.client})
//                                           </Label>
//                                         </div>
//                                       ))}
//                                     </div>
//                                   </div>
//                                 </PopoverContent>
//                               </Popover>
//                             </TableCell>
//                             <TableCell>
//                               <div className="space-y-2 max-w-[240px]">
//                                 <Popover>
//                                   <PopoverTrigger asChild>
//                                     <Button
//                                       variant="outline"
//                                       className="w-full justify-between"
//                                       disabled={!systemId}
//                                     >
//                                       {selectedAuthLevels.length > 0
//                                         ? `${selectedAuthLevels.length} level${
//                                             selectedAuthLevels.length > 1
//                                               ? "s"
//                                               : ""
//                                           } selected`
//                                         : !systemId
//                                         ? "Select System First"
//                                         : "Select Auth Level"}
//                                       <Filter className="h-4 w-4 ml-2" />
//                                     </Button>
//                                   </PopoverTrigger>
//                                   <PopoverContent
//                                     className="w-[220px] p-0"
//                                     align="start"
//                                   >
//                                     <div className="p-2">
//                                       <p className="text-sm font-medium mb-2">
//                                         Access Levels
//                                       </p>
//                                       <div className="space-y-2">
//                                         {[
//                                           "Monitoring Areas",
//                                           "KPI Group",
//                                           "KPIs",
//                                         ].map((level) => (
//                                           <div
//                                             key={level}
//                                             className="flex items-center space-x-2"
//                                           >
//                                             <Checkbox
//                                               id={`level-${level}-${
//                                                 editingId || "new"
//                                               }`}
//                                               checked={selectedAuthLevels.includes(
//                                                 level
//                                               )}
//                                               onCheckedChange={(checked) => {
//                                                 if (checked) {
//                                                   // Add only if not already selected
//                                                   if (
//                                                     !selectedAuthLevels.includes(
//                                                       level
//                                                     )
//                                                   ) {
//                                                     setSelectedAuthLevels([
//                                                       ...selectedAuthLevels,
//                                                       level,
//                                                     ]);

//                                                     // Show notification to guide users to configure access
//                                                     toast.info(
//                                                       "Action required",
//                                                       {
//                                                         description: `Please configure ${level} access by clicking the Config button`,
//                                                         action: {
//                                                           label: "Configure",
//                                                           onClick:
//                                                             openConfigSidebar,
//                                                         },
//                                                         dismissible: true,
//                                                       }
//                                                     );
//                                                   }
//                                                 } else {
//                                                   setSelectedAuthLevels(
//                                                     selectedAuthLevels.filter(
//                                                       (l) => l !== level
//                                                     )
//                                                   );
//                                                 }
//                                               }}
//                                               disabled={!systemId}
//                                             />
//                                             <Label
//                                               htmlFor={`level-${level}-${
//                                                 editingId || "new"
//                                               }`}
//                                               className="text-sm cursor-pointer flex-1"
//                                             >
//                                               {level}
//                                             </Label>
//                                           </div>
//                                         ))}
//                                       </div>
//                                     </div>
//                                   </PopoverContent>
//                                 </Popover>

//                                 {selectedAuthLevels.length > 0 && (
//                                   <div className="flex flex-wrap gap-1 mt-2">
//                                     {selectedAuthLevels.map((level) => (
//                                       <Badge
//                                         key={level}
//                                         variant="secondary"
//                                         className="text-xs cursor-pointer group hover:bg-muted/80"
//                                         onClick={() => {
//                                           setSelectedAuthLevels(
//                                             selectedAuthLevels.filter(
//                                               (l) => l !== level
//                                             )
//                                           );
//                                         }}
//                                       >
//                                         {level}
//                                         <span className="ml-1 group-hover:text-red-500">
//                                           ×
//                                         </span>
//                                       </Badge>
//                                     ))}
//                                   </div>
//                                 )}

//                                 {selectedAuthLevels.length > 0 && systemId && (
//                                   <div className="mt-2">
//                                     <Button
//                                       size="sm"
//                                       variant="outline"
//                                       className="w-full"
//                                       onClick={openConfigSidebar}
//                                     >
//                                       <Settings className="h-4 w-4 mr-1" />
//                                       Configure Access
//                                       {!isConfigured &&
//                                         selectedAuthLevels.length > 0 && (
//                                           <span className="ml-1 text-red-500">
//                                             ●
//                                           </span>
//                                         )}
//                                     </Button>
//                                   </div>
//                                 )}
//                               </div>
//                             </TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex justify-end gap-2">
//                                 <Button
//                                   size="sm"
//                                   variant="outline"
//                                   onClick={handleCancel}
//                                 >
//                                   Cancel
//                                 </Button>
//                                 <Button
//                                   size="sm"
//                                   onClick={handleAddUserSystem}
//                                   disabled={!isFormValid}
//                                 >
//                                   Update
//                                 </Button>
//                               </div>
//                             </TableCell>
//                           </>
//                         ) : (
//                           // View mode for this row
//                           <>
//                             <TableCell className="font-medium">
//                               {item.user_id}
//                             </TableCell>
//                             <TableCell>{item.name}</TableCell>
//                             <TableCell>{item.email}</TableCell>
//                             <TableCell>
//                               <Badge variant="outline" className="font-medium">
//                                 {item.system}
//                               </Badge>
//                             </TableCell>
//                             <TableCell>
//                               <div className="flex flex-wrap gap-1">
//                                 {item.auth_level === "N/A" ? (
//                                   <Badge
//                                     variant="outline"
//                                     className="text-muted-foreground"
//                                   >
//                                     No access assigned
//                                   </Badge>
//                                 ) : (
//                                   item.auth_level.split(", ").map((level) => (
//                                     <Badge
//                                       key={level}
//                                       variant="secondary"
//                                       className="text-xs"
//                                     >
//                                       {level}
//                                     </Badge>
//                                   ))
//                                 )}
//                               </div>
//                             </TableCell>
//                             <TableCell className="text-right">
//                               <div className="flex justify-end gap-2">
//                                 <Button
//                                   variant="ghost"
//                                   size="icon"
//                                   onClick={() => handleView(item.id)}
//                                 >
//                                   <Eye className="h-4 w-4" />
//                                 </Button>
//                                 <Button
//                                   variant="ghost"
//                                   size="icon"
//                                   onClick={() => handleEdit(item)}
//                                 >
//                                   <Edit className="h-4 w-4" />
//                                 </Button>
//                                 <Button
//                                   variant="ghost"
//                                   size="icon"
//                                   onClick={() => handleDeleteConfirm(item.id)}
//                                 >
//                                   <Trash2 className="h-4 w-4" />
//                                 </Button>
//                               </div>
//                             </TableCell>
//                           </>
//                         )}
//                       </TableRow>
//                     ))
//                   )}
//                   {isAddingUser && !editingId && (
//                     <TableRow className="bg-muted/30">
//                       <TableCell>
//                         <Select
//                           value={userId}
//                           onValueChange={(value) => {
//                             // Check if user already exists with a system access
//                             const userAlreadyExists = userSystems.some(
//                               (item) => item.user_id === value
//                             );
//                             if (userAlreadyExists) {
//                               toast.error("User already exists", {
//                                 description:
//                                   "This user already has access to a system. Please edit the existing entry.",
//                                 dismissible: true,
//                               });
//                               return;
//                             }

//                             setUserId(value);
//                             findUserDetails(value);

//                             // Clear system and auth level selections when user changes
//                             setSystemId("");
//                             setSelectedSystems([]);
//                             setSelectedAuthLevels([]);
//                           }}
//                         >
//                           <SelectTrigger className="h-9">
//                             <SelectValue placeholder="Select User" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {users.map((user) => (
//                               <SelectItem
//                                 key={user.user_id}
//                                 value={user.user_id}
//                               >
//                                 {user.user_id}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       </TableCell>
//                       <TableCell>
//                         <Input
//                           value={name}
//                           disabled
//                           className="h-9 disabled:cursor-not-allowed"
//                         />
//                       </TableCell>
//                       <TableCell>
//                         <Input
//                           value={email}
//                           disabled
//                           className="h-9 disabled:cursor-not-allowed text-sm"
//                         />
//                       </TableCell>
//                       <TableCell>
//                         <Popover>
//                           <PopoverTrigger asChild>
//                             <Button
//                               variant="outline"
//                               className="w-full justify-between"
//                             >
//                               {selectedSystems.length > 0
//                                 ? `${selectedSystems.length} system${
//                                     selectedSystems.length > 1 ? "s" : ""
//                                   } selected`
//                                 : "Select System"}
//                               <Filter className="h-4 w-4 ml-2" />
//                             </Button>
//                           </PopoverTrigger>
//                           <PopoverContent
//                             className="w-[220px] p-0"
//                             align="start"
//                           >
//                             <div className="p-2">
//                               <p className="text-sm font-medium mb-2">
//                                 Select Systems
//                               </p>
//                               <div className="space-y-2 max-h-[200px] overflow-y-auto">
//                                 {systems.map((system) => (
//                                   <div
//                                     key={system.system_id}
//                                     className="flex items-center space-x-2"
//                                   >
//                                     <Checkbox
//                                       id={`system-${system.system_id}`}
//                                       checked={selectedSystems.includes(
//                                         system.system_id
//                                       )}
//                                       onCheckedChange={(checked) =>
//                                         handleSystemChange(
//                                           system.system_id,
//                                           checked === true
//                                         )
//                                       }
//                                       disabled={!userId}
//                                     />
//                                     <Label
//                                       htmlFor={`system-${system.system_id}`}
//                                       className="text-sm cursor-pointer flex-1"
//                                     >
//                                       {system.system_id} ({system.client})
//                                     </Label>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                           </PopoverContent>
//                         </Popover>
//                       </TableCell>
//                       <TableCell>
//                         <div className="space-y-2">
//                           <Popover>
//                             <PopoverTrigger asChild>
//                               <Button
//                                 variant="outline"
//                                 className="w-full justify-between"
//                                 disabled={!systemId}
//                               >
//                                 {selectedAuthLevels.length > 0
//                                   ? `${selectedAuthLevels.length} level${
//                                       selectedAuthLevels.length > 1 ? "s" : ""
//                                     } selected`
//                                   : !systemId
//                                   ? "Select System First"
//                                   : "Select Auth Level"}
//                                 <Filter className="h-4 w-4 ml-2" />
//                               </Button>
//                             </PopoverTrigger>
//                             <PopoverContent
//                               className="w-[220px] p-0"
//                               align="start"
//                             >
//                               <div className="p-2">
//                                 <p className="text-sm font-medium mb-2">
//                                   Access Levels
//                                 </p>
//                                 <div className="space-y-2">
//                                   {[
//                                     "Monitoring Areas",
//                                     "KPI Group",
//                                     "KPIs",
//                                   ].map((level) => (
//                                     <div
//                                       key={level}
//                                       className="flex items-center space-x-2"
//                                     >
//                                       <Checkbox
//                                         id={`level-${level}`}
//                                         checked={selectedAuthLevels.includes(
//                                           level
//                                         )}
//                                         onCheckedChange={(checked) => {
//                                           if (checked) {
//                                             // Add only if not already selected
//                                             if (
//                                               !selectedAuthLevels.includes(
//                                                 level
//                                               )
//                                             ) {
//                                               setSelectedAuthLevels([
//                                                 ...selectedAuthLevels,
//                                                 level,
//                                               ]);

//                                               // Show notification to guide users to configure access
//                                               toast.info("Action required", {
//                                                 description: `Please configure ${level} access by clicking the Config button`,
//                                                 action: {
//                                                   label: "Configure",
//                                                   onClick: openConfigSidebar,
//                                                 },
//                                                 dismissible: true,
//                                               });
//                                             }
//                                           } else {
//                                             setSelectedAuthLevels(
//                                               selectedAuthLevels.filter(
//                                                 (l) => l !== level
//                                               )
//                                             );
//                                           }
//                                         }}
//                                         disabled={!systemId}
//                                       />
//                                       <Label
//                                         htmlFor={`level-${level}`}
//                                         className="text-sm cursor-pointer flex-1"
//                                       >
//                                         {level}
//                                       </Label>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             </PopoverContent>
//                           </Popover>

//                           <div className="flex flex-wrap gap-1">
//                             {selectedAuthLevels.map((level) => (
//                               <Badge
//                                 key={level}
//                                 variant="secondary"
//                                 className="text-xs cursor-pointer group hover:bg-muted/80"
//                                 onClick={() => {
//                                   setSelectedAuthLevels(
//                                     selectedAuthLevels.filter(
//                                       (l) => l !== level
//                                     )
//                                   );
//                                 }}
//                               >
//                                 {level}
//                                 <span className="ml-1 group-hover:text-red-500">
//                                   ×
//                                 </span>
//                               </Badge>
//                             ))}
//                           </div>
//                           {selectedAuthLevels.length > 0 && systemId && (
//                             <div className="text-right">
//                               <Button
//                                 size="sm"
//                                 variant="outline"
//                                 onClick={openConfigSidebar}
//                               >
//                                 <Settings className="h-4 w-4 mr-1" />
//                                 Config
//                                 {!isConfigured &&
//                                   selectedAuthLevels.length > 0 && (
//                                     <span className="ml-1 text-red-500">●</span>
//                                   )}
//                               </Button>
//                             </div>
//                           )}
//                         </div>
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <div className="flex justify-end gap-2">
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             onClick={handleCancel}
//                           >
//                             Cancel
//                           </Button>
//                           <Button
//                             size="sm"
//                             onClick={handleAddUserSystem}
//                             disabled={!isFormValid}
//                           >
//                             Save
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   )}
//                 </TableBody>
//               </Table>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Delete Confirmation Dialog */}
//       <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Deletion</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to remove this system access? This action
//               cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsDeleting(false)}>
//               Cancel
//             </Button>
//             <Button variant="destructive" onClick={confirmDelete}>
//               Delete
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Updated Authorization Configuration Sheet */}
//       <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
//         <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px]">
//           <div className=" pt-3 pb-2">
//             <SheetHeader>
//               <SheetTitle className="text-2xl font-bold">
//                 {configTitle}
//               </SheetTitle>
//               <p className="text-sm text-muted-foreground">
//                 {isViewMode ? "Viewing" : "Configuring"} access for {name} on
//                 system {systemId}
//               </p>
//               {/* Add this to verify data is loaded */}
//               <p className="text-xs text-muted-foreground">
//                 Monitoring Areas: {selectedMAs.size}, KPI Groups:{" "}
//                 {selectedKPIGroups.size}, KPIs: {selectedKPIs.size}
//               </p>
//             </SheetHeader>
//           </div>

//           <div className="flex-1 overflow-y-auto px-2">
//             <div className="py-4 space-y-8">
//               {/* Monitoring Areas Section - only show if selected in auth levels */}
//               {selectedAuthLevels.includes("Monitoring Areas") && (
//                 <div className="space-y-4">
//                   <div className="flex justify-between items-center sticky top-0 bg-background py-2 z-10 border-b">
//                     <h3 className="text-lg font-semibold">Monitoring Areas</h3>
//                     <Badge variant="outline">{selectedMAs.size} selected</Badge>
//                   </div>

//                   {isLoadingMA ? (
//                     <div className="space-y-2">
//                       {[1, 2, 3].map((i) => (
//                         <div
//                           key={i}
//                           className="h-12 bg-muted animate-pulse rounded"
//                         />
//                       ))}
//                     </div>
//                   ) : monitoringAreas.length > 0 ? (
//                     <div className="space-y-2">
//                       {monitoringAreas.map((ma) => (
//                         <div
//                           key={ma.mon_area_name}
//                           className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent/5"
//                         >
//                           <Checkbox
//                             id={`ma-${ma.mon_area_name}`}
//                             checked={selectedMAs.has(ma.mon_area_name)}
//                             onCheckedChange={(checked) =>
//                               handleMAChange(ma.mon_area_name, checked === true)
//                             }
//                             disabled={isViewMode}
//                           />
//                           <div className="flex-1">
//                             <Label
//                               htmlFor={`ma-${ma.mon_area_name}`}
//                               className="text-sm text-muted-foreground"
//                             >
//                               {ma.mon_area_desc}
//                             </Label>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="text-center py-4 text-muted-foreground">
//                       No monitoring areas available for this system
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* KPI Groups Section - only show if selected in auth levels */}
//               {selectedAuthLevels.includes("KPI Group") && (
//                 <div className="space-y-4">
//                   <div className="flex justify-between items-center sticky top-0 bg-background py-2 z-10 border-b">
//                     <h3 className="text-lg font-semibold">KPI Groups</h3>
//                     <Badge variant="outline">
//                       {selectedKPIGroups.size} selected
//                     </Badge>
//                   </div>

//                   {isLoadingKPIGroups ? (
//                     <div className="space-y-2">
//                       {[1, 2, 3].map((i) => (
//                         <div
//                           key={i}
//                           className="h-12 bg-muted animate-pulse rounded"
//                         />
//                       ))}
//                     </div>
//                   ) : kpiGroups.length > 0 ? (
//                     <div className="space-y-2">
//                       {kpiGroups.map((kg) => (
//                         <div
//                           key={kg.kpi_grp_name}
//                           className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent/5"
//                         >
//                           <Checkbox
//                             id={`kg-${kg.kpi_grp_name}`}
//                             checked={selectedKPIGroups.has(kg.kpi_grp_name)}
//                             onCheckedChange={(checked) =>
//                               handleKPIGroupChange(
//                                 kg.kpi_grp_name,
//                                 checked === true
//                               )
//                             }
//                             disabled={isViewMode}
//                           />
//                           <div className="flex-1">
//                             <Label
//                               htmlFor={`kg-${kg.kpi_grp_name}`}
//                               className="text-sm text-muted-foreground"
//                             >
//                               {kg.kpi_grp_desc}
//                             </Label>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="text-center py-4 text-muted-foreground">
//                       {selectedAuthLevels.includes("Monitoring Areas") &&
//                       selectedMAs.size === 0
//                         ? "Select a monitoring area to view KPI groups"
//                         : "No KPI groups available for this system"}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* KPIs Section - only show if selected in auth levels */}
//               {selectedAuthLevels.includes("KPIs") && (
//                 <div className="space-y-4">
//                   <div className="flex justify-between items-center sticky top-0 bg-background py-2 z-10 border-b">
//                     <h3 className="text-lg font-semibold">KPIs</h3>
//                     <Badge variant="outline">
//                       {selectedKPIs.size} selected
//                     </Badge>
//                   </div>

//                   {isLoadingKPIs ? (
//                     <div className="space-y-2">
//                       {[1, 2, 3].map((i) => (
//                         <div
//                           key={i}
//                           className="h-12 bg-muted animate-pulse rounded"
//                         />
//                       ))}
//                     </div>
//                   ) : kpis.length > 0 ? (
//                     <div className="space-y-2">
//                       {kpis.map((kpi) => (
//                         <div
//                           key={kpi.kpi_name}
//                           className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-accent/5"
//                         >
//                           <Checkbox
//                             id={`kpi-${kpi.kpi_name}`}
//                             checked={selectedKPIs.has(kpi.kpi_name)}
//                             onCheckedChange={(checked) =>
//                               handleKPIChange(kpi.kpi_name, checked === true)
//                             }
//                             disabled={isViewMode}
//                           />
//                           <div className="flex-1">
//                             <Label
//                               htmlFor={`kpi-${kpi.kpi_name}`}
//                               className="text-sm text-muted-foreground"
//                             >
//                               {kpi.kpi_desc}
//                             </Label>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="text-center py-4 text-muted-foreground">
//                       {selectedAuthLevels.includes("KPI Group") &&
//                       selectedKPIGroups.size === 0
//                         ? "Select a KPI group to view KPIs"
//                         : "No KPIs available for this system"}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Action buttons - now in a sticky footer */}
//           <div className="flex justify-end space-x-2 p-4 border-t sticky bottom-0 bg-background">
//             <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
//               {isViewMode ? "Close" : "Cancel"}
//             </Button>
//             {!isViewMode && (
//               <Button onClick={handleSaveSelections}>Save Configuration</Button>
//             )}
//           </div>
//         </SheetContent>
//       </Sheet>
//     </div>
//   );
// }
