"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search as SearchIcon,
  FilterIcon,
  SortAscIcon,
  Edit,
  Copy,
  Trash2,
  LayoutTemplate,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Interface definitions
interface Template {
  id: string;
  name: string;
  system: string;
  kpiGroups: string[];
  graphCount: number;
  isDefault: boolean;
}

interface EmptyStateProps {
  onAdd: () => void;
}

export default function Mainscreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: "1",
      name: "Performance Monitor",
      system: "PRD",
      kpiGroups: ["Performance", "Memory", "CPU"],
      graphCount: 6,
      isDefault: true,
    },
    {
      id: "2",
      name: "Database Health",
      system: "DEV",
      kpiGroups: ["Database", "Storage"],
      graphCount: 4,
      isDefault: false,
    },
    {
      id: "3",
      name: "User Activity",
      system: "QAS",
      kpiGroups: ["Users", "Sessions", "Response Time"],
      graphCount: 5,
      isDefault: false,
    },
  ]);
  const { toast } = useToast();

  const handleAddTemplate = () => {
    router.push("/templates/add");
  };

  const handleEditTemplate = (id: string) => {
    toast({
      title: "Coming Soon",
      description: "Edit template functionality will be implemented soon.",
    });
  };

  const handleDuplicateTemplate = (id: string) => {
    toast({
      title: "Coming Soon",
      description: "Duplicate template functionality will be implemented soon.",
    });
  };

  const handleDeleteTemplate = (id: string) => {
    toast({
      title: "Coming Soon",
      description: "Delete template functionality will be implemented soon.",
    });
  };

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
                <Input placeholder="Search templates..." className="pl-9" />
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

          {templates.length === 0 ? (
            <EmptyState onAdd={handleAddTemplate} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>KPI Groups</TableHead>
                    <TableHead>Graphs</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell>{template.system}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.kpiGroups.map((group) => (
                            <span
                              key={group}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              {group}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{template.graphCount}</TableCell>
                      <TableCell>
                        {template.isDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            Default
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTemplate(template.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
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
        </Card>
      </main>
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
