export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">Coming in a future session.</p>
    </div>
  )
}
