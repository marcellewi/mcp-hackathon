// frontend/components/SentryLogButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

interface SentryLogButtonProps {
  onLogsLoaded?: () => void;
}

export function SentryLogButton({ onLogsLoaded }: SentryLogButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSentryLogs = async () => {
    setIsLoading(true);
    
    try {
      // Use environment variable for API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/logs/sentry/sync`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP error: ${response.status}` }));
        throw new Error(errorData.detail || 'Failed to fetch Sentry logs');
      }
      
      const data = await response.json();
      
      toast({
        title: "Sentry logs synced",
        description: `Successfully synced ${data.files?.length || 0} logs from Sentry`,
      });
      
      if (onLogsLoaded) {
        onLogsLoaded();
      }
    } catch (error) {
      console.error('Error fetching Sentry logs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch Sentry logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline"
      onClick={fetchSentryLogs}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      Sync Sentry Logs
    </Button>
  );
}