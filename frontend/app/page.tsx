"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Upload,
  FileUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import JSZip from "jszip";
import { useToast } from "@/components/ui/use-toast";

type LogFile = {
  name: string;
  content: string;
  parentZip?: string; // Optional field to track which zip file it came from
};

// Helper type for organizing files in the sidebar
type FileGroup = {
  zipName: string;
  files: LogFile[];
};

export default function LogUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [extractedLogs, setExtractedLogs] = useState<LogFile[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]); // For organizing files by zip
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "visualize">("upload");
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const { toast } = useToast();

  // Log component initialization
  useEffect(() => {
    console.log("LogUploader component initialized");
    return () => {
      console.log("LogUploader component unmounted");
    };
  }, []);

  // Log state changes
  useEffect(() => {
    if (files.length > 0) {
      console.log(`Files selected: ${files.map((f) => f.name).join(", ")}`);
    }
  }, [files]);

  useEffect(() => {
    if (extractedLogs.length > 0) {
      console.log(`Extracted ${extractedLogs.length} log files`);
    }
  }, [extractedLogs]);

  useEffect(() => {
    if (activeTab !== "upload") {
      console.log(`Tab changed to: ${activeTab}`);
    }
  }, [activeTab]);

  useEffect(() => {
    if (uploadStatus !== "idle") {
      console.log(`Upload status changed to: ${uploadStatus}`);
    }
  }, [uploadStatus]);

  useEffect(() => {
    if (selectedLogIndex !== 0 && extractedLogs.length > 0) {
      console.log(
        `Selected log changed to: ${extractedLogs[selectedLogIndex]?.name}`
      );
    }
  }, [selectedLogIndex, extractedLogs]);

  // Effect to organize files by their parent zip
  useEffect(() => {
    if (extractedLogs.length > 0) {
      console.log(`Organizing ${extractedLogs.length} files into groups`);

      // Group files by parent zip
      const groups: FileGroup[] = [];
      const individualFiles: LogFile[] = [];

      extractedLogs.forEach((file) => {
        if (file.parentZip) {
          // Check if group already exists
          const existingGroup = groups.find(
            (g) => g.zipName === file.parentZip
          );

          if (existingGroup) {
            existingGroup.files.push(file);
          } else {
            groups.push({
              zipName: file.parentZip,
              files: [file],
            });
          }
        } else {
          individualFiles.push(file);
        }
      });

      // Add individual files as their own group
      if (individualFiles.length > 0) {
        groups.push({
          zipName: "Individual Files",
          files: individualFiles,
        });
      }

      // Initialize expanded state for all folders
      const newExpandedState: Record<string, boolean> = {};
      groups.forEach((group) => {
        newExpandedState[group.zipName] = true; // Default to expanded
      });
      setExpandedFolders(newExpandedState);

      setFileGroups(groups);
      console.log(`Created ${groups.length} file groups`);
    } else {
      setFileGroups([]);
    }
  }, [extractedLogs]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    console.log("Files dropped");

    const droppedFiles = Array.from(e.dataTransfer.files);

    if (droppedFiles.length === 0) {
      console.log("Error: No files found in dropped files");
      setErrorMessage("Please upload at least one file");
      setUploadStatus("error");
      return;
    }

    console.log(`Accepted ${droppedFiles.length} files`);
    setFiles(droppedFiles);
    setUploadStatus("idle");
    setErrorMessage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log("Files selected via file input");
      const selectedFiles = Array.from(e.target.files);

      console.log(`Accepted ${selectedFiles.length} files`);
      setFiles(selectedFiles);
      setUploadStatus("idle");
      setErrorMessage("");
    }
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    console.log("Starting file processing");
    setIsProcessing(true);
    setExtractedLogs([]);

    try {
      const extractedFiles: LogFile[] = [];

      for (const file of files) {
        console.log(`Processing file: ${file.name}`);

        if (file.name.endsWith(".zip")) {
          // Process as zip file
          console.log(`Processing as zip file: ${file.name}`);
          const zipName = file.name.replace(".zip", "");
          const zip = new JSZip();
          const contents = await zip.loadAsync(file);
          console.log(
            `Found ${Object.keys(contents.files).length} files in zip`
          );

          const filePromises = Object.keys(contents.files).map(
            async (filename) => {
              const zipEntry = contents.files[filename];

              // Skip directories
              if (zipEntry.dir) return;

              const content = await zipEntry.async("string");
              extractedFiles.push({
                name: filename,
                content,
                parentZip: zipName, // Set the parent zip name
              });
              console.log(`Extracted file from zip: ${filename}`);
            }
          );

          await Promise.all(filePromises);
        } else {
          // Process as individual file
          console.log(`Processing as individual file: ${file.name}`);

          try {
            const content = await file.text();
            extractedFiles.push({
              name: file.name,
              content,
              // No parentZip field for individual files
            });
            console.log(`Processed individual file: ${file.name}`);
          } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            toast({
              title: "File Processing Error",
              description: `Could not read ${file.name}. It may not be a text file.`,
              variant: "destructive",
            });
          }
        }
      }

      console.log(`Successfully processed ${extractedFiles.length} files`);
      setExtractedLogs(extractedFiles);

      // If logs were extracted, switch to visualize tab
      if (extractedFiles.length > 0) {
        setActiveTab("visualize");
        setSelectedLogIndex(0);
        console.log("Switching to visualize tab");
      }
    } catch (error) {
      console.error("Error processing files:", error);
      setErrorMessage("Failed to process files");
      setUploadStatus("error");
      toast({
        title: "Processing Failed",
        description: "Failed to process the uploaded files",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      console.log("File processing completed");
    }
  };

  const uploadLogs = async () => {
    if (extractedLogs.length === 0) {
      console.log("Error: No logs to upload");
      setErrorMessage("No logs to upload");
      setUploadStatus("error");
      return;
    }

    console.log("Starting log upload process");
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("idle");

    try {
      // Replace with your actual API endpoint
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/logs/upload-logs/`;
      console.log(`Uploading to: ${apiUrl}`);

      // Upload each file individually or as a zip based on number of files
      if (extractedLogs.length === 1) {
        // Single file upload
        const logFile = extractedLogs[0];
        const fileContent = new Blob([logFile.content], { type: "text/plain" });

        // Use the full path including parentZip if available
        const fileName = logFile.parentZip
          ? `${logFile.parentZip}/${logFile.name}`
          : logFile.name;

        const file = new File([fileContent], fileName, { type: "text/plain" });

        const formData = new FormData();
        formData.append("file", file);

        console.log(`Sending single file upload request for ${fileName}`);
        const response = await fetch(apiUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
      } else {
        // Multiple files, zip them up
        const zip = new JSZip();

        // Generate a descriptive zip name
        // Use the first file's name or timestamp as part of the zip name
        const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        const firstFilePrefix =
          files.length > 0
            ? files[0].name.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_")
            : "upload";
        const zipName = `${firstFilePrefix}_${dateStr}`;

        // Add each log file to the zip with proper structure
        extractedLogs.forEach((log) => {
          // For files already in a folder structure, preserve it
          // For loose files, don't add any prefix
          const filePath = log.parentZip
            ? `${log.parentZip}/${log.name}`
            : log.name;
          zip.file(filePath, log.content);
        });

        // Generate the zip file
        const zipBlob = await zip.generateAsync({ type: "blob" });
        console.log(`Created zip blob of size: ${zipBlob.size} bytes`);

        // Create a file from the blob with the custom name
        const zipFile = new File([zipBlob], `${zipName}.zip`, {
          type: "application/zip",
        });

        const formData = new FormData();
        formData.append("file", zipFile);

        console.log(`Sending zip upload request to server for ${zipName}.zip`);
        const response = await fetch(apiUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
      }

      console.log("Upload completed successfully");
      setUploadProgress(100);
      setUploadStatus("success");

      // Refresh contexts by triggering a reload of context data
      try {
        console.log("Triggering context refresh");
        // Force refresh by reloading the sidebar data
        const event = new CustomEvent("refreshContexts");
        window.dispatchEvent(event);
      } catch (refreshError) {
        console.error("Error refreshing contexts:", refreshError);
        // Don't fail the main upload operation if context refresh fails
      }
    } catch (error) {
      console.error("Error uploading logs:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload logs"
      );
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
      console.log("Log upload process completed");
    }
  };

  const resetUpload = () => {
    console.log("Resetting upload state");
    setFiles([]);
    setExtractedLogs([]);
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrorMessage("");
    setActiveTab("upload");
    setSelectedLogIndex(0);
    setSearchQuery("");
    setHighlightedLines([]);

    // Reset the file input element itself
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !extractedLogs[selectedLogIndex]) {
      console.log("Search query empty or no log selected");
      setHighlightedLines([]);
      return;
    }

    console.log(`Searching for: "${searchQuery}"`);
    const content = extractedLogs[selectedLogIndex].content;
    const lines = content.split("\n");
    const matchedLineIndices: number[] = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
        matchedLineIndices.push(index);
      }
    });

    console.log(`Found ${matchedLineIndices.length} matching lines`);
    setHighlightedLines(matchedLineIndices);
  };

  const renderLogContent = () => {
    if (extractedLogs.length === 0 || !extractedLogs[selectedLogIndex]) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          No log content to display
        </div>
      );
    }

    const content = extractedLogs[selectedLogIndex].content;
    const lines = content.split("\n");
    console.log(`Rendering log with ${lines.length} lines`);

    return (
      <div className="font-mono text-sm whitespace-pre-wrap">
        {lines.map((line, index) => {
          const isHighlighted = highlightedLines.includes(index);
          return (
            <div
              key={index}
              className={`py-0.5 px-2 ${
                isHighlighted ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
              } ${index % 2 === 0 ? "bg-muted/50" : ""}`}
            >
              <span className="inline-block w-10 text-muted-foreground mr-2 text-right select-none">
                {index + 1}
              </span>
              {line || " "}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Manual Context Manager</CardTitle>
          <CardDescription>
            Easily manage the context you provide to LLMs to improve workflow
            efficiency and response quality
          </CardDescription>
        </CardHeader>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            console.log(`Tab changed to: ${value}`);
            setActiveTab(value as "upload" | "visualize");
          }}
        >
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger
                value="visualize"
                disabled={extractedLogs.length === 0}
              >
                Visualize Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload">
            <CardContent className="space-y-6 pt-6">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  console.log("Upload area clicked");
                  document.getElementById("file-upload")?.click();
                }}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-1">
                  {isDragging
                    ? "Drop your files here"
                    : "Drag & drop your files here"}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  or click to browse files (zip files will be extracted)
                </p>
                {files.length > 0 && (
                  <div className="mt-4 p-2 bg-muted rounded-md inline-block">
                    {files.length === 1 ? (
                      <div className="flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {files[0].name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {files.length} files selected
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Processing and Upload Status */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">File Processing</h3>
                    {extractedLogs.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {extractedLogs.length} file
                        {extractedLogs.length !== 1 ? "s" : ""} processed
                      </span>
                    )}
                  </div>

                  {isProcessing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing files...</span>
                    </div>
                  )}

                  {uploadStatus === "success" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Files uploaded successfully!</span>
                    </div>
                  )}

                  {uploadStatus === "error" && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errorMessage || "An error occurred"}</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading files...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  console.log("Reset button clicked");
                  resetUpload();
                }}
                disabled={isProcessing || isUploading}
              >
                Reset
              </Button>
              <div className="space-x-2">
                <Button
                  onClick={() => {
                    console.log("Process Files button clicked");
                    processFiles();
                  }}
                  disabled={files.length === 0 || isProcessing || isUploading}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    "Process Files"
                  )}
                </Button>
                <Button
                  onClick={() => {
                    console.log("Upload Files button clicked");
                    uploadLogs();
                  }}
                  disabled={
                    extractedLogs.length === 0 ||
                    isUploading ||
                    uploadStatus === "success"
                  }
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    "Upload Files"
                  )}
                </Button>
              </div>
            </CardFooter>
          </TabsContent>

          <TabsContent value="visualize">
            <CardContent className="pt-6 p-0 space-y-0">
              {extractedLogs.length > 0 && (
                <div className="flex h-[500px]">
                  {/* Main content */}
                  <div className="flex-1 p-4 space-y-4">
                    {/* Log Navigation */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            console.log("Previous file button clicked");
                            setSelectedLogIndex((prev) =>
                              Math.max(0, prev - 1)
                            );
                          }}
                          disabled={selectedLogIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium">
                          File {selectedLogIndex + 1} of {extractedLogs.length}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            console.log("Next file button clicked");
                            setSelectedLogIndex((prev) =>
                              Math.min(extractedLogs.length - 1, prev + 1)
                            );
                          }}
                          disabled={
                            selectedLogIndex === extractedLogs.length - 1
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search in file..."
                          className="pl-8"
                          value={searchQuery}
                          onChange={(e) => {
                            console.log(
                              `Search query changed: "${e.target.value}"`
                            );
                            setSearchQuery(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              console.log("Search triggered via Enter key");
                              handleSearch();
                            }
                          }}
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-7 w-7"
                            onClick={() => {
                              console.log("Clear search button clicked");
                              setSearchQuery("");
                              setHighlightedLines([]);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          console.log("Search button clicked");
                          handleSearch();
                        }}
                        disabled={!searchQuery.trim()}
                      >
                        Search
                      </Button>
                    </div>

                    {/* File Content */}
                    <div className="border rounded-md">
                      <ScrollArea className="h-[320px] max-w-[990px] w-full">
                        {renderLogContent()}
                      </ScrollArea>
                    </div>

                    {/* Search Results Summary */}
                    {highlightedLines.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Found {highlightedLines.length} matching line
                        {highlightedLines.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  console.log("Back to Upload button clicked");
                  setActiveTab("upload");
                }}
              >
                Back to Upload
              </Button>
              <Button
                onClick={() => {
                  console.log("Upload Files button clicked from visualize tab");
                  uploadLogs();
                }}
                disabled={
                  extractedLogs.length === 0 ||
                  isUploading ||
                  uploadStatus === "success"
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading
                  </>
                ) : (
                  "Upload Files"
                )}
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
