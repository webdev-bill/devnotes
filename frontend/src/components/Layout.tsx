import { Outlet } from 'react-router'
import Nav from './Nav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <Nav />
        <main className="rounded-b-lg rounded-tr-lg border border-rule bg-white p-6 shadow-sm sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
