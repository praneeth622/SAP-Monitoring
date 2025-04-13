// components/CreateTemplateForm.tsx
import { useState } from 'react';
import { Template, Graph } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { DynamicLayout } from '@/components/charts/DynamicLayout';

export function CreateTemplateForm() {
  const [template, setTemplate] = useState<Template>({
    id: '',
    name: '',
    description: '',
    system: '',
    timeRange: '',
    resolution: '',
    graphs: [],
  });

  const [currentGraph, setCurrentGraph] = useState<Partial<Graph> | null>(null);

  const systemOptions = [
    { value: 'system1', label: 'System 1' },
    { value: 'system2', label: 'System 2' },
    { value: 'system3', label: 'System 3' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      if (!response.ok) throw new Error('Failed to create template');
      
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <Input
            placeholder="Template Name"
            value={template.name}
            onChange={e => setTemplate(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            placeholder="Description"
            value={template.description || ''}
            onChange={e => setTemplate(prev => ({ ...prev, description: e.target.value }))}
          />
          <Select
            value={template.system}
            onValueChange={value => setTemplate(prev => ({ ...prev, system: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select System" />
            </SelectTrigger>
            <SelectContent>
              {systemOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Graph Grid Layout */}
          {(template.graphs || []).length > 0 && (
            <DynamicLayout
              charts={(template.graphs || []).map(g => ({
                id: g.id,
                data: [],
                type: g.type,
                title: g.name,
                width: g.position.w,
                height: g.position.h,
              }))}
              onLayoutChange={layout => {
                setTemplate(prev => ({
                  ...prev,
                  graphs: (prev.graphs || []).map((g, i) => ({
                    ...g,
                    position: {
                      ...g.position,
                      x: layout[i].x,
                      y: layout[i].y,
                      w: layout[i].w,
                      h: layout[i].h,
                    },
                  })),
                }));
              }}
            />
          )}

          <Button type="submit">Create Template</Button>
        </div>
      </form>
    </div>
  );
}