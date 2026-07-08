import { useTheme } from "@/lib/ThemeContext";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
}: SkeletonProps) {
  const { isLightMode } = useTheme();

  const baseBg = isLightMode ? "bg-slate-100" : "bg-[#181d22]";
  const shapeClass =
    variant === "circular"
      ? "rounded-full"
      : variant === "text"
      ? "rounded"
      : "rounded-2xl";

  return (
    <div
      className={`animate-pulse ${baseBg} ${shapeClass} ${className}`}
      style={{
        width,
        height,
      }}
    />
  );
}

// Pre-configured activity item skeleton list
export function ActivityListSkeleton({ count = 3 }: { count?: number }) {
  const { isLightMode } = useTheme();
  const visitCardBg = isLightMode
    ? "bg-white border-slate-100"
    : "bg-[#12161a] border-[#222831]";

  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 p-3 border rounded-2xl shadow-sm ${visitCardBg}`}
        >
          {/* Thumbnail */}
          <Skeleton className="w-20 h-11 flex-shrink-0" />
          
          {/* Details */}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/4" />
            <Skeleton variant="text" className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Pre-configured camera list skeleton
export function CameraListSkeleton({ count = 3 }: { count?: number }) {
  const { isLightMode } = useTheme();
  const cardBg = isLightMode ? "bg-white" : "bg-[#0e1114]";
  const cardBorder = isLightMode ? "border border-slate-100" : "border border-[#222831]";

  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`px-5 py-4 border rounded-2xl shadow-sm animate-pulse flex items-center gap-4 ${cardBg} ${cardBorder}`}
        >
          <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/3" />
            <Skeleton variant="text" className="h-3 w-1/2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-20 h-8 rounded-2xl" />
            <Skeleton className="w-9 h-8 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Pre-configured journey list skeleton
export function JourneyListSkeleton({ count = 3 }: { count?: number }) {
  const { isLightMode } = useTheme();
  const cardBg = isLightMode ? "bg-white" : "bg-[#0e1114]";
  const cardBorder = isLightMode ? "border border-slate-100" : "border border-[#222831]";

  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`px-5 py-4 border rounded-2xl shadow-sm animate-pulse flex items-center justify-between ${cardBg} ${cardBorder}`}
        >
          <div className="flex items-center gap-4 flex-1">
            <Skeleton className="w-24 h-7 rounded-lg flex-shrink-0" />
            <Skeleton className="w-16 h-6 rounded-full flex-shrink-0" />
            <div className="flex gap-2 flex-1 max-w-[200px]">
              <Skeleton variant="text" className="h-4 w-full" />
            </div>
          </div>
          <div className="flex gap-4 flex-shrink-0">
            <div className="space-y-1 text-right">
              <Skeleton variant="text" className="h-4 w-12 ml-auto" />
              <Skeleton variant="text" className="h-3 w-8 ml-auto" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton variant="text" className="h-4 w-12 ml-auto" />
              <Skeleton variant="text" className="h-3 w-8 ml-auto" />
            </div>
            <Skeleton variant="circular" className="w-4 h-4 mt-2 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Pre-configured watchlist card list skeleton
export function WatchlistListSkeleton({ count = 3 }: { count?: number }) {
  const { isLightMode } = useTheme();
  const cardBg = isLightMode ? "bg-white" : "bg-[#0e1114]";
  const cardBorder = isLightMode ? "border border-slate-100" : "border border-[#222831]";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`p-5 flex flex-col border rounded-2xl shadow-sm animate-pulse ${cardBg} ${cardBorder}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-10 h-10 flex-shrink-0" />
              <Skeleton className="w-24 h-7 rounded-lg flex-shrink-0" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          </div>
          <Skeleton variant="text" className="h-4 w-3/4 mb-4" />
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100 dark:border-[#181d22]">
            <Skeleton className="w-16 h-5 rounded flex-shrink-0" />
            <Skeleton variant="text" className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Pre-configured alert table rows skeleton
export function AlertTableSkeleton({ count = 4 }: { count?: number }) {
  const { isLightMode } = useTheme();

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-5 py-3">
            <Skeleton className="w-16 h-10 rounded-2xl" />
          </td>
          <td className="px-5 py-3">
            <Skeleton className="w-20 h-6 rounded-lg" />
          </td>
          <td className="px-5 py-3">
            <Skeleton variant="text" className="h-4 w-32" />
          </td>
          <td className="px-5 py-3">
            <Skeleton className="w-16 h-6 rounded" />
          </td>
          <td className="px-5 py-3">
            <div className="space-y-1">
              <Skeleton variant="text" className="h-3 w-12" />
              <Skeleton variant="text" className="h-2 w-8" />
            </div>
          </td>
          <td className="px-5 py-3 text-right">
            <div className="flex gap-2 justify-end">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="w-6 h-6 rounded-full" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// Pre-configured event table rows skeleton
export function EventTableSkeleton({ count = 5 }: { count?: number }) {
  const { isLightMode } = useTheme();

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          {/* Thumbnail */}
          <td className="px-4 py-3">
            <Skeleton className="w-20 h-11 rounded-2xl" />
          </td>
          {/* Plate */}
          <td className="px-4 py-3">
            <Skeleton className="w-16 h-6 rounded-lg" />
          </td>
          {/* Confidence */}
          <td className="px-4 py-3">
            <Skeleton className="w-12 h-5 rounded-full" />
          </td>
          {/* Vehicle */}
          <td className="px-4 py-3">
            <div className="space-y-1">
              <Skeleton variant="text" className="h-3.5 w-24" />
              <Skeleton variant="text" className="h-2.5 w-12" />
            </div>
          </td>
          {/* Identity */}
          <td className="px-4 py-3">
            <Skeleton variant="text" className="h-4.5 w-20" />
          </td>
          {/* Direction */}
          <td className="px-4 py-3">
            <Skeleton variant="circular" className="w-4.5 h-4.5" />
          </td>
          {/* Source */}
          <td className="px-4 py-3">
            <div className="space-y-1">
              <Skeleton variant="text" className="h-3 w-16" />
              <Skeleton variant="text" className="h-2 w-20" />
            </div>
          </td>
          {/* Logged At */}
          <td className="px-4 py-3">
            <div className="space-y-1">
              <Skeleton variant="text" className="h-3.5 w-12" />
              <Skeleton variant="text" className="h-2.5 w-16" />
            </div>
          </td>
          {/* Delete */}
          <td className="px-4 py-3 text-right">
            <Skeleton variant="circular" className="w-8 h-8 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}
