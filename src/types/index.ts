export interface Comic {
  id: string
  title: string
  description: string | null
  cover_image_url: string | null
  banner_image_url: string | null
  genre: string[] | null
  author_id: string
  created_at: string
  updated_at: string
  status: string | null
  episodes?: { episode_number: number }[] 
}