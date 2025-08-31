// React import not needed in modern React with new JSX transform

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'button' | 'avatar' | 'full';
  className?: string;
  count?: number;
}

export function LoadingSkeleton({ variant = 'text', className = '', count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const getSkeletonClass = () => {
    switch (variant) {
      case 'card':
        return 'h-32 rounded-xl';
      case 'button':
        return 'h-12 w-32 rounded-lg';
      case 'avatar':
        return 'h-16 w-16 rounded-full';
      case 'full':
        return 'h-64 rounded-xl';
      case 'text':
      default:
        return 'h-4 rounded';
    }
  };

  return (
    <>
      {items.map((index) => (
        <div
          key={index}
          className={`shimmer ${getSkeletonClass()} ${className}`}
        />
      ))}
    </>
  );
}

export function ScenarioCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <LoadingSkeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="w-3/4" />
          <LoadingSkeleton className="w-1/2" />
        </div>
      </div>
      <LoadingSkeleton count={2} className="w-full mb-2" />
      <div className="flex gap-2">
        <LoadingSkeleton variant="button" className="w-20" />
        <LoadingSkeleton variant="button" className="w-20" />
      </div>
    </div>
  );
}

export function ConversationLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-8">
        <div className="relative w-80 h-80 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full animate-pulse opacity-50" />
          <div className="absolute inset-4 bg-gradient-to-br from-purple-300 to-blue-300 rounded-full animate-pulse opacity-50" />
          <div className="absolute inset-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full animate-pulse" />
        </div>
        <div className="space-y-4">
          <LoadingSkeleton className="w-64 h-6 mx-auto" />
          <LoadingSkeleton className="w-48 h-4 mx-auto" />
        </div>
        <p className="text-gray-600 animate-pulse">Loading scenario...</p>
      </div>
    </div>
  );
}