"use client";

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

interface SystemStatusConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  systemName: string;
}

export function SystemStatusConfirmationDialog({
  open,
  onClose,
  onConfirm,
  systemName,
}: SystemStatusConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Deactivate System and Stop Polling?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to deactivate system <strong>{systemName}</strong>.
            This will automatically stop the polling process for this system.
            Data collection will cease until the system is activated again.
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
}
