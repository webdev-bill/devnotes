import remarkDirective from 'remark-directive'
import type { Components } from 'react-markdown'
import MarkdownImage from '../components/MarkdownImage'
import VideoEmbed from '../components/VideoEmbed'
import remarkVideoDirective from './remarkVideoDirective'

// Shared react-markdown setup for NoteDetail and BlogDetail — both render
// user-authored markdown for arbitrary visitors, so both must go through
// the exact same plugin/component pipeline rather than risk drifting apart.
export const markdownRemarkPlugins = [remarkDirective, remarkVideoDirective]

export const markdownComponents: Components = {
  img: MarkdownImage,
  video: VideoEmbed,
}
