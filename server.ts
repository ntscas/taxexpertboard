import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// Helper to normalize Supabase URL in case the user pasted the dashboard project URL
function normalizeSupabaseUrl(url: string | undefined): string | undefined {
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

// Supabase configuration
const rawSupabaseUrl = process.env.SUPABASE_URL;
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseUrl !== "https://your-project.supabase.co" && 
  supabaseAnonKey && 
  supabaseAnonKey !== "your-anon-key"
);

// Lazy initialize supabase client
let supabase: any = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    console.log("Supabase Client initialized successfully!");
  } catch (err) {
    console.error("Failed to initialize Supabase Client:", err);
  }
} else {
  console.log("Supabase URL or Anon key missing/placeholder. Running in fallback Local Demo Mode.");
}

// Fallback in-memory database structure
interface Post {
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

interface Comment {
  id: string;
  created_at: string;
  post_id: string;
  author: string;
  content: string;
  password?: string;
}

// Initial dummy posts for fallback mode
let memoryPosts: Post[] = [
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
3. **환경 변수 추가**: AI Studio UI 측면의 'Secrets' 또는 프로젝트 루트의 \`.env\` 파일에 \`SUPABASE_URL\` 과 \`SUPABASE_ANON_KEY\`를 입력하세요.

현재는 **로컬 데모 모드(In-Memory)**로 안전하게 실행 중이며, 새로고침 시 데이터가 초기화될 수 있습니다.`,
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

let memoryComments: Comment[] = [
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

// Helper to generate IDs for local memory mode
const generateId = () => "local_" + Math.random().toString(36).substring(2, 11);

// ===== API ROUTES =====

// 1. Get Setup & Health Status
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    usingSupabase: isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl : null,
  });
});

