"use client";

import { useState } from "react";
import { Search, X, ChevronLeft, ChevronRight, CopyIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type LogFile = {
  id: number;
  name: string;
  content: string;
};

export default function LogViewer({ log }: { log: LogFile }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(log.id.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !log) {
      setHighlightedLines([]);
      return;
    }

    const content = log.content;
    const lines = content.split("\n");
    const matchedLineIndices: number[] = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
        matchedLineIndices.push(index);
      }
    });

    setHighlightedLines(matchedLineIndices);
  };

  const renderLogContent = () => {
    if (!log) {
      return <div className="text-center py-10 text-muted-foreground">No log content to display</div>;
    }

    const content = log.content;
    const lines = content.split("\n");

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
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Log Viewer</CardTitle>
            <CardDescription>Viewing log: {log.name}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">ID: {log.id}</div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopy} title="Copy context ID">
              {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search in log file..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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
                  setSearchQuery("");
                  setHighlightedLines([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
            Search
          </Button>
        </div>

        {/* Log Content */}
        <div className="border rounded-md">
          <ScrollArea className="h-[500px] w-full">{renderLogContent()}</ScrollArea>
        </div>

        {/* Search Results Summary */}
        {highlightedLines.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Found {highlightedLines.length} matching line{highlightedLines.length !== 1 ? "s" : ""}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between mt-4">
        <Button variant="outline" asChild>
          <a href="/">Back to Home</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
