"use client"

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  addEdge,
  Node,
  Edge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Maximize, Minimize, Plus, ZoomIn, ZoomOut } from 'lucide-react';
// import {Sidebar} from '@/components/sidebar';

interface NodeData {
  label: string;
  type: string;
  status?: 'error' | 'warning' | 'normal';
}

const initialNodes: Node<NodeData>[] = [
  {
    id: 'swx',
    type: 'system',
    data: { label: 'SWX', type: 'root' },
    position: { x: 500, y: 0 },
    style: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      width: 150,
      textAlign: 'center' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  },
  {
    id: 'app-server',
    type: 'system',
    data: { label: 'App Server', type: 'server' },
    position: { x: 300, y: 100 },
    style: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      width: 150,
      textAlign: 'center' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  },
  {
    id: 'db-server',
    type: 'system',
    data: { label: 'DB Server', type: 'server' },
    position: { x: 700, y: 100 },
    style: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      width: 150,
      textAlign: 'center' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  },
  {
    id: 'sys',
    type: 'system',
    data: { label: 'SYS', type: 'subsystem', status: 'warning' },
    position: { x: 100, y: 250 },
    style: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      width: 120,
      textAlign: 'center' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  },
  {
    id: 'os',
    type: 'system',
    data: { label: 'OS', type: 'subsystem' },
    position: { x: 250, y: 250 },
    style: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      width: 120,
      textAlign: 'center' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  },
  {
    id: 'db',
    type: 'system',
    data: { label: 'DB', type: 'subsystem', status: 'error' },
    position: { x: 400, y: 250 },
    style: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      width: 120,
      textAlign: 'center' as const,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'swx-app',
    source: 'swx',
    target: 'app-server',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#3b82f6',
    },
  },
  {
    id: 'swx-db',
    source: 'swx',
    target: 'db-server',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#3b82f6',
    },
  },
  {
    id: 'app-sys',
    source: 'app-server',
    target: 'sys',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#3b82f6',
    },
  },
  {
    id: 'app-os',
    source: 'app-server',
    target: 'os',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#3b82f6',
    },
  },
  {
    id: 'app-db',
    source: 'app-server',
    target: 'db',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6' },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#3b82f6',
    },
  },
];

export default function TopologyPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedSystem, setSelectedSystem] = useState('SWX');
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  const handleSystemChange = (value: string) => {
    setSelectedSystem(value);
    // Here you would typically fetch and update the topology for the selected system
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-8 py-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Topology
              </h1>
              <p className="text-muted-foreground/90 text-lg mt-2">
                Show all your systems in this topology
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Select value={selectedSystem} onValueChange={handleSystemChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SWX">SWX</SelectItem>
                  <SelectItem value="System 1">System 1</SelectItem>
                  <SelectItem value="System 2">System 2</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="destructive" className="gap-2">
                Critical Alerts
                <span className="bg-white text-destructive rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  3
                </span>
              </Button>
            </motion.div>
          </div>

          <Card className="flex-1 relative overflow-hidden border-border/40 shadow-xl bg-card/90 backdrop-blur-sm">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background/95 backdrop-blur-sm"
                onClick={toggleLock}
              >
                <Lock className={`h-4 w-4 ${isLocked ? 'text-primary' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background/95 backdrop-blur-sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              attributionPosition="bottom-right"
              nodesDraggable={!isLocked}
              nodesConnectable={!isLocked}
              className="bg-dots-darker dark:bg-dots-lighter"
            >
              <Controls className="bg-background/95 backdrop-blur-sm border border-border/40 shadow-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {}}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {}}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {}}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </Controls>
              <MiniMap
                className="bg-background/95 backdrop-blur-sm border border-border/40 shadow-xl !right-4 !bottom-4"
                nodeColor={(node) => {
                  switch (node.data?.status) {
                    case 'error':
                      return '#ef4444';
                    case 'warning':
                      return '#f59e0b';
                    default:
                      return '#3b82f6';
                  }
                }}
              />
              <Background />
            </ReactFlow>
          </Card>
        </div>
      </main>
    </div>
  );
}