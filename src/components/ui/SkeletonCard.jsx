import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-white">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <Skeleton className="h-5 w-full rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <div className="flex gap-3 pt-1">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between pt-1">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4 rounded" />
        <Skeleton className="h-5 w-1/2 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}
