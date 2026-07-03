export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-display text-primary">404</h1>
        <p className="text-muted-foreground text-lg">Page not found.</p>
      </div>
    </div>
  );
}