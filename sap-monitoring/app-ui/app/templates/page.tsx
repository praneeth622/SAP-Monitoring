"use client";

import Mainscreen from './_components/mainScreen';
import { Layout } from "react-grid-layout";
import { toast } from "sonner";

export default function TemplatesPage() {
  // The templateId and other variables will be managed inside mainScreen
  // Let's wrap the mainScreen component with our functionality using context pattern in the future if needed
  
  // For now, our implementation is simplified to fix the build error
  // We'll use the original Mainscreen component as is
  
  return <Mainscreen />;
}