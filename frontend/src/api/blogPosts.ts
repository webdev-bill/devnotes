import { apiRequest } from './client'
import type { BlogPost, BlogPostPayload, Paginated } from './types'

export function listPublicPosts(): Promise<Paginated<BlogPost>> {
  return apiRequest('/blog-posts')
}

export function getPublicPost(slug: string): Promise<BlogPost> {
  return apiRequest(`/blog-posts/${slug}`)
}

export function listMyPosts(): Promise<Paginated<BlogPost>> {
  return apiRequest('/my/blog-posts', { auth: true })
}

export function getMyPost(slug: string): Promise<BlogPost> {
  return apiRequest(`/my/blog-posts/${slug}`, { auth: true })
}

export function createPost(payload: BlogPostPayload): Promise<BlogPost> {
  return apiRequest('/my/blog-posts', { method: 'POST', auth: true, body: payload })
}

export function updatePost(slug: string, payload: BlogPostPayload): Promise<BlogPost> {
  return apiRequest(`/my/blog-posts/${slug}`, { method: 'PUT', auth: true, body: payload })
}

export function deletePost(slug: string): Promise<void> {
  return apiRequest(`/my/blog-posts/${slug}`, { method: 'DELETE', auth: true })
}
