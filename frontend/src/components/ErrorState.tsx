export default function ErrorState({ message }: { message: string }) {
  return <p className="py-8 text-center text-red-600">{message}</p>
}
