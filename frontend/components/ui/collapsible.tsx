"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> & {
    children: (props: { open: boolean }) => React.ReactNode;
  }
>(({ children, ...props }, ref) => {
  // Use useState to track open state for the render prop pattern
  const [open, setOpen] = React.useState(false);

  return (
    <CollapsiblePrimitive.Trigger
      ref={ref}
      {...props}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        setOpen(!open);
        props.onClick?.(e);
      }}
    >
      {children({ open })}
    </CollapsiblePrimitive.Trigger>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = CollapsiblePrimitive.Content;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
