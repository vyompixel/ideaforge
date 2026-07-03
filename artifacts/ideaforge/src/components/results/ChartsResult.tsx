import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ChartsResultProps {
  result: any;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ChartsResult({ result }: ChartsResultProps) {
  const title = result?.title || 'Data Visualization';
  const charts = result?.charts || [];

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

  const renderChart = (chart: any, index: number) => {
    const { name, type, config } = chart;
    const { labels = [], datasets = [] } = config || {};

    if (!datasets || datasets.length === 0) return null;

    // Reformat data for Recharts: [{ name: label1, dataset1Label: val1, dataset2Label: val2 }]
    const formattedData = labels.map((label: string, i: number) => {
      const point: any = { name: label };
      datasets.forEach((ds: any) => {
        point[ds.label] = ds.data[i];
      });
      return point;
    });

    switch (type?.toLowerCase()) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {datasets.map((ds: any, i: number) => (
                <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {datasets.map((ds: any, i: number) => (
                <Line key={ds.label} type="monotone" dataKey={ds.label} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'doughnut':
        // Pie usually uses the first dataset
        const pieData = labels.map((label: string, i: number) => ({
          name: label,
          value: datasets[0]?.data[i] || 0
        }));
        const innerRadius = type.toLowerCase() === 'doughnut' ? 60 : 0;

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={100}
                paddingAngle={type.toLowerCase() === 'doughnut' ? 5 : 0}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="p-8 text-center text-muted-foreground">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="bg-muted/30 border-b px-4 py-3 flex justify-between items-center">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider font-mono">Data Visualizer</h3>
        <Button onClick={handleDownload} size="sm" variant="outline" className="font-bold">
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {charts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No charts data generated.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {charts.map((chart: any, i: number) => (
              <Card key={i} className={`shadow-sm border-2 ${charts.length === 1 ? 'xl:col-span-2 max-w-4xl mx-auto w-full' : ''}`}>
                <CardHeader className="pb-2 border-b bg-muted/10">
                  <CardTitle className="text-xl font-display">{chart.name || `Chart ${i + 1}`}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {renderChart(chart, i)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
