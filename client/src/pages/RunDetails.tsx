import { useRun } from "@/hooks/use-runs";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { LogConsole } from "@/components/LogConsole";
import { AssetCard } from "@/components/AssetCard";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Clock, Calendar, AlertTriangle, Layers, Terminal, Box } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function RunDetails() {
  const [match, params] = useRoute("/runs/:id");
  const id = params?.id || "";
  const { data: run, isLoading, error } = useRun(id);

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8 mt-8">
          <div className="h-8 bg-white/5 w-1/3 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-64 bg-white/5 rounded col-span-2" />
            <div className="h-64 bg-white/5 rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !run) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mb-4 opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Run Not Found</h1>
          <p className="text-muted-foreground mb-6">The pipeline run you are looking for does not exist or has been deleted.</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header Breadcrumbs & Status */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Runs
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-display font-bold">Pipeline Run</h1>
              <span className="font-mono text-sm text-muted-foreground bg-white/5 px-2 py-1 rounded">#{run.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary/70" />
                Started: {run.startedAt ? format(new Date(run.startedAt), "PPP p") : "Pending"}
              </span>
              {run.completedAt && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary/70" />
                  Duration: {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt!).getTime()) / 1000)}s
                </span>
              )}
            </div>
          </div>
          
          <StatusBadge status={run.status} className="text-base px-4 py-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Live Execution Logs</h2>
          </div>
          <LogConsole logs={run.logs || []} className="h-[600px] border-white/10 shadow-2xl shadow-black/50" />
        </div>

        {/* Sidebar: Details & Assets */}
        <div className="space-y-8">
          {/* Info Card */}
          <div className="p-6 rounded-xl bg-card/30 border border-white/5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Run Information
            </h3>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{run.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Assets Created</span>
                <span className="font-medium text-primary">{run.assets?.length || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-muted-foreground">Log Entries</span>
                <span className="font-medium">{run.logs?.length || 0}</span>
              </div>
            </div>

            {run.error && (
              <div className="mt-6 p-4 rounded bg-red-500/10 border border-red-500/20 text-sm">
                <div className="font-bold text-red-400 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Execution Failed
                </div>
                <div className="text-red-300/80">{run.error}</div>
              </div>
            )}
          </div>

          {/* Generated Assets */}
          <div>
             <div className="flex items-center gap-2 mb-4">
              <Box className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-semibold">Generated Assets</h2>
            </div>
            
            <div className="space-y-3">
              {run.assets && run.assets.length > 0 ? (
                run.assets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))
              ) : (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                  <Box className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No assets generated yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
