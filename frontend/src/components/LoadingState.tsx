export default function LoadingState() {
  return (
    <p className="py-12 text-center font-display text-sm text-ink/45">
      loading
      <span aria-hidden="true" className="motion-safe:animate-pulse">
        _
      </span>
    </p>
  )
}
