import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading posts">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
