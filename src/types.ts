export interface Post {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author: string;
  password?: string;
  category: string;
  views: number;
  likes: number;
}

export interface Comment {
  id: string;
  created_at: string;
  post_id: string;
  author: string;
  content: string;
  password?: string;
}

export interface StatusResponse {
  status: string;
  usingSupabase: boolean;
  supabaseUrl: string | null;
}

export type Category = "전체" | "자유" | "질문" | "정보" | "공지";
export type SortOption = "latest" | "views" | "likes";
