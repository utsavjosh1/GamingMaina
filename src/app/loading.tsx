export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-obsidian" role="status" aria-label="Loading">
      <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
