"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  Search as SearchIcon,
  FilterIcon,
  SortAscIcon,
  Edit,
  Copy,
  Trash2,
  LayoutTemplate,
  Star,
  StarOff,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interface definitions
interface Template {
  user_id?: string; // May not be in the response
  template_id: string[] | string;
  template_name: string[] | string;
  template_desc: string[] | string;
  default: boolean[] | boolean;
  favorite: boolean[] | boolean;
  frequency?: string[] | string; // May not be in the response
  systems?: System[]; // May not be in the response
  graphs?: Graph[]; // May not be in the response
}

interface System {
  system_id: string;
}

interface Graph {
  graph_id: string;
  graph_name: string;
  top_xy_pos: string;
  bottom_xy_pos: string;
  frequency: string;
  resolution: string;
  primary_kpi_id: string;
  systems: System[];
  primary_filter_values?: FilterValue[];
  secondary_kpis?: SecondaryKpi[];
}

interface FilterValue {
  kpi_filter_name: string;
  option: string;
  sign: string;
  value: string;
}

interface SecondaryKpi {
  kpi_id: string;
  filter_values?: FilterValue | FilterValue[];
}

interface EmptyStateProps {
  onAdd: () => void;
}

// Add helper function to normalize template data
const normalizeTemplate = (template: Template): Template => {
  return {
    template_id: Array.isArray(template.template_id)
      ? template.template_id[0]
      : template.template_id,
    template_name: Array.isArray(template.template_name)
      ? template.template_name[0]
      : template.template_name,
    template_desc: Array.isArray(template.template_desc)
      ? template.template_desc[0]
      : template.template_desc,
    default: Array.isArray(template.default)
      ? template.default[0]
      : template.default,
    favorite: Array.isArray(template.favorite)
      ? template.favorite[0]
      : template.favorite,
    frequency: template.frequency
      ? Array.isArray(template.frequency)
        ? template.frequency[0]
        : template.frequency
      : "5m",
    systems: template.systems || [],
    graphs: template.graphs || [],
  };
};

