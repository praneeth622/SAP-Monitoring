"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);

  // Wait for component to mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <main className="container mx-auto justify-center items-center max-w-4xl px-4 sm:px-8 lg:px-12 py-6 space-y-6 bg-background text-foreground">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/avatar-placeholder.png" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">John Doe</h2>
              <p className="text-sm text-muted-foreground">johndoe@gmail.com</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                className="w-full p-2 rounded-md border bg-background"
                defaultValue="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full p-2 rounded-md border bg-background"
                defaultValue="johndoe@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <input
                type="text"
                className="w-full p-2 rounded-md border bg-background"
                defaultValue="Administrator"
                disabled
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <input
                type="text"
                className="w-full p-2 rounded-md border bg-background"
                defaultValue="IT"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}