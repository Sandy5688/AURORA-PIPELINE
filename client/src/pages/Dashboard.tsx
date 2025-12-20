import { useRuns, useTriggerRun } from "@/hooks/use-runs";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { format } from "date-fns";
import { Play, ArrowRight, Activity, Calendar, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { data: runs, isLoading, error } = useRuns();
  const triggerMutation = useTriggerRun();

  const handleTrigger = () => {
    triggerMutation.mutate();
  };

  return (
    <Layout>
      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Pipeline Control
          </h1>
          <p className="text-muted-foreground max-w-lg text-lg">
            Monitor automated content generation workflows and orchestrate new deployment cycles.
          </p>
        </div>

        <Button 
          size="lg" 
          onClick={handleTrigger}
          disabled={triggerMutation.isPending}
          className="relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-300 group px-8"
        >
          {triggerMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Initializing...
            </span>
          ) : (
            <span className="flex items-center gap-2 font-bold tracking-wide">
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              TRIGGER NEW RUN
            </span>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatsCard 
          label="Total Runs" 
          value={runs?.length || 0} 
          icon={<Activity className="text-blue-400" />}
          trend="+12% this week"
        />
        <StatsCard 
          label="Success Rate" 
          value={`${runs ? Math.round((runs.filter(r => r.status === 'completed').length / runs.length) * 100) : 0}%`} 
          icon={<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />}
          trend="Stable"
        />
        <StatsCard 
          label="Active Processes" 
          value={runs?.filter(r => r.status === 'running').length || 0} 
          icon={<div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(6,182,212,1)]" />}
          trend="Currently processing"
        />
      </div>

      {/* Recent Runs List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl flex items-center gap-2">
            <span className="w-1.5 h-6 bg-primary rounded-full" />
            Recent Executions
          </h2>
          {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span>}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 animate-pulse rounded-xl border border-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 border border-destructive/20 bg-destructive/5 rounded-xl text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-bold text-destructive mb-2">Failed to load runs</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        ) : runs?.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5 border-dashed">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No runs executed yet</h3>
            <p className="text-muted-foreground mb-6">Trigger your first pipeline run to see results here.</p>
            <Button variant="outline" onClick={handleTrigger}>Start First Run</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {runs?.map((run, index) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/runs/${run.id}`}>
                    <div className="group relative bg-card/40 backdrop-blur-sm border border-white/5 hover:border-primary/30 hover:bg-card/60 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 w-2 h-2 rounded-full ${run.status === 'running' ? 'bg-primary animate-pulse' : run.status === 'completed' ? 'bg-green-500' : run.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                          
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-mono text-xs text-muted-foreground opacity-50">#{run.id.slice(0, 8)}</span>
                              <StatusBadge status={run.status} />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {run.startedAt ? format(new Date(run.startedAt), "MMM d, HH:mm:ss") : "Queued"}
                              </span>
                              {run.completedAt && (
                                <span className="flex items-center gap-1.5 font-mono text-xs bg-white/5 px-2 py-0.5 rounded">
                                  {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt!).getTime()) / 1000)}s duration
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {run.error && (
                            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20 max-w-[200px] truncate">
                              Error: {run.error}
                            </div>
                          )}
                          <div className="p-2 rounded-full bg-white/5 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatsCard({ label, value, icon, trend }: { label: string; value: string | number; icon: React.ReactNode; trend: string }) {
  return (
    <Card className="bg-card/30 backdrop-blur border-white/5 p-6 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
        <div className="p-2 bg-white/5 rounded-lg border border-white/5">{icon}</div>
      </div>
      <div className="text-3xl font-bold font-display mb-1">{value}</div>
      <div className="text-xs text-muted-foreground opacity-70 font-mono">{trend}</div>
    </Card>
  );
}
