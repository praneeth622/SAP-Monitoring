"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, MonitorDot, Activity, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface System {
  id: string
  name: string
  description: string
  source: string
  username: string
  status: 'active' | 'disconnected'
  lastActive?: Date
}

export default function ManageSystemsPage() {
  const [isAddSystemSheetOpen, setIsAddSystemSheetOpen] = useState(false)
  const [systems, setSystems] = useState<System[]>([])
  const { toast } = useToast()

  const handleAddSystem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const newSystem: System = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      source: formData.get('source') as string,
      username: formData.get('username') as string,
      status: 'active',
      lastActive: new Date()
    }

    setSystems(prev => [...prev, newSystem])
    setIsAddSystemSheetOpen(false)
    toast({
      title: "System Added",
      description: "The new system has been successfully added.",
    })
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight"
              >
                Manage Systems
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground/90 text-lg"
              >
                Preview and manage all your systems
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button 
                size="lg"
                className="gap-2"
                onClick={() => setIsAddSystemSheetOpen(true)}
              >
                <Plus className="w-5 h-5" />
                Add New System
              </Button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Card className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                  <MonitorDot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Total Systems</h3>
                  <p className="text-3xl font-bold">{systems.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Active Systems</h3>
                  <p className="text-3xl font-bold">
                    {systems.filter(s => s.status === 'active').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Disconnected</h3>
                  <p className="text-3xl font-bold">
                    {systems.filter(s => s.status === 'disconnected').length}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {systems.length === 0 ? (
              <Card className="p-12 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl text-center">
                <p className="text-muted-foreground text-lg">No systems found</p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Add your first system by clicking the "Add New System" button above
                </p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {systems.map(system => (
                  <Card
                    key={system.id}
                    className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{system.name}</h3>
                        <p className="text-muted-foreground mt-1">{system.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          system.status === 'active' 
                            ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {system.status === 'active' ? 'Active' : 'Disconnected'}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Sheet open={isAddSystemSheetOpen} onOpenChange={setIsAddSystemSheetOpen}>
        <SheetContent className="space-y-6">
          <SheetHeader>
            <SheetTitle>Add New System</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleAddSystem} className="space-y-6">
            <div className="space-y-4">

              <div>
                <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                  System Source <span className="text-red-500">*</span>
                </label>
                <Input
                  name="source"
                  placeholder="Enter source URL"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                  System Username <span className="text-red-500">*</span>
                </label>
                <Input
                  name="username"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                  System Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                  System Name
                </label>
                <Input
                  name="name"
                  placeholder="Enter system name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                  System Description
                </label>
                <Textarea
                  name="description"
                  placeholder="Enter system description"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSystemSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save & Continue
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}