import { createClient } from "@supabase/supabase-js";
import { Post, Comment, Category, SortOption } from "./types";

// Helper to normalize Supabase URL in case the user pasted the dashboard project URL
export function normalizeSupabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("supabase.com/dashboard/project/")) {
    const parts = url.split("supabase.com/dashboard/project/");
    if (parts.length > 1) {
      const ref = parts[1].split("/")[0].trim();
      if (ref) {
        return `https://${ref}.supabase.co`;
      }
    }
  }
  return url.trim();
}

// Check configuration
export interface DbConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  isConfigured: boolean;
  source: "env" | "override" | "none";
}

// =========================================================================
// 💡 GitHub Pages 등 정적 배포용 하드코딩 설정영역 (옵션)
// 빌드 환경 변수(env) 지정이 어렵다면 아래 두 칸에 Supabase 정보를 직접 입력하세요.
// 자동으로 감지되어 방문자 누구든 입력창 없이 즉시 Supabase 클라우드로 시작됩니다.
// =========================================================================
const HARDCODED_SUPABASE_URL = "https://agwcumknhangcyhusfsn.supabase.co"; 
const HARDCODED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd2N1bWtuaGFuZ2N5aHVzZnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzA4MDMsImV4cCI6MjA5NjE0NjgwM30.BD84awWmc6sd4-RdJ7UkvtRYxGAUOJ3svv505MstyRU"; 

export function getDbConfig(): DbConfig {
  // 1. Check local storage overrides (allows runtime configuration in client)
  const lUrl = localStorage.getItem("VITE_SUPABASE_URL_OVERRIDE")?.trim() || null;
  const lKey = localStorage.getItem("VITE_SUPABASE_ANON_KEY_OVERRIDE")?.trim() || null;
  
  if (lUrl && lKey) {
    return {
      supabaseUrl: normalizeSupabaseUrl(lUrl) || null,
      supabaseAnonKey: lKey,
      isConfigured: true,
      source: "override"
    };
  }

  // 2. Check Vite build-time environment variables
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL?.trim() || null;
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY?.trim() || null;

  const isEnvConfigured = !!(
    envUrl && 
    envUrl !== "https://your-project.supabase.co" && 
    envKey && 
    envKey !== "your-anon-key"
  );

  if (isEnvConfigured) {
    return {
      supabaseUrl: normalizeSupabaseUrl(envUrl) || null,
      supabaseAnonKey: envKey,
      isConfigured: true,
      source: "env"
    };
  }

  // 3. Check hardcoded fallback credentials
  const isHardcodedConfigured = !!(
    HARDCODED_SUPABASE_URL &&
    HARDCODED_SUPABASE_URL !== "https://your-project.supabase.co" &&
    HARDCODED_SUPABASE_ANON_KEY &&
    HARDCODED_SUPABASE_ANON_KEY !== "your-anon-key"
  );

  if (isHardcodedConfigured) {
    return {
      supabaseUrl: normalizeSupabaseUrl(HARDCODED_SUPABASE_URL) || null,
      supabaseAnonKey: HARDCODED_SUPABASE_ANON_KEY,
      isConfigured: true,
      source: "env"
    };
  }

  return {
    supabaseUrl: null,
    supabaseAnonKey: null,
    isConfigured: false,
    source: "none"
  };
}

// Lazy-construct Supabase Client
let cachedClient: any = null;
let lastUrl: string | null = null;
let lastKey: string | null = null;

