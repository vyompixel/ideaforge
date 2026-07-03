import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useListGenerations, useGetGenerationStats, useDeleteGeneration, getListGenerationsQueryKey, getGetGenerationStatsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Presentation, BarChart3, Globe, Trash2, Calendar, LayoutGrid, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

export function History() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetGenerationStats();
  const { data: generations, isLoading: gensLoading } = useListGenerations();
  const deleteGeneration = useDeleteGeneration();

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingId(id);
    deleteGeneration.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGenerationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGenerationStatsQueryKey() });
        setDeletingId(null);
      },
      onError: () => {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight mb-2">History</h1>
          <p className="text-muted-foreground text-lg">Your past forged ideas and deliverables.</p>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-primary/5 border-primary/20 col-span-2 md:col-span-1">
              <CardContent className="p-4 flex flex-col justify-center items-center h-full text-center">
                <span className="text-3xl font-display font-bold text-primary">{stats.total}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Total Forged</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-lg"><FileText className="w-5 h-5 text-secondary-foreground" /></div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.byType.doc}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Docs</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-lg"><Presentation className="w-5 h-5 text-secondary-foreground" /></div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.byType.ppt}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Decks</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-lg"><BarChart3 className="w-5 h-5 text-secondary-foreground" /></div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.byType.charts}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Charts</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-lg"><Globe className="w-5 h-5 text-secondary-foreground" /></div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.byType.webapp}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apps</div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-primary" />
            Recent Deliverables
          </h2>

          {gensLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : generations && generations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generations.map(gen => {
                const Icon = TYPE_ICONS[gen.outputType] || FileText;
                const isError = gen.status === 'error';
                const isPending = ['pending', 'planning', 'generating'].includes(gen.status);

                return (
                  <Card 
                    key={gen.id} 
                    className={`flex flex-col group cursor-pointer hover:shadow-md transition-all border-2 border-transparent hover:border-primary/20 ${isError ? 'opacity-75' : ''}`}
                    onClick={() => setLocation(`/generations/${gen.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={isError ? "destructive" : isPending ? "secondary" : "default"} className="font-mono text-xs">
                          {isError ? 'Failed' : isPending ? 'Generating...' : TYPE_LABELS[gen.outputType]}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, gen.id)}
                          disabled={deletingId === gen.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardTitle className="line-clamp-2 leading-tight text-lg">
                        {gen.title || 'Untitled Idea'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {gen.idea}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-2 border-t flex justify-between items-center bg-muted/20">
                      <div className="flex items-center text-xs text-muted-foreground font-mono">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDistanceToNow(new Date(gen.createdAt), { addSuffix: true })}
                      </div>
                      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border-2 border-dashed">
              <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">No generations yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                You haven't forged any ideas into deliverables yet. Time to get started!
              </p>
              <Button onClick={() => setLocation('/')} className="font-bold">
                Forge an Idea <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
