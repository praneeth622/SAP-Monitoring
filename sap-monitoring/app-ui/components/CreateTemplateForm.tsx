// components/CreateTemplateForm.tsx
import { useState } from 'react';
import { Template, Graph } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DynamicLayout } from '@/components/charts/DynamicLayout';

export function CreateTemplateForm() {
  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    system: '',
    timeRange: 'auto',
    resolution: 'auto',
    graphs: []
  });

  const [currentGraph, setCurrentGraph] = useState<Partial<Graph> | null>(null);

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
    <form onSubmit={handleSubmit}>
      <Card className="p-6 space-y-6">
        {/* Template Details */}
        <div className="space-y-4">
          <Input 
            placeholder="Template Name"
            value={template.name}
            onChange={e => setTemplate(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Select
            value={template.system}
            onValueChange={value => setTemplate(prev => ({ ...prev, system: value }))}
            options={systemOptions}
            placeholder="Select System"
          />
          {/* Add other template fields */}
        </div>

        {/* Graph Configuration */}
        {template.name && template.system && (
          <div className="space-y-4">
            <Button type="button" onClick={() => setCurrentGraph({})}>
              Add Graph
            </Button>

            {/* Graph Grid Layout */}
            {template.graphs.length > 0 && (
              <DynamicLayout
                charts={template.graphs.map(g => ({
                  id: g.id,
                  type: g.type,
                  title: g.name,
                  data: getDummyData(), // Generate dummy data for now
                  width: g.layout.w * 100,
                  height: g.layout.h * 100
                }))}
                // Add other props
              />
            )}
          </div>
        )}

        <Button type="submit">Save Template</Button>
      </Card>
    </form>
  );
}