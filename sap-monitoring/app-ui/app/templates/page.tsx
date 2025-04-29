import Mainscreen from './_components/mainScreen'
import { Layout } from "react-grid-layout";

export default function TemplatesPage() {
  const handleLayoutReset = async (newLayout: Layout[]) => {
    try {
      // Save the new layout to localStorage for dashboard sync
      const layoutKey = `template-layout-${templateId}`;
      localStorage.setItem(layoutKey, JSON.stringify({
        timestamp: new Date().toISOString(),
        layout: newLayout
      }));

      // If we have an API endpoint for syncing layouts, call it
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

  // Add this function to handle graph changes
  const handleGraphChange = (action: 'add' | 'delete') => {
    if (!selectedTemplate?.id) return;
    
    // Store the change info in localStorage
    localStorage.setItem('template-graph-change', JSON.stringify({
      templateId: selectedTemplate.id,
      needsReset: true,
      action: action,
      timestamp: new Date().toISOString()
    }));
  };

  // Update the onDeleteGraph function
  const onDeleteGraph = async (graphId: string) => {
    if (!selectedTemplate) return;

    try {
      setIsLoading(true);
      
      // First, handle the graph change notification
      handleGraphChange('delete');

      // Remove the graph from the template
      const updatedGraphs = selectedTemplate.graphs.filter(g => g.id !== graphId);
      
      // Update the template with the new graphs array
      const updatedTemplate = {
        ...selectedTemplate,
        graphs: updatedGraphs
      };

      // Update local state
      setSelectedTemplate(updatedTemplate);
      
      // Save to API
      await saveTemplate(updatedTemplate);
      
      toast.success("Graph deleted successfully");
    } catch (error) {
      console.error("Error deleting graph:", error);
      toast.error("Failed to delete graph");
    } finally {
      setIsLoading(false);
    }
  };

  // Update the onAddGraph function
  const onAddGraph = async (newGraph: Graph) => {
    if (!selectedTemplate) return;

    try {
      setIsLoading(true);
      
      // First, handle the graph change notification
      handleGraphChange('add');

      // Add the new graph to the template
      const updatedGraphs = [...selectedTemplate.graphs, newGraph];
      
      // Update the template with the new graphs array
      const updatedTemplate = {
        ...selectedTemplate,
        graphs: updatedGraphs
      };

      // Update local state
      setSelectedTemplate(updatedTemplate);
      
      // Save to API
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