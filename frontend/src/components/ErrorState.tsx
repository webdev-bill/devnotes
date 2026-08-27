export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-flag/30 bg-flag/5 px-4 py-3">
      <p className="font-display text-xs font-semibold tracking-wide text-flag uppercase">
        Error
      </p>
      {/* The message itself stays in the plain, high-contrast body voice —
          the compiler-annotation styling is for the frame, not the content
          the reader actually needs to act on. */}
      <p className="mt-1 font-body text-sm text-ink">{message}</p>
    </div>
  )
}
