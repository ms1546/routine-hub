export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="space-y-6 rounded-3xl border border-border/50 bg-card/40 p-10 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Maintenance</p>
        <h1 className="text-3xl font-semibold">Routine Hub is getting a tune-up</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">Please retry in a few minutes. Your calendar data remains safe.</p>
      </div>
    </div>
  );
}
