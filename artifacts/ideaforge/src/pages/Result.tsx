import React from 'react';
import { useLocation, useParams } from 'wouter';
import { useGetGeneration, getGetGenerationQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Presentation, BarChart3, Globe, Clock, ArrowLeft, Download, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { DocResult } from '@/components/results/DocResult';
import { PptResult } from '@/components/results/PptResult';
import { ChartsResult } from '@/components/results/ChartsResult';
import { WebAppResult } from '@/components/results/WebAppResult';

const TYPE_ICONS = {
  doc: FileText,
  ppt: Presentation,
  charts: BarChart3,
  webapp: Globe
};

const TYPE_LABELS = {
  doc: 'Document',
  ppt: 'Presentation',
  charts: 'Charts',
  webapp: 'Web App'
};

export function Result() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = parseInt(params.id || '0', 10);
  
  const { data: gen, isLoading, isError } = useGetGeneration(id, { 
    query: { 
      queryKey: getGetGenerationQueryKey(id),
      enabled: !!id,
      refetchInterval: (query) => {
        const data = query.state.data as any;
        if (data && ['pending', 'planning', 'generating'].includes(data.status)) {
          return 2000;
        }
        return false;
      }
    } 
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !gen) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl text-center space-y-6">
        <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-display font-bold">Could not load result</h1>
        <p className="text-muted-foreground text-lg">The generation you're looking for doesn't exist or there was an error.</p>
        <Button onClick={() => setLocation('/history')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
        </Button>
      </div>
    );
  }

  const Icon = TYPE_ICONS[gen.outputType] || FileText;
  const isPending = ['pending', 'planning', 'generating'].includes(gen.status);
  const hasFailed = gen.status === 'error';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex flex-col h-full min-h-[calc(100vh-64px)]">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" onClick={() => setLocation('/history')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {formatDistanceToNow(new Date(gen.createdAt), { addSuffix: true })}
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={hasFailed ? "destructive" : isPending ? "secondary" : "default"} className="font-mono px-3 py-1 text-sm flex items-center gap-1.5 shadow-sm">
            <Icon className="w-4 h-4" />
            {hasFailed ? 'Failed' : isPending ? 'Generating...' : TYPE_LABELS[gen.outputType]}
          </Badge>
          {isPending && (
            <span className="text-sm font-bold text-primary animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
              Working on it...
            </span>
          )}
        </div>
        
        <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight leading-tight">
          {gen.title || 'Untitled Idea'}
        </h1>
        
        <div className="bg-muted/50 border rounded-lg p-4 max-w-3xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Original Idea</h3>
          <p className="text-sm text-foreground/80 leading-relaxed font-sans">{gen.idea}</p>
        </div>
        
        {hasFailed && gen.errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-start gap-3 max-w-3xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Generation Failed</h4>
              <p className="text-sm mt-1 opacity-90">{gen.errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 w-full bg-card border shadow-sm rounded-xl overflow-hidden relative flex flex-col">
        {!isPending && !hasFailed && gen.result ? (
          <>
            {gen.outputType === 'doc' && <DocResult result={gen.result} />}
            {gen.outputType === 'ppt' && <PptResult result={gen.result} />}
            {gen.outputType === 'charts' && <ChartsResult result={gen.result} />}
            {gen.outputType === 'webapp' && <WebAppResult generation={gen} />}
          </>
        ) : isPending ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
             <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <Icon className="w-16 h-16 text-primary relative animate-bounce" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Forging in progress...</h2>
            <p className="text-muted-foreground max-w-md">Your AI agent is actively building this deliverable. This page will update automatically once it's done.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