export default function Mainscreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://shwsckbvbt.a.pinggy.link";

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Update the fetchTemplates function in mainScreen.tsx to fetch detailed template data
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // First, fetch the list of templates
      const response = await fetch(`${baseUrl}/api/utl?userId=USER_TEST_1`);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        setTemplates([]);
        return;
      }

      // Get basic template info
      const basicTemplates = data.map(normalizeTemplate);

      // Now fetch detailed data for each template
      const detailedTemplatesPromises = basicTemplates.map(async (template) => {
        const templateId = Array.isArray(template.template_id)
          ? template.template_id[0]
          : template.template_id;

        try {
          // Fetch detailed template data
          const detailResponse = await fetch(
            `${baseUrl}/api/ut?templateId=${templateId}`
          );

          if (!detailResponse.ok) {
            console.warn(`Could not fetch details for template ${templateId}`);
            return template; // Return the basic template if details can't be fetched
          }

          const detailData = await detailResponse.json();
          if (!detailData || !Array.isArray(detailData) || !detailData.length) {
            return template; // Return the basic template if no details are returned
          }

          // Normalize and return the detailed template data
          return normalizeTemplate(detailData[0]);
        } catch (error) {
          console.error(
            `Error fetching details for template ${templateId}:`,
            error
          );
          return template; // Return the basic template on error
        }
      });

      // Wait for all detailed template data to be fetched
      const detailedTemplates = await Promise.all(detailedTemplatesPromises);

      // Set the templates state with the detailed data
      setTemplates(detailedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates", {
        description: "Please try again or contact support",
      });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    router.push("/templates/add");
  };

  const handleEditTemplate = (id: string) => {
    router.push(`/templates/add?templateId=${id}`);
  };

  const handleToggleFavorite = async (template: Template) => {
    try {
      // Get the normalized values for the API request
      const templateId = Array.isArray(template.template_id)
        ? template.template_id[0]
        : template.template_id;
      const templateName = Array.isArray(template.template_name)
        ? template.template_name[0]
        : template.template_name;
      const templateDesc = Array.isArray(template.template_desc)
        ? template.template_desc[0]
        : template.template_desc;
      const isDefault = Array.isArray(template.default)
        ? template.default[0]
        : template.default;
      const isFavorite = Array.isArray(template.favorite)
        ? template.favorite[0]
        : template.favorite;
      const frequency = template.frequency
        ? Array.isArray(template.frequency)
          ? template.frequency[0]
          : template.frequency
        : "5m";

      const updatedTemplate = {
        user_id: "USER_TEST_1",
        template_id: templateId,
        template_name: templateName,
        template_desc: templateDesc,
        default: isDefault,
        favorite: !isFavorite,
        frequency: frequency,
        systems: template.systems || [],
        graphs: template.graphs || [],
      };

      const response = await fetch(`${baseUrl}/api/ut`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTemplate),
      });

      if (!response.ok) {
        throw new Error("Failed to update template");
      }

      // Update local state after successful API call
      setTemplates((prevTemplates) =>
        prevTemplates.map((t) => {
          const tId = Array.isArray(t.template_id)
            ? t.template_id[0]
            : t.template_id;
          if (tId === templateId) {
            return { ...t, favorite: !isFavorite };
          }
          return t;
        })
      );

      toast.success(
        `Template ${isFavorite ? "removed from" : "added to"} favorites`
      );
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template", {
        description: "Please try again or contact support",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      // Find the template to delete
      const templateToDelete = templates.find((t) => {
        const tId = Array.isArray(t.template_id)
          ? t.template_id[0]
          : t.template_id;
        return tId === id;
      });

      if (!templateToDelete) return;

      // Send delete request to API
      const response = await fetch(`${baseUrl}/api/ut/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      // Update local state
      setTemplates(
        templates.filter((t) => {
          const tId = Array.isArray(t.template_id)
            ? t.template_id[0]
            : t.template_id;
          return tId !== id;
        })
      );
      setConfirmDelete(null);

      toast.success("Template deleted successfully");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template", {
        description: "Please try again or contact support",
      });
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const name = Array.isArray(template.template_name)
      ? template.template_name[0]
      : template.template_name;

    const desc = Array.isArray(template.template_desc)
      ? template.template_desc[0]
      : template.template_desc;

    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-background/95">
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent">
            Monitoring Templates
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and customize your monitoring dashboard templates
          </p>
        </div>

        {/* Templates Table */}
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-lg">
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon">
                  <FilterIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <SortAscIcon className="h-4 w-4" />
                </Button>
                <Button onClick={handleAddTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">
                  Loading templates...
                </p>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState onAdd={handleAddTemplate} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Systems</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Graphs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    // Extract values safely
                    const templateId = Array.isArray(template.template_id)
                      ? template.template_id[0]
                      : template.template_id;
                    const templateName = Array.isArray(template.template_name)
                      ? template.template_name[0]
                      : template.template_name;
                    const templateDesc = Array.isArray(template.template_desc)
                      ? template.template_desc[0]
                      : template.template_desc;
                    const isDefault = Array.isArray(template.default)
                      ? template.default[0]
                      : template.default;
                    const isFavorite = Array.isArray(template.favorite)
                      ? template.favorite[0]
                      : template.favorite;
                    const frequency = template.frequency
                      ? Array.isArray(template.frequency)
                        ? template.frequency[0]
                        : template.frequency
                      : "5m";

                    return (
                      <TableRow key={templateId}>
                        <TableCell className="font-medium">
                          {templateName}
                        </TableCell>
                        <TableCell>{templateDesc}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(template.systems || []).map((system) => (
                              <Badge
                                key={system.system_id}
                                variant="outline"
                                className="text-xs"
                              >
                                {system.system_id.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{frequency}</TableCell>
                        <TableCell>{(template.graphs || []).length}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {isDefault && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                Default
                              </Badge>
                            )}
                            {isFavorite && (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                Favorite
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleFavorite(template)}
                              title={
                                isFavorite
                                  ? "Remove from favorites"
                                  : "Add to favorites"
                              }
                            >
                              {isFavorite ? (
                                <Star className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <StarOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTemplate(templateId)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setConfirmDelete(templateId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDelete && handleDeleteTemplate(confirmDelete)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EmptyState = ({ onAdd }: EmptyStateProps) => (
  <div className="p-12 text-center">
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 rounded-full bg-primary/10">
        <LayoutTemplate className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium">No templates found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Get started by creating your first monitoring template.
      </p>
      <Button onClick={onAdd} className="mt-4">
        <Plus className="w-4 h-4 mr-2" />
        Add New Template
      </Button>
    </div>
  </div>
);
