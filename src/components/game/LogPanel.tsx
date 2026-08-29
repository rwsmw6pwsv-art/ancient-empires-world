export function LogPanel({ lines }: { lines: string[] }) {
  const tail = lines.slice(-4);
  return (
    <div className="panel px-4 py-2 text-xs leading-relaxed text-muted">
      {tail.length === 0 ? <p>The chronicle is still.</p> : <p>{tail.join(" · ")}</p>}
    </div>
  );
}
