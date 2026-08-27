export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-ink/70">Coming in a future session.</p>
    </div>
  )
}
