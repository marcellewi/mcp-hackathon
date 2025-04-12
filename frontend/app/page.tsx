"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Upload, FileUp, CheckCircle, AlertCircle, Loader2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import JSZip from "jszip";
import { useToast } from "@/components/ui/use-toast";

type LogFile = {
  name: string;
  content: string;
};

export default function LogUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [extractedLogs, setExtractedLogs] = useState<LogFile[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
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
      console.log(`Selected log changed to: ${extractedLogs[selectedLogIndex]?.name}`);
    }
  }, [selectedLogIndex, extractedLogs]);

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
    const zipFiles = droppedFiles.filter((file) => file.type === "application/zip" || file.name.endsWith(".zip"));

    if (zipFiles.length === 0) {
      console.log("Error: No zip files found in dropped files");
      setErrorMessage("Please upload a zip file");
      setUploadStatus("error");
      return;
    }

    console.log(`Accepted ${zipFiles.length} zip files`);
    setFiles(zipFiles);
    setUploadStatus("idle");
    setErrorMessage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log("Files selected via file input");
      const selectedFiles = Array.from(e.target.files);
      const zipFiles = selectedFiles.filter((file) => file.type === "application/zip" || file.name.endsWith(".zip"));

      if (zipFiles.length === 12) {
        console.log("Error: No zip files found in selected files");
        setErrorMessage("Please upload a zip file");
        setUploadStatus("error");
        return;
      }

      console.log(`Accepted ${zipFiles.length} zip files`);
      setFiles(zipFiles);
      setUploadStatus("idle");
      setErrorMessage("");
    }
  };

  const extractLogs = async () => {
    if (files.length === 0) return;

    console.log("Starting log extraction process");
    setIsExtracting(true);
    setExtractedLogs([]);

    try {
      const extractedFiles: LogFile[] = [];

      for (const file of files) {
        console.log(`Processing zip file: ${file.name}`);
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        console.log(`Found ${Object.keys(contents.files).length} files in zip`);

        const filePromises = Object.keys(contents.files).map(async (filename) => {
          const zipEntry = contents.files[filename];

          // Skip directories
          if (zipEntry.dir) return;

          // Check if it's a log file (you can customize this check)
          if (filename.endsWith(".log") || filename.endsWith(".txt") || true) {
            const content = await zipEntry.async("string");
            extractedFiles.push({
              name: filename,
              content,
            });
            console.log(`Extracted file: ${filename}`);
          }
        });

        await Promise.all(filePromises);
      }

      console.log(`Successfully extracted ${extractedFiles.length} log files`);
      setExtractedLogs(extractedFiles);

      // If logs were extracted, switch to visualize tab
      if (extractedFiles.length > 0) {
        setActiveTab("visualize");
        setSelectedLogIndex(0);
        console.log("Switching to visualize tab");
      }
    } catch (error) {
      console.error("Error extracting logs:", error);
      setErrorMessage("Failed to extract logs from the zip file");
      setUploadStatus("error");
      toast({
        title: "Extraction Failed",
        description: "Failed to extract logs from the zip file",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
      console.log("Log extraction process completed");
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

      // Create a new JSZip instance
      const zip = new JSZip();

      // Add each log file to the zip
      extractedLogs.forEach((log, index) => {
        zip.file(log.name || `log_${index}.txt`, log.content);
      });

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      console.log(`Created zip blob of size: ${zipBlob.size} bytes`);

      // Create a file from the blob
      const zipFile = new File([zipBlob], "logs.zip", {
        type: "application/zip",
      });

      const formData = new FormData();
      formData.append("zip_file", zipFile);

      console.log("Sending upload request to server");
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload logs");
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
      return <div className="text-center py-10 text-muted-foreground">No log content to display</div>;
    }

    const content = extractedLogs[selectedLogIndex].content;
    const lines = content.split("\n");
    console.log(`Rendering log with ${lines.length} lines`);

    return (
      <div className="font-mono text-sm whitespace-pre-wrap">
        {lines.map((line, index) => {
          const isHighlighted = highlightedLines.includes(index);
          return (
            <div key={index} className={`py-0.5 px-2 ${isHighlighted ? "bg-yellow-100 dark:bg-yellow-900/30" : ""} ${index % 2 === 0 ? "bg-muted/50" : ""}`}>
              <span className="inline-block w-10 text-muted-foreground mr-2 text-right select-none">{index + 1}</span>
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
          <CardDescription>Easily manage the context you provide to LLMs to improve workflow efficiency and response quality</CardDescription>
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
              <TabsTrigger value="visualize" disabled={extractedLogs.length === 0}>
                Visualize Logs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="upload">
            <CardContent className="space-y-6 pt-6">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  console.log("Upload area clicked");
                  document.getElementById("file-upload")?.click();
                }}
              >
                <input id="file-upload" type="file" accept=".zip" className="hidden" onChange={handleFileChange} />
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-1">{isDragging ? "Drop your zip file here" : "Drag & drop your zip file here"}</h3>
                <p className="text-sm text-muted-foreground mb-2">or click to browse files</p>
                {files.length > 0 && (
                  <div className="mt-4 p-2 bg-muted rounded-md inline-block">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-4 w-4" />
                      <span className="text-sm font-medium">{files[0].name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Extraction and Upload Status */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">File Processing</h3>
                    {extractedLogs.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {extractedLogs.length} log file
                        {extractedLogs.length !== 1 ? "s" : ""} extracted
                      </span>
                    )}
                  </div>

                  {isExtracting && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Extracting logs from zip file...</span>
                    </div>
                  )}

                  {uploadStatus === "success" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Logs uploaded successfully!</span>
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
                        <span>Uploading logs...</span>
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
                disabled={isExtracting || isUploading}
              >
                Reset
              </Button>
              <div className="space-x-2">
                <Button
                  onClick={() => {
                    console.log("Extract Logs button clicked");
                    extractLogs();
                  }}
                  disabled={files.length === 0 || isExtracting || isUploading}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting
                    </>
                  ) : (
                    "Extract Logs"
                  )}
                </Button>
                <Button
                  onClick={() => {
                    console.log("Upload Logs button clicked");
                    uploadLogs();
                  }}
                  disabled={extractedLogs.length === 0 || isUploading || uploadStatus === "success"}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    "Upload Logs"
                  )}
                </Button>
              </div>
            </CardFooter>
          </TabsContent>

          <TabsContent value="visualize">
            <CardContent className="pt-6 space-y-4">
              {extractedLogs.length > 0 && (
                <>
                  {/* Log Navigation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          console.log("Previous log button clicked");
                          setSelectedLogIndex((prev) => Math.max(0, prev - 1));
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
                          console.log("Next log button clicked");
                          setSelectedLogIndex((prev) => Math.min(extractedLogs.length - 1, prev + 1));
                        }}
                        disabled={selectedLogIndex === extractedLogs.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm font-medium truncate max-w-[50%]">{extractedLogs[selectedLogIndex]?.name}</div>
                  </div>

                  {/* Search */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search in log file..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => {
                          console.log(`Search query changed: "${e.target.value}"`);
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

                  {/* Log Content */}
                  <div className="border rounded-md">
                    <ScrollArea className="h-[400px] w-full">{renderLogContent()}</ScrollArea>
                  </div>

                  {/* Search Results Summary */}
                  {highlightedLines.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Found {highlightedLines.length} matching line
                      {highlightedLines.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </>
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
                  console.log("Upload Logs button clicked from visualize tab");
                  uploadLogs();
                }}
                disabled={extractedLogs.length === 0 || isUploading || uploadStatus === "success"}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading
                  </>
                ) : (
                  "Upload Logs"
                )}
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
