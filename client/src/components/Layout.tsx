import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Activity, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-primary/20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-wider font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              AURORA<span className="text-primary">.PIPE</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <NavLink href="/" active={location === "/"} icon={<Activity className="w-4 h-4" />}>
              Dashboard
            </NavLink>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Cpu className="w-3 h-3" />
              <span>SYSTEM ONLINE</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground font-mono">
          AURORA PIPELINE ORCHESTRATOR v1.0.4 • SYSTEM STATUS: NORMAL
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, active, children, icon }: { href: string; active: boolean; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link href={href} className={cn(
      "flex items-center gap-2 text-sm font-medium transition-all duration-200 px-3 py-1.5 rounded-md",
      active 
        ? "text-primary bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
    )}>
      {icon}
      {children}
    </Link>
  );
}
