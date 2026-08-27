import { useRef, type TextareaHTMLAttributes } from 'react'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  value: string
}

/**
 * A textarea with a live line-number gutter, like an editor pane. The
 * gutter is a plain div kept in sync on scroll — not a real editor
 * widget, just enough to feel like one for markdown note content.
 */
export default function LineNumberedTextarea({ value, onScroll, ...props }: Props) {
  const gutterRef = useRef<HTMLDivElement>(null)
  const lineCount = value === '' ? 1 : value.split('\n').length

  function handleScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = event.currentTarget.scrollTop
    }
    onScroll?.(event)
  }

  return (
    <div className="flex overflow-hidden rounded-md border border-rule bg-white font-display text-sm">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none overflow-hidden bg-paper px-3 py-2 text-right text-ink/30"
        style={{ lineHeight: '1.6' }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        value={value}
        onScroll={handleScroll}
        style={{ lineHeight: '1.6' }}
        className="flex-1 resize-none px-3 py-2 text-ink outline-none"
        {...props}
      />
    </div>
  )
}
