import { QueryViewShell } from "@/components/dashboard/query-view-shell";

export default function AnalysisPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Analysis</h1>
      </div>
      <QueryViewShell />
    </div>
  );
}
