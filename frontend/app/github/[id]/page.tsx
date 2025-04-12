"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, GithubIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

// Types mirroring backend Pydantic models
interface GitHubTreeNode {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface GitHubSelectionDetail {
  id: string;
  name: string;
  url: string;
  selected_files?: string[];
  created_at?: string;
}

const MAX_TOKENS = 40000;

export default function GitHubSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const selectionId = params.id as string;

  const [selectionDetails, setSelectionDetails] = useState<GitHubSelectionDetail | null>(null);
  const [repoTree, setRepoTree] = useState<GitHubTreeNode[]>([]);
  const [selectedRepoFiles, setSelectedRepoFiles] = useState<Record<string, boolean>>({});
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingTree, setIsFetchingTree] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch selection details and repo tree on load
  useEffect(() => {
    if (!selectionId) return;

    const fetchDetailsAndTree = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch selection details first
        const detailsRes = await fetch(`/api/github/${selectionId}`);
        if (!detailsRes.ok) {
          throw new Error(`Failed to fetch selection details: ${detailsRes.status}`);
        }
        const details: GitHubSelectionDetail = await detailsRes.json();
        setSelectionDetails(details);

        // Initialize selection state from details
        const initialSelection: Record<string, boolean> = {};
        if (details.selected_files) {
          details.selected_files.forEach((path) => {
            initialSelection[path] = true;
          });
        }
        setSelectedRepoFiles(initialSelection);

        // Then fetch the tree
        setIsFetchingTree(true);
        const treeRes = await fetch(`/api/github/tree?repo_url=${encodeURIComponent(details.url)}`);
        if (!treeRes.ok) {
          const treeError = await treeRes.json();
          throw new Error(treeError.detail || `Failed to fetch repository tree: ${treeRes.status}`);
        }
        const treeData = await treeRes.json();
        const filesOnly = treeData.tree.filter((node: GitHubTreeNode) => node.type === "blob");
        setRepoTree(filesOnly);

        // Calculate initial token count after tree is loaded
        recalculateTokens(initialSelection, filesOnly);
      } catch (err) {
        console.error("Error loading selection details or tree:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        toast({
          title: "Error Loading Data",
          description: err instanceof Error ? err.message : "Could not load repository details or file tree.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsFetchingTree(false);
      }
    };

    fetchDetailsAndTree();
  }, [selectionId, toast]);

  // Function to recalculate tokens based on current selection and tree
  const recalculateTokens = (currentSelection: Record<string, boolean>, tree: GitHubTreeNode[]) => {
    let count = 0;
    tree.forEach((node) => {
      if (currentSelection[node.path] && node.size !== undefined) {
        count += Math.ceil(node.size / 4); // Rough estimate
      }
    });
    setEstimatedTokens(count);
  };

  // Handle file selection change
  const handleRepoFileSelect = (path: string, size: number | undefined) => {
    const currentSelection = { ...selectedRepoFiles };
    const tokenEstimate = Math.ceil((size ?? 0) / 4);
    let nextTokenCount = estimatedTokens;

    if (currentSelection[path]) {
      // Deselecting
      delete currentSelection[path];
      nextTokenCount -= tokenEstimate;
    } else {
      // Selecting - Check token limit BEFORE adding
      if (estimatedTokens + tokenEstimate > MAX_TOKENS) {
        toast({
          title: "Token Limit Reached",
          description: `Adding this file would exceed the ${MAX_TOKENS.toLocaleString()} token limit.`,
          variant: "destructive",
        });
        return; // Prevent selection
      }
      currentSelection[path] = true;
      nextTokenCount += tokenEstimate;
    }

    setSelectedRepoFiles(currentSelection);
    setEstimatedTokens(Math.max(0, nextTokenCount));
  };

  // Handle saving the updated selection
  const saveUpdatedSelection = async () => {
    const selectedPaths = Object.keys(selectedRepoFiles).filter((path) => selectedRepoFiles[path]);

    if (estimatedTokens > MAX_TOKENS) {
      toast({ title: "Token Limit Exceeded", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/github/${selectionId}/update-selection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_files: selectedPaths }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to update selection: ${response.status}`);
      }

      toast({ title: "Selection Updated Successfully" });
      // Optionally trigger sidebar refresh or navigate away
      // Refresh sidebar data
      const event = new CustomEvent("refreshContexts");
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error updating selection:", error);
      toast({
        title: "Failed to Update Selection",
        description: error instanceof Error ? error.message : "Could not save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto py-10 px-4 text-center text-destructive">Error: {error}</div>;
  }

  if (!selectionDetails) {
    return <div className="container mx-auto py-10 px-4 text-center text-muted-foreground">Selection not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <GithubIcon className="h-6 w-6" /> {selectionDetails.name}
              </CardTitle>
              <CardDescription className="mt-1">
                Select files from this repository to include in the context.
                <Link href={selectionDetails.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline inline-flex items-center gap-1 text-xs">
                  <ExternalLinkIcon className="h-3 w-3" /> View on GitHub
                </Link>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              Back to Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isFetchingTree ? (
            <div className="text-center py-10">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading repository files...</p>
            </div>
          ) : repoTree.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Files</h3>
              <div className="border rounded-md max-h-[500px]">
                <ScrollArea className="h-[500px] p-4">
                  {repoTree.map((node) => (
                    <div key={node.path} className="flex items-center gap-2 mb-1 py-1">
                      <Checkbox id={`repo-file-${node.path}`} checked={!!selectedRepoFiles[node.path]} onCheckedChange={() => handleRepoFileSelect(node.path, node.size)} disabled={isSaving} />
                      <label htmlFor={`repo-file-${node.path}`} className="flex-1 text-sm cursor-pointer truncate" title={node.path}>
                        {node.path}
                      </label>
                      {node.size !== undefined && <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{Math.ceil(node.size / 1024)} KB</span>}
                    </div>
                  ))}
                </ScrollArea>
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className={`text-sm font-medium ${estimatedTokens > MAX_TOKENS ? "text-destructive" : "text-muted-foreground"}`}>
                  Estimated Tokens: {estimatedTokens.toLocaleString()} / {MAX_TOKENS.toLocaleString()}
                </p>
                <Button onClick={saveUpdatedSelection} disabled={isSaving || estimatedTokens > MAX_TOKENS || isFetchingTree}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Update Selection"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">No files found in the repository tree.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
