import { Asset } from "@shared/schema";
import { FileText, Music, Video, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const getIcon = () => {
    switch (asset.type) {
      case "text": return <FileText className="w-8 h-8 text-blue-400" />;
      case "audio": return <Music className="w-8 h-8 text-purple-400" />;
      case "video": return <Video className="w-8 h-8 text-red-400" />;
      default: return <FileText className="w-8 h-8 text-gray-400" />;
    }
  };

  const getGradient = () => {
    switch (asset.type) {
      case "text": return "from-blue-500/10 to-transparent border-blue-500/20";
      case "audio": return "from-purple-500/10 to-transparent border-purple-500/20";
      case "video": return "from-red-500/10 to-transparent border-red-500/20";
      default: return "from-gray-500/10 to-transparent border-gray-500/20";
    }
  };

  return (
    <div className={cn(
      "relative group overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-lg hover:border-white/20",
      getGradient()
    )}>
      <div className="flex items-start justify-between">
        <div className="p-3 bg-background/50 rounded-lg border border-white/5 shadow-inner">
          {getIcon()}
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           {/* Actions would go here */}
           <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground">
             <Download className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
            {asset.type}
          </span>
          <span className={cn(
            "text-xs font-mono px-2 py-0.5 rounded-full border",
            asset.status === "generated" ? "border-green-500/30 text-green-400 bg-green-500/10" : 
            asset.status === "failed" ? "border-red-500/30 text-red-400 bg-red-500/10" :
            "border-white/10 text-muted-foreground"
          )}>
            {asset.status}
          </span>
        </div>
        <h3 className="font-medium text-foreground truncate" title={asset.path || "Untitled Asset"}>
          {asset.path ? asset.path.split('/').pop() : `Generated ${asset.type}`}
        </h3>
        
        {asset.metadata && (
          <div className="mt-2 text-xs text-muted-foreground font-mono truncate">
            {JSON.stringify(asset.metadata)}
          </div>
        )}
      </div>

      {/* Decorative background glow */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-tl from-white/5 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-white/10 transition-all duration-500" />
    </div>
  );
}
