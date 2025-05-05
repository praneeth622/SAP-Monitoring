"use client";
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Graph } from '@/types'; // Adjust this import to match your actual types
import Mainscreen from './_components/mainScreen'
import { Layout } from "react-grid-layout";

export default function TemplatesPage() {
  const [templateId, setTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [baseUrl, setBaseUrl] = useState<string>('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || '';
    setTemplateId(id);
    setBaseUrl(window.location.origin);

    if (id) {
      loadTemplateData(id);
    }
  }, []);

  const loadTemplateData = async (id: string) => {
    try {
      setIsLoading(true);
      // Replace this with your actual API call
      // const response = await fetch(`${baseUrl}/api/templates/${id}`);
      // const data = await response.json();
      // setSelectedTemplate(data);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async (template: any) => {
    try {
      // Replace with your actual save implementation
      // const response = await fetch(`${baseUrl}/api/templates/${template.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(template)
      // });
      // if (!response.ok) throw new Error('Failed to save template');
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  const handleLayoutReset = async (newLayout: Layout[]) => {
    try {
      const layoutKey = `template-layout-${templateId}`;
      localStorage.setItem(layoutKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        layout: newLayout
      }));

      if (baseUrl) {
        const response = await fetch(`${baseUrl}/api/ut/sync-layout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId,
            layout: newLayout
          })
        });

        if (!response.ok) {
          throw new Error('Failed to sync layout with server');
        }
      }
    } catch (error) {
      console.error('Error syncing layout:', error);
      toast.error('Failed to sync layout with dashboard');
    }
  };

  const handleGraphChange = (action: 'add' | 'delete') => {
    if (!selectedTemplate?.id) return;

    const changeId = `${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    localStorage.setItem('template-graph-change', JSON.stringify({
      templateId: selectedTemplate.id,
      needsReset: true,
      action: action,
      timestamp: new Date().toISOString(),
      changeId
    }));
  };

  const onDeleteGraph = async (graphId: string) => {
    if (!selectedTemplate) return;

    try {
      setIsLoading(true);

      handleGraphChange('delete');

      const updatedGraphs = selectedTemplate.graphs.filter((g: any) => g.id !== graphId);

      const updatedTemplate = {
        ...selectedTemplate,
        graphs: updatedGraphs
      };

      setSelectedTemplate(updatedTemplate);

      await saveTemplate(updatedTemplate);

      toast.success("Graph deleted successfully");
    } catch (error) {
      console.error("Error deleting graph:", error);
      toast.error("Failed to delete graph");
    } finally {
      setIsLoading(false);
    }
  };

  const onAddGraph = async (newGraph: Graph) => {
    if (!selectedTemplate) return;

    try {
      setIsLoading(true);

      handleGraphChange('add');

      const updatedGraphs = [...selectedTemplate.graphs, newGraph];

      const updatedTemplate = {
        ...selectedTemplate,
        graphs: updatedGraphs
      };

      setSelectedTemplate(updatedTemplate);

      await saveTemplate(updatedTemplate);

      toast.success("Graph added successfully");
    } catch (error) {
      console.error("Error adding graph:", error);
      toast.error("Failed to add graph");
    } finally {
      setIsLoading(false);
    }
  };

  return <Mainscreen />
}