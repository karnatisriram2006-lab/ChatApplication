export default function Loading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-secondary animate-pulse shadow-primary-glow" />
        <div className="w-24 h-1.5 rounded-full skeleton" />
      </div>
    </div>
  );
}
