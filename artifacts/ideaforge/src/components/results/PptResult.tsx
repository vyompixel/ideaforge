import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PptResultProps {
  result: any;
}

interface Slide {
  id?: string;
  title: string;
  content: string[];
  notes?: string;
  layout?: string;
}

export function PptResult({ result }: PptResultProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const title = result?.title || 'Presentation';
  const slides: Slide[] = result?.slides || [];

  const handleDownload = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(s => s + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(s => s - 1);
    }
  };

  if (slides.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-muted-foreground">
        No slides found in this presentation.
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex justify-between items-center">
        <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider font-mono">Slide Deck Viewer</h3>
        <Button onClick={handleDownload} size="sm" variant="outline" className="font-bold bg-transparent text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white">
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
        <div className="w-full max-w-4xl aspect-[16/9] relative group">
          <Card className="w-full h-full bg-white text-slate-900 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform rounded-xl border-none">
            <CardContent className="flex-1 p-10 md:p-16 flex flex-col">
              {currentSlide.layout === 'title' || currentSlideIndex === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <h2 className="text-4xl md:text-6xl font-display font-extrabold text-slate-900 tracking-tight">{currentSlide.title}</h2>
                  {currentSlide.content && currentSlide.content.length > 0 && (
                    <div className="text-xl md:text-2xl text-slate-600 font-medium">
                      {currentSlide.content[0]}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-8 border-b-2 border-primary/20 pb-4 inline-block self-start">
                    {currentSlide.title}
                  </h2>
                  <div className="flex-1 flex flex-col justify-center">
                    <ul className="space-y-6 text-lg md:text-xl text-slate-700">
                      {Array.isArray(currentSlide.content) ? currentSlide.content.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-4 text-primary font-bold mt-1 text-2xl leading-none">•</span>
                          <span className="leading-snug">{item}</span>
                        </li>
                      )) : (
                        <p>{currentSlide.content}</p>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Navigation overlays */}
          <button 
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity backdrop-blur-sm hover:bg-black/60"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button 
            onClick={nextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity backdrop-blur-sm hover:bg-black/60"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {/* Presenter Notes */}
        {currentSlide.notes && (
          <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-w-4xl w-full text-slate-300 text-sm">
            <span className="font-bold text-slate-400 font-mono uppercase tracking-widest text-xs block mb-2">Speaker Notes</span>
            <p className="italic">{currentSlide.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 font-mono text-sm text-slate-400">
          Slide {currentSlideIndex + 1} <span className="text-slate-600">/</span> {slides.length}
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={prevSlide} disabled={currentSlideIndex === 0} className="text-slate-300 hover:text-white hover:bg-slate-800">
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button variant="ghost" size="sm" onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1} className="text-slate-300 hover:text-white hover:bg-slate-800">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
