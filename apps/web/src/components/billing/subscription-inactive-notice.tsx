export function SubscriptionInactiveNotice() {
  return (
    <div className="p-8 max-w-lg mx-auto flex items-center justify-center h-full">
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground mb-2">Subscription inactive</h1>
        <p className="text-sm text-muted-foreground">
          This gym&apos;s subscription is currently inactive. Please contact your gym owner to
          resolve billing before continuing.
        </p>
      </div>
    </div>
  );
}