// 2. Read Posts List (with filtering, search, category)
app.get("/api/posts", async (req, res) => {
  const { category, search, sort } = req.query;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from("posts").select("*");

      if (category && category !== "전체") {
        query = query.eq("category", category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,author.ilike.%${search}%`);
      }

      // Sort
      if (sort === "views") {
        query = query.order("views", { ascending: false });
      } else if (sort === "likes") {
        query = query.order("likes", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.json({ posts: data, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase read error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  let filtered = [...memoryPosts];

  if (category && category !== "전체") {
    filtered = filtered.filter((p) => p.category === category);
  }

  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.content.toLowerCase().includes(s) ||
        p.author.toLowerCase().includes(s)
    );
  }

  if (sort === "views") {
    filtered.sort((a, b) => b.views - a.views);
  } else if (sort === "likes") {
    filtered.sort((a, b) => b.likes - a.likes);
  } else {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  res.json({ posts: filtered, usingSupabase: false });
});

// 3. Read Single Post (with view count incremental)
app.get("/api/posts/:id", async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Get the current post to fetch the view count
      const { data: post, error } = await supabase.from("posts").select("*").eq("id", id).single();
      if (error) throw error;

      // 2. Increment view count
      const newViews = (post.views || 0) + 1;
      const { data: updatedPost, error: updateError } = await supabase
        .from("posts")
        .update({ views: newViews })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.json({ post: updatedPost, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase single post read error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const postIndex = memoryPosts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
  }

  memoryPosts[postIndex].views += 1;
  res.json({ post: memoryPosts[postIndex], usingSupabase: false });
});

// 4. Create Post
app.post("/api/posts", async (req, res) => {
  const { title, content, author, password, category } = req.body;

  if (!title || !content || !author || !category) {
    return res.status(400).json({ error: "필수 입력 항목이 누락되었습니다." });
  }

  const newPostData = {
    title,
    content,
    author,
    password: password || "",
    category,
    views: 0,
    likes: 0,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("posts").insert([newPostData]).select().single();
      if (error) throw error;
      return res.status(201).json({ post: data, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase post create error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const newPost: Post = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...newPostData,
  };

  memoryPosts.unshift(newPost);
  res.status(201).json({ post: newPost, usingSupabase: false });
});

// 5. Update Post
app.put("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, author, password, category } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      // Fetch the existing post to verify password
      const { data: currentPost, error: fetchErr } = await supabase
        .from("posts")
        .select("password")
        .eq("id", id)
        .single();
      
      if (fetchErr) throw fetchErr;

      // Verify simple password if set
      if (currentPost.password && currentPost.password !== password) {
        return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
      }

      const { data, error } = await supabase
        .from("posts")
        .update({ title, content, author, category })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ post: data, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase post update error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const postIndex = memoryPosts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
  }

  const existingPost = memoryPosts[postIndex];
  if (existingPost.password && existingPost.password !== password) {
    return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
  }

  memoryPosts[postIndex] = {
    ...existingPost,
    title,
    content,
    author,
    category,
  };

  res.json({ post: memoryPosts[postIndex], usingSupabase: false });
});

// 6. Delete Post
app.delete("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body; // Sent via JSON body or query parameters

  if (isSupabaseConfigured && supabase) {
    try {
      // Fetch the existing post to verify password
      const { data: currentPost, error: fetchErr } = await supabase
        .from("posts")
        .select("password")
        .eq("id", id)
        .single();
      
      if (fetchErr) throw fetchErr;

      // Verify password
      if (currentPost.password && currentPost.password !== password) {
        return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
      }

      // Supabase comments table should ideally refer to posts with cascade delete.
      // If cascade delete isn't automatically configured, delete comment first or let DB handle it.
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;

      return res.json({ success: true, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase post delete error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const postIndex = memoryPosts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
  }

  const existingPost = memoryPosts[postIndex];
  if (existingPost.password && existingPost.password !== password) {
    return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
  }

  // Cascade delete comments locally
  memoryComments = memoryComments.filter((c) => c.post_id !== id);
  // Delete the post
  memoryPosts.splice(postIndex, 1);

  res.json({ success: true, usingSupabase: false });
});

// 7. Like Post
app.post("/api/posts/:id/like", async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: post, error } = await supabase.from("posts").select("likes").eq("id", id).single();
      if (error) throw error;

      const newLikes = (post.likes || 0) + 1;
      const { data: updatedPost, error: updateError } = await supabase
        .from("posts")
        .update({ likes: newLikes })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.json({ post: updatedPost, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase post like error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const postIndex = memoryPosts.findIndex((p) => p.id === id);
  if (postIndex === -1) {
    return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
  }

  memoryPosts[postIndex].likes += 1;
  res.json({ post: memoryPosts[postIndex], usingSupabase: false });
});

// ===== COMMENT ROUTES =====

// 8. Get Comments for a Post
app.get("/api/posts/:post_id/comments", async (req, res) => {
  const { post_id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return res.json({ comments: data, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase comments read error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const comments = memoryComments
    .filter((c) => c.post_id === post_id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  res.json({ comments, usingSupabase: false });
});

// 9. Create Comment
app.post("/api/posts/:post_id/comments", async (req, res) => {
  const { post_id } = req.params;
  const { author, content, password } = req.body;

  if (!author || !content) {
    return res.status(400).json({ error: "필수 항목이 누락되었습니다." });
  }

  const commentData = {
    post_id,
    author,
    content,
    password: password || "",
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("comments").insert([commentData]).select().single();
      if (error) throw error;
      return res.status(201).json({ comment: data, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase comment create error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const newComment: Comment = {
    id: generateId(),
    created_at: new Date().toISOString(),
    ...commentData,
  };

  memoryComments.push(newComment);
  res.status(201).json({ comment: newComment, usingSupabase: false });
});

// 10. Delete Comment
app.delete("/api/comments/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      // Retrieve comment to verify password
      const { data: currentComment, error: fetchErr } = await supabase
        .from("comments")
        .select("password")
        .eq("id", id)
        .single();
      
      if (fetchErr) throw fetchErr;

      if (currentComment.password && currentComment.password !== password) {
        return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
      }

      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;

      return res.json({ success: true, usingSupabase: true });
    } catch (err: any) {
      console.error("Supabase comment delete error:", err.message);
      return res.status(500).json({ error: `Supabase DB Error: ${err.message}` });
    }
  }

  // Local Memory fallback
  const commentIndex = memoryComments.findIndex((c) => c.id === id);
  if (commentIndex === -1) {
    return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
  }

  const existingComment = memoryComments[commentIndex];
  if (existingComment.password && existingComment.password !== password) {
    return res.status(403).json({ error: "비밀번호가 일치하지 않습니다." });
  }

  memoryComments.splice(commentIndex, 1);
  res.json({ success: true, usingSupabase: false });
});

// ===== SERVING FRONTEND IN PRODUCTION =====

if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development Server running on http://localhost:${PORT}`);
    });
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production Server running on port ${PORT}`);
  });
}
