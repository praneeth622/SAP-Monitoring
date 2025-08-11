"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-background/98 to-background/95">
      <div className="bg-card/90 backdrop-blur-sm border border-border/40 shadow-xl rounded-lg p-8 max-w-md">
        <LoadingSpinner message="Redirecting to dashboard..." />
      </div>
    </div>
  );
}