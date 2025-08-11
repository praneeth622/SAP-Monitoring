"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-background/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center space-y-8">
        {/* Animated 404 text */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <h1 className="text-8xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent">
            404
          </h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3"
          >
            <div className="bg-red-500/10 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded-full">
              <AlertCircle className="h-6 w-6" />
            </div>
          </motion.div>
        </motion.div>

        {/* Message with staggered animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-semibold text-foreground">
            Page not found
          </h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved or deleted.
          </p>
        </motion.div>

        {/* Search box with animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full"
        >
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search for something else..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </motion.div>

        {/* Action buttons with animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex gap-2 items-center"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button asChild className="flex gap-2 items-center">
            <Link href="/">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[-1] opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-1/3 bottom-1/3 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute left-2/3 top-1/2 h-24 w-24 rounded-full bg-blue-500/20 blur-3xl" />
      </motion.div>
    </div>
  );
}
