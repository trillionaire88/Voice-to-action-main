import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton loading grid.
 * <LoadingGrid count={6} cols="grid-3col" height="h-32" />
 */
export default function LoadingGrid({ count = 6, cols = "grid-3col", height = "h-28" }) {
  return (
    <div className={cols}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("rounded-2xl", height)} />
      ))}
    </div>
  );
}