import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useRuns() {
  return useQuery({
    queryKey: [api.runs.list.path],
    queryFn: async () => {
      const res = await fetch(api.runs.list.path);
      if (!res.ok) throw new Error("Failed to fetch runs");
      return api.runs.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s for updates
  });
}

export function useRun(id: string) {
  return useQuery({
    queryKey: [api.runs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.runs.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch run details");
      }
      return api.runs.get.responses[200].parse(await res.json());
    },
    refetchInterval: (query) => {
      // Poll faster if running, stop if complete/failed
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? 2000 : false;
    },
  });
}

export function useTriggerRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.runs.trigger.path, {
        method: api.runs.trigger.method,
      });
      if (!res.ok) throw new Error("Failed to trigger pipeline");
      return api.runs.trigger.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.runs.list.path] });
      toast({
        title: "Pipeline Initiated",
        description: `Run ID: ${data.runId.slice(0, 8)}... started successfully.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Trigger Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
