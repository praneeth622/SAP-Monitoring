import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

interface EditSystemSheetProps {
  open: boolean;
  onClose: () => void;
  system: System | null;
  onSubmit: (systemId: string, description: string) => Promise<void>;
}

const EditSystemSheet = ({
  open,
  onClose,
  system,
  onSubmit,
}: EditSystemSheetProps) => {
  const [description, setDescription] = useState(system?.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!system) return;

    setIsLoading(true);
    try {
      await onSubmit(system.systemId, description);
      toast({
        title: "Success",
        description: "System updated successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update system",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit System</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">System Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">System ID:</span>
                <p className="font-medium">{system?.systemId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">{system?.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Instance:</span>
                <p className="font-medium">{system?.instance}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Client:</span>
                <p className="font-medium">{system?.client}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block mb-1">
                  Status:
                </span>
                <Badge
                  variant={system?.activeStatus ? "default" : "secondary"}
                  className="mr-2"
                >
                  {system?.activeStatus ? "Active" : "Inactive"}
                </Badge>
                <Badge
                  variant={system?.pollingStatus ? "default" : "secondary"}
                >
                  {system?.pollingStatus
                    ? "Polling Enabled"
                    : "Polling Disabled"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter system description"
              className="resize-none"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EditSystemSheet;
