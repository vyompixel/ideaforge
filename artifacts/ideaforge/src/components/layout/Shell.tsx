import { Link, useLocation } from "wouter";
import { Sparkles, Clock } from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-primary">
            <Sparkles className="w-6 h-6 text-primary fill-primary/20" />
            IdeaForge
          </Link>
          <nav className="flex items-center gap-6 text-sm font-bold uppercase tracking-wider">
            <Link 
              href="/" 
              className={`transition-colors hover:text-primary ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Generate
            </Link>
            <Link 
              href="/history" 
              className={`transition-colors hover:text-primary flex items-center gap-1.5 ${location.startsWith('/history') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Clock className="w-4 h-4" />
              History
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
