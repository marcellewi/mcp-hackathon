"use client";

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlusIcon, CopyIcon } from "lucide-react";
import CopyButton from "@/components/copy-button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

export type Contexts = {
  id: number;
  filename: string;
  content: string;
}[];

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [contexts, setContexts] = useState<Contexts>([]);
  const [selectedContexts, setSelectedContexts] = useState<number[]>([]);
  const { toast } = useToast();

  // Function to fetch contexts
  const fetchContexts = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/api/logs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch contexts: ${response.status}`);
      }
      const data = await response.json();
      setContexts(data);
    } catch (error) {
      console.error("Failed to fetch contexts:", error);
    }
  };

  // Initial load of contexts
  useEffect(() => {
    fetchContexts();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefreshContexts = () => {
      fetchContexts();
    };

    window.addEventListener("refreshContexts", handleRefreshContexts);

    return () => {
      window.removeEventListener("refreshContexts", handleRefreshContexts);
    };
  }, []);

  const handleContextSelect = (id: number) => {
    setSelectedContexts((prev) => {
      if (prev.includes(id)) {
        return prev.filter((contextId) => contextId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const copySelectedIds = () => {
    const idsString = `Log IDs: [${selectedContexts.join(", ")}]`;
    navigator.clipboard.writeText(idsString);
    toast({
      title: "Copied log IDs to clipboard",
    });
  };

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <Button className="w-full flex items-center justify-center gap-2 mb-2" asChild>
            <Link href="/">
              <PlusIcon className="h-4 w-4" />
              <span>New Context</span>
            </Link>
          </Button>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Elements</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contexts.map((context) => (
                <SidebarMenuItem key={context.id} className="flex items-center justify-between pr-2">
                  <div className="flex items-center flex-1">
                    <Checkbox checked={selectedContexts.includes(context.id)} onCheckedChange={() => handleContextSelect(context.id)} className="mr-2 bg-primary" />
                    <SidebarMenuButton asChild className="flex-1 mr-2">
                      <Link href={`/context/${context.id}`}>{context.filename.length > 20 ? context.filename.slice(0, 20) + "..." : context.filename}</Link>
                    </SidebarMenuButton>
                  </div>
                  <CopyButton id={context.id.toString()} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {selectedContexts.length > 0 && (
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 mb-2" onClick={copySelectedIds}>
              <CopyIcon className="h-4 w-4" />
              <span>Copy {selectedContexts.length} IDs</span>
            </Button>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
