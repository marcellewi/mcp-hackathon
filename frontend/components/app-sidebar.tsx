"use client";

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import CopyButton from "@/components/copy-button";
import Link from "next/link";
import { useEffect, useState } from "react";

export type Contexts = {
  id: number;
  filename: string;
  content: string;
}[];

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [contexts, setContexts] = useState<Contexts>([]);

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
                  <SidebarMenuButton asChild className="flex-1 mr-2">
                    <Link href={`/context/${context.id}`}>{context.filename}</Link>
                  </SidebarMenuButton>
                  <CopyButton id={context.id.toString()} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
