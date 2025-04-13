"use client";

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlusIcon, CopyIcon, FolderIcon, FolderOpenIcon, FileIcon, ChevronRightIcon, ChevronDownIcon, GithubIcon } from "lucide-react";
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

// Type for GitHub selections list
export type GitHubSelectionsList = {
  id: string;
  name: string;
  url: string;
  created_at: string;
}[];

type FolderStructure = {
  [key: string]: {
    files: Contexts;
    isExpanded: boolean;
  };
};

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [contexts, setContexts] = useState<Contexts>([]);
  const [selectedContexts, setSelectedContexts] = useState<number[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({});
  const [githubSelections, setGithubSelections] = useState<GitHubSelectionsList>([]); // State for GitHub selections
  const { toast } = useToast();

  // Function to fetch contexts (log files)
  const fetchContexts = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const response = await fetch(`${apiBaseUrl}/api/logs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch contexts: ${response.status}`);
      }
      const data = await response.json();
      setContexts(data);
      organizeFilesIntoFolders(data);
    } catch (error) {
      console.error("Failed to fetch contexts:", error);
    }
  };

  // Function to fetch GitHub selections
  const fetchGithubSelections = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      // We don't need a frontend proxy for this GET request unless auth is added
      const response = await fetch(`${apiBaseUrl}/api/github/selections`);
      if (!response.ok) {
        throw new Error(`Failed to fetch GitHub selections: ${response.status}`);
      }
      const data = await response.json();
      setGithubSelections(data);
      console.log(`Fetched ${data.length} GitHub selections.`);
    } catch (error) {
      console.error("Failed to fetch GitHub selections:", error);
      // Optional: Show toast on error
    }
  };

  // Function to organize files into a folder structure
  const organizeFilesIntoFolders = (files: Contexts) => {
    console.log("Organizing files into folders...");

    const structure: FolderStructure = {
      "Individual Files": { files: [], isExpanded: true },
    };

    files.forEach((file) => {
      const parts = file.filename.split("/");

      // If there's a path separator, it likely came from a zip
      if (parts.length > 1) {
        const folderName = parts[0]; // First part is the folder/zip name
        console.log(`File ${file.filename} belongs to folder: ${folderName}`);

        if (!structure[folderName]) {
          console.log(`Creating new folder: ${folderName}`);
          structure[folderName] = { files: [], isExpanded: false }; // Default to closed
        }

        structure[folderName].files.push(file);
      } else {
        // Individual files go to their own section
        console.log(`File ${file.filename} is an individual file`);
        structure["Individual Files"].files.push(file);
      }
    });

    // If there are no individual files, remove that section
    if (structure["Individual Files"].files.length === 0) {
      console.log("No individual files found, removing that section");
      delete structure["Individual Files"];
    }

    // Log the final structure
    console.log("Folder structure:", Object.keys(structure).join(", "));
    Object.entries(structure).forEach(([folder, { files }]) => {
      console.log(`${folder}: ${files.length} files`);
    });

    setFolderStructure(structure);
  };

  // Initial load of contexts and GitHub selections
  useEffect(() => {
    fetchContexts();
    fetchGithubSelections();
  }, []);

  // Listen for refresh events - currently only refreshes logs
  useEffect(() => {
    const handleRefreshContexts = () => {
      fetchContexts();
      // Consider adding a way to refresh GitHub selections too if needed
      fetchGithubSelections(); // Refresh GitHub selections as well
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

  const toggleFolder = (folderName: string) => {
    setFolderStructure((prev) => ({
      ...prev,
      [folderName]: {
        ...prev[folderName],
        isExpanded: !prev[folderName].isExpanded,
      },
    }));
  };

  const copySelectedIds = () => {
    const idsString = `Log IDs: [${selectedContexts.join(", ")}]`;
    navigator.clipboard.writeText(idsString);
    toast({
      title: "Copied log IDs to clipboard",
    });
  };

  const getFileName = (path: string) => {
    const parts = path.split("/");
    const name = parts.length > 1 ? parts[parts.length - 1] : path;
    return name.length > 12 ? name.slice(0, 12) + "..." : name;
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
              {Object.entries(folderStructure).map(([folderName, { files, isExpanded }]) => (
                <div key={folderName}>
                  {folderName !== "Individual Files" ? (
                    <>
                      {/* Folder header */}
                      <div className="flex items-center cursor-pointer px-2 py-1 rounded hover:bg-muted/50" onClick={() => toggleFolder(folderName)}>
                        {isExpanded ? (
                          <>
                            <FolderOpenIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                            <ChevronDownIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          </>
                        ) : (
                          <>
                            <FolderIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                            <ChevronRightIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                          </>
                        )}
                        <span className="text-sm font-medium truncate">{folderName.length > 12 ? folderName.slice(0, 12) + "..." : folderName}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{files.length}</span>
                      </div>

                      {/* Folder content */}
                      {isExpanded && (
                        <div className="ml-4">
                          {files.map((context) => (
                            <SidebarMenuItem key={context.id} className="flex items-center justify-between pr-2">
                              <div className="flex items-center flex-1">
                                <Checkbox checked={selectedContexts.includes(context.id)} onCheckedChange={() => handleContextSelect(context.id)} className="mr-2 bg-primary" />
                                <FileIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                                <SidebarMenuButton asChild className="flex-1 mr-2 text-sm">
                                  <Link href={`/context/${context.id}`}>{getFileName(context.filename).length > 12 ? getFileName(context.filename).slice(0, 12) + "..." : getFileName(context.filename)}</Link>
                                </SidebarMenuButton>
                              </div>
                              <CopyButton id={context.id.toString()} />
                            </SidebarMenuItem>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Individual files section */}
                      <div className="px-2 py-1 text-sm font-medium text-muted-foreground mt-2 mb-1">Individual Files</div>
                      {files.map((context) => (
                        <SidebarMenuItem key={context.id} className="flex items-center justify-between pr-2">
                          <div className="flex items-center flex-1">
                            <Checkbox checked={selectedContexts.includes(context.id)} onCheckedChange={() => handleContextSelect(context.id)} className="mr-2 bg-primary" />
                            <FileIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                            <SidebarMenuButton asChild className="flex-1 mr-2 text-sm">
                              <Link href={`/context/${context.id}`}>{context.filename.length > 16 ? context.filename.slice(0, 16) + "..." : context.filename}</Link>
                            </SidebarMenuButton>
                          </div>
                          <CopyButton id={context.id.toString()} />
                        </SidebarMenuItem>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GitHub Selections Section */}
        {githubSelections.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>GitHub Selections</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {githubSelections.map((selection) => (
                  <SidebarMenuItem key={selection.id} className="pr-2">
                    <SidebarMenuButton asChild className="flex items-center gap-2 text-sm">
                      <Link href={`/github/${selection.id}`}>
                        {" "}
                        {/* Link to a potential detail page */}
                        <GithubIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate" title={selection.name}>
                          {selection.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                    {/* Add CopyButton or other actions if needed later */}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          {selectedContexts.length > 0 && (
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 mb-2" onClick={copySelectedIds}>
              <CopyIcon className="h-4 w-4" />
              <span>Copy {selectedContexts.length} Log IDs</span> {/* Keep specific for now */}
            </Button>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
