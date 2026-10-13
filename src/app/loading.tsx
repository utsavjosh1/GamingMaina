export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="size-9 animate-spin rounded-full border-2 border-ember border-t-transparent" />
    </div>
  );
}
