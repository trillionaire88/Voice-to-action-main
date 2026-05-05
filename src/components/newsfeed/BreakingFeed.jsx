import BaseFeedList from "./BaseFeedList";

export default function BreakingFeed() {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
        <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
        LIVE
      </div>
      <BaseFeedList feedType="breaking" staleTime={60000} sectionTitle="Platform Breaking + External News" />
    </div>
  );
}
