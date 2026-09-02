import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import About from './pages/About'
import BlogDetail from './pages/BlogDetail'
import BlogList from './pages/BlogList'
import Home from './pages/Home'
import ImageToWebpConverter from './pages/ImageToWebpConverter'
import Login from './pages/Login'
import BlogDashboard from './pages/my/BlogDashboard'
import BlogForm from './pages/my/BlogForm'
import NoteForm from './pages/my/NoteForm'
import NotesDashboard from './pages/my/NotesDashboard'
import NoteDetail from './pages/NoteDetail'
import NotesList from './pages/NotesList'
import ToolsLanding from './pages/ToolsLanding'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="notes" element={<NotesList />} />
        <Route path="notes/:id" element={<NoteDetail />} />
        <Route path="blog" element={<BlogList />} />
        <Route path="blog/:slug" element={<BlogDetail />} />
        <Route path="tools" element={<ToolsLanding />} />
        <Route path="tools/image-to-webp" element={<ImageToWebpConverter />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="my/notes" element={<NotesDashboard />} />
          <Route path="my/notes/new" element={<NoteForm />} />
          <Route path="my/notes/:id/edit" element={<NoteForm />} />
          <Route path="my/blog" element={<BlogDashboard />} />
          <Route path="my/blog/new" element={<BlogForm />} />
          <Route path="my/blog/:slug/edit" element={<BlogForm />} />
        </Route>
      </Route>
    </Routes>
  )
}
