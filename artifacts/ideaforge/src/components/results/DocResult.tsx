import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface DocResultProps {
  result: any;
}

export function DocResult({ result }: DocResultProps) {
  const content = result?.content || '';
  const title = result?.title || 'Document';

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/30 border-b px-4 py-3 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider font-mono">Document Viewer</h3>
        <Button onClick={handleDownload} size="sm" variant="outline" className="font-bold">
          <Download className="w-4 h-4 mr-2" />
          Download .md
        </Button>
      </div>
      <div className="p-8 md:p-12 lg:p-16 overflow-y-auto bg-background/50">
        <div className="prose prose-slate dark:prose-invert prose-headings:font-display prose-headings:tracking-tight max-w-3xl mx-auto prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <div className="text-center text-muted-foreground italic py-10">No document content found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