export function getSupabaseClient() {
  const config = getDbConfig();
  if (!config.isConfigured || !config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  // Re-initialize client if config changed in localstorage
  if (cachedClient && lastUrl === config.supabaseUrl && lastKey === config.supabaseAnonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    lastUrl = config.supabaseUrl;
    lastKey = config.supabaseAnonKey;
    return cachedClient;
  } catch (err) {
    console.error("Failed to initialize client-side Supabase client:", err);
    return null;
  }
}

// ===== LOCAL BACKUP DATABASE FALLBACK (with LocalStorage) =====
const INITIAL_POSTS: Post[] = [
  {
    id: "post_1",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    title: "Supabase 연동 게시판에 오신 것을 환영합니다! 🎉",
    content: `안녕하세요! 이 애플리케이션은 Supabase 백엔드와 연동이 가능한 모던한 게시판입니다. 

### 🔧 Supabase 연결 방법 
실제 Supabase DB와 연동하여 데이터를 영구적으로 저장하려면 아래 단계를 수행해 주세요.

1. **Supabase 프로젝트 생성**: [Supabase 공식 웹사이트](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **테이블 생성**: Supabase SQL Editor를 열고 아래 SQL을 실행하여 테이블을 구성하세요.
\`\`\`sql
-- 1. 게시글 테이블 생성
create table posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  title text not null,
  content text not null,
  author text not null,
  password text,
  category text not null,
  views bigint default 0 not null,
  likes bigint default 0 not null
);

-- 2. 댓글 테이블 생성
create table comments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  post_id uuid references posts(id) on delete cascade not null,
  author text not null,
  content text not null,
  password text
);
\`\`\`
3. **환경 변수 추가**: AI Studio UI 측면의 'Secrets' 또는 프로젝트 루트의 \`.env\` 파일에 \`VITE_SUPABASE_URL\` 과 \`VITE_SUPABASE_ANON_KEY\`를 입력하세요. 또는 화면 상단의 데이터베이스 설정 패널에서 즉시 입력하여 연결할 수도 있습니다.

현재는 **로컬 스토리지 모드(LocalStorage)**로 안전하게 실행 중이며, 새로고침 하더라도 작성한 데이터가 웹브라우저에 보존됩니다.`,
    author: "관리자",
    password: "1234",
    category: "공지",
    views: 142,
    likes: 24,
  },
  {
    id: "post_2",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    title: "React 19와 Tailwind CSS v4를 이용한 모던 테일윈드 스타일링 팁",
    content: `Tailwind CSS v4가 드디어 릴리즈되었습니다! 이번 업데이트에서는 컴파일 속도가 비약적으로 상승하고, 새로운 테마 주입 프레임워크가 추가되었는데요.
Vite 설정에서 \`@tailwindcss/vite\` 플러그인을 임포트하여 매우 쾌적한 빌드 환경을 구축할 수 있습니다. 

게시판을 만들 때 몇 가지 주요 팁:
- **부드러운 화면 제어**: \`motion\` 라이브러리를 사용해 게시글 진출입 시 자연스러운 페이드 및 슬라이드 효과를 기입하세요.
- **가독성 높은 폰트**: Inter 폰트와 JetBrains Mono 폰트 조합으로 모던한 인터페이스를 완성해 보세요.`,
    author: "웹개발자",
    password: "1234",
    category: "정보",
    views: 45,
    likes: 8,
  },
  {
    id: "post_3",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    title: "Supabase 실시간 동기화와 웹소켓 성능 어떤가요?",
    content: "Supabase의 Realtime 기능을 검토 중인데, 동시 접속자 수 수천 명 수준에서도 웹소켓 메시지 동기화가 지연 없이 원활하게 돌 수 있는지 궁금합니다. 프로젝트에 실시간 채팅이나 알림을 구현해보신 분들의 후기가 있다면 공유 부탁드립니다!",
    author: "테크유저",
    password: "1234",
    category: "질문",
    views: 18,
    likes: 2,
  }
];

const INITIAL_COMMENTS: Comment[] = [
  {
    id: "comment_1",
    created_at: new Date(Date.now() - 3600000 * 23).toISOString(),
    post_id: "post_1",
    author: "테스터",
    content: "안내대로 실행해 보니 세팅이 정말 편하네요! 멋진 템플릿 감사합니다.",
    password: "1234",
  },
  {
    id: "comment_2",
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    post_id: "post_3",
    author: "Supabase조아",
    content: "일반적인 중소규모 트래픽 수준에서는 실시간 변경사항 구독이 정말 가볍고 빠르게 잘 됩니다. 적극 추천합니다!",
    password: "1234",
  }
];

function getLocalPosts(): Post[] {
  const data = localStorage.getItem("local_posts");
  if (!data) {
    localStorage.setItem("local_posts", JSON.stringify(INITIAL_POSTS));
    return INITIAL_POSTS;
  }
  return JSON.parse(data);
}

function saveLocalPosts(posts: Post[]) {
  localStorage.setItem("local_posts", JSON.stringify(posts));
}

function getLocalComments(): Comment[] {
  const data = localStorage.getItem("local_comments");
  if (!data) {
    localStorage.setItem("local_comments", JSON.stringify(INITIAL_COMMENTS));
    return INITIAL_COMMENTS;
  }
  return JSON.parse(data);
}

function saveLocalComments(comments: Comment[]) {
  localStorage.setItem("local_comments", JSON.stringify(comments));
}

const generateId = () => "local_" + Math.random().toString(36).substring(2, 11);

// ===== EXPORTED CORE API INTERFACE =====

export const dbService = {
  // Check Status
  checkStatus: async () => {
    const config = getDbConfig();
    return {
      status: "ok",
      usingSupabase: config.isConfigured,
      supabaseUrl: config.supabaseUrl,
      source: config.source
    };
  },

  // Save/Clear Custom Connection directly from UI Settings modal/bar
  saveOverrideConfig: (url: string, key: string) => {
    url = url.trim();
    key = key.trim();
    if (!url || !key) {
      localStorage.removeItem("VITE_SUPABASE_URL_OVERRIDE");
      localStorage.removeItem("VITE_SUPABASE_ANON_KEY_OVERRIDE");
    } else {
      localStorage.setItem("VITE_SUPABASE_URL_OVERRIDE", url);
      localStorage.setItem("VITE_SUPABASE_ANON_KEY_OVERRIDE", key);
    }
    cachedClient = null; // reset cache
  },

  clearOverrideConfig: () => {
    localStorage.removeItem("VITE_SUPABASE_URL_OVERRIDE");
    localStorage.removeItem("VITE_SUPABASE_ANON_KEY_OVERRIDE");
    cachedClient = null; // reset cache
  },

  // Read Posts
  getPosts: async (category: Category, search: string, sort: SortOption) => {
    const client = getSupabaseClient();
    
    if (client) {
      try {
        let query = client.from("posts").select("*");

        if (category && category !== "전체") {
          query = query.eq("category", category);
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,author.ilike.%${search}%`);
        }

        // Apply sorting
        if (sort === "views") {
          query = query.order("views", { ascending: false });
        } else if (sort === "likes") {
          query = query.order("likes", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        return { posts: data || [], usingSupabase: true };
      } catch (err: any) {
        console.error("Supabase client read error:", err);
        // Fallback to local on error to keep the app responsive
        throw new Error(`Supabase DB 불러오기 에러: ${err.message}`);
      }
    }

    // Local Storage Mock Mode
    let posts = getLocalPosts();
    
    if (category && category !== "전체") {
      posts = posts.filter((p) => p.category === category);
    }

    if (search) {
      const s = search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.content.toLowerCase().includes(s) ||
          p.author.toLowerCase().includes(s)
      );
    }

    if (sort === "views") {
      posts.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === "likes") {
      posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return { posts, usingSupabase: false };
  },

  // Get Detail + Increment Views
  getPostDetail: async (id: string): Promise<{ post: Post; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        // Fetch original
        const { data: post, error } = await client.from("posts").select("*").eq("id", id).single();
        if (error) throw error;
        if (!post) throw new Error("게시글이 존재하지 않습니다.");

        // Increment Views
        const newViews = (Number(post.views) || 0) + 1;
        const { data: updatedPost, error: updateError } = await client
          .from("posts")
          .update({ views: newViews })
          .eq("id", id)
          .select("*")
          .single();

        return { post: updatedPost || post, usingSupabase: true };
      } catch (err: any) {
        throw new Error(`Supabase 게시글 상세 에러: ${err.message}`);
      }
    }

    // Local LocalStorage
    const posts = getLocalPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("게시글이 존재하지 않습니다.");

    posts[idx].views = (posts[idx].views || 0) + 1;
    saveLocalPosts(posts);

    return { post: posts[idx], usingSupabase: false };
  },

  // Create Post
  createPost: async (postData: {
    title: string;
    content: string;
    author: string;
    password?: string;
    category: string;
  }): Promise<{ post: Post; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data, error } = await client
          .from("posts")
          .insert([{
            title: postData.title,
            content: postData.content,
            author: postData.author,
            password: postData.password || null,
            category: postData.category,
            views: 0,
            likes: 0
          }])
          .select("*")
          .single();
        
        if (error) throw error;
        return { post: data, usingSupabase: true };
      } catch (err: any) {
        throw new Error(`Supabase 게시글 작성 에러: ${err.message}`);
      }
    }

    // Local
    const posts = getLocalPosts();
    const newPost: Post = {
      id: generateId(),
      created_at: new Date().toISOString(),
      title: postData.title,
      content: postData.content,
      author: postData.author,
      password: postData.password,
      category: postData.category,
      views: 0,
      likes: 0
    };

    posts.unshift(newPost);
    saveLocalPosts(posts);

    return { post: newPost, usingSupabase: false };
  },

  // Update Post
  updatePost: async (
    id: string,
    postData: {
      title: string;
      content: string;
      author: string;
      password?: string;
      category: string;
    }
  ): Promise<{ post: Post; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        // Fetch current to verify password
        const { data: original, error: fetchError } = await client
          .from("posts")
          .select("*")
          .eq("id", id)
          .single();
        
        if (fetchError) throw fetchError;
        if (!original) throw new Error("게시글이 발견되지 않았습니다.");

        // If password is set in DB, check password
        if (original.password && original.password !== postData.password) {
          throw new Error("CONFIRM_PASSWORD_MISMATCH");
        }

        const { data, error } = await client
          .from("posts")
          .update({
            title: postData.title,
            content: postData.content,
            author: postData.author,
            category: postData.category
          })
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;
        return { post: data, usingSupabase: true };
      } catch (err: any) {
        if (err.message === "CONFIRM_PASSWORD_MISMATCH") {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        throw new Error(`Supabase 게시글 수정 에러: ${err.message}`);
      }
    }

    // Local
    const posts = getLocalPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("게시글이 존재하지 않습니다.");

    const original = posts[idx];
    if (original.password && original.password !== postData.password) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    posts[idx] = {
      ...original,
      title: postData.title,
      content: postData.content,
      author: postData.author,
      category: postData.category
    };

    saveLocalPosts(posts);
    return { post: posts[idx], usingSupabase: false };
  },

  // Delete Post
  deletePost: async (id: string, password?: string): Promise<{ success: boolean; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data: original, error: fetchError } = await client
          .from("posts")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        if (!original) throw new Error("게시글이 발견되지 않았습니다.");

        if (original.password && original.password !== password) {
          throw new Error("CONFIRM_PASSWORD_MISMATCH");
        }

        const { error } = await client.from("posts").delete().eq("id", id);
        if (error) throw error;

        return { success: true, usingSupabase: true };
      } catch (err: any) {
        if (err.message === "CONFIRM_PASSWORD_MISMATCH") {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        throw new Error(`Supabase 게시글 삭제 에러: ${err.message}`);
      }
    }

    // Local
    const posts = getLocalPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("게시글이 존재하지 않습니다.");

    const original = posts[idx];
    if (original.password && original.password !== password) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    const filtered = posts.filter((p) => p.id !== id);
    saveLocalPosts(filtered);

    // Cascade delete local comments helper
    const comments = getLocalComments();
    const filteredComments = comments.filter((c) => c.post_id !== id);
    saveLocalComments(filteredComments);

    return { success: true, usingSupabase: false };
  },

  // Like (Upvote) Post
  likePost: async (id: string): Promise<{ post: Post; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data: post, error } = await client.from("posts").select("*").eq("id", id).single();
        if (error) throw error;
        if (!post) throw new Error("게시글을 찾을 수 없습니다.");

        const newLikes = (Number(post.likes) || 0) + 1;
        const { data: updated, error: updateError } = await client
          .from("posts")
          .update({ likes: newLikes })
          .eq("id", id)
          .select("*")
          .single();
        
        if (updateError) throw updateError;
        return { post: updated, usingSupabase: true };
      } catch (err: any) {
        throw new Error(`Supabase 추천 수 증설 에러: ${err.message}`);
      }
    }

    // Local
    const posts = getLocalPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("게시글을 즐겨찾기할 수 없습니다.");

    posts[idx].likes = (posts[idx].likes || 0) + 1;
    saveLocalPosts(posts);

    return { post: posts[idx], usingSupabase: false };
  },

  // Get Comments List
  getComments: async (postId: string): Promise<{ comments: Comment[]; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data, error } = await client
          .from("comments")
          .select("*")
          .eq("post_id", postId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return { comments: data || [], usingSupabase: true };
      } catch (err: any) {
        console.error("Supabase load comments error:", err);
        throw new Error(`Supabase 댓글 목록 로드 에러: ${err.message}`);
      }
    }

    // Local
    const comments = getLocalComments();
    const filtered = comments.filter((c) => c.post_id === postId);
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return { comments: filtered, usingSupabase: false };
  },

  // Create Comment
  createComment: async (
    postId: string,
    commentData: {
      author: string;
      content: string;
      password?: string;
    }
  ): Promise<{ comment: Comment; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data, error } = await client
          .from("comments")
          .insert([{
            post_id: postId,
            author: commentData.author,
            content: commentData.content,
            password: commentData.password || null
          }])
          .select("*")
          .single();

        if (error) throw error;
        return { comment: data, usingSupabase: true };
      } catch (err: any) {
        throw new Error(`Supabase 댓글 작성 에러: ${err.message}`);
      }
    }

    // Local
    const comments = getLocalComments();
    const newComment: Comment = {
      id: generateId(),
      created_at: new Date().toISOString(),
      post_id: postId,
      author: commentData.author,
      content: commentData.content,
      password: commentData.password
    };

    comments.push(newComment);
    saveLocalComments(comments);

    return { comment: newComment, usingSupabase: false };
  },

  // Delete Comment
  deleteComment: async (commentId: string, password?: string): Promise<{ success: boolean; usingSupabase: boolean }> => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { data: original, error: fetchError } = await client
          .from("comments")
          .select("*")
          .eq("id", commentId)
          .single();

        if (fetchError) throw fetchError;
        if (!original) throw new Error("댓글이 발견되지 않았습니다.");

        if (original.password && original.password !== password) {
          throw new Error("CONFIRM_PASSWORD_MISMATCH");
        }

        const { error } = await client.from("comments").delete().eq("id", commentId);
        if (error) throw error;

        return { success: true, usingSupabase: true };
      } catch (err: any) {
        if (err.message === "CONFIRM_PASSWORD_MISMATCH") {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        throw new Error(`Supabase 댓글 삭제 에러: ${err.message}`);
      }
    }

    // Local
    const comments = getLocalComments();
    const idx = comments.findIndex((c) => c.id === commentId);
    if (idx === -1) throw new Error("댓글이 일치하지 않거나 이미 삭제되었습니다.");

    const original = comments[idx];
    if (original.password && original.password !== password) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    const filtered = comments.filter((c) => c.id !== commentId);
    saveLocalComments(filtered);

    return { success: true, usingSupabase: false };
  }
};
