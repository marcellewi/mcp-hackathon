"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";

function CopyButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} title="Copy context ID">
      {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
    </Button>
  );
}

export default CopyButton;
