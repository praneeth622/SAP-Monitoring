"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useFont } from "@/contexts/FontContext";
import { Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { font, setFont } = useFont();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="container mx-auto justify-center items-center max-w-4xl px-4 sm:px-8 lg:px-12 py-6 space-y-6 bg-background text-foreground">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="gap-6 grid bg-card h-max p-6 sm:p-8 lg:p-10 rounded-lg shadow-md w-full border border-input">
        <div className="grid gap-2">
          <label htmlFor="theme" className="text-sm font-medium text-foreground">
            Theme
          </label>
          <Select 
            value={theme} 
            onValueChange={(value) => {
              setTheme(value);
            }}
          >
            <SelectTrigger id="theme" className="w-full">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="navy">Navy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 pt-3">
          <label htmlFor="font" className="text-sm font-medium text-foreground">
            Font
          </label>
          <Select value={font} onValueChange={setFont}>
            <SelectTrigger id="font" className="w-full">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nunito-sans">Nunito Sans</SelectItem>
              <SelectItem value="poppins">Poppins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </main>
  );
}