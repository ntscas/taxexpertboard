import React, { useState, useEffect } from "react";
import { 
  Plus, Search, RefreshCw, Layers, Database, 
  HelpCircle, AlertTriangle, AlertCircle, CheckCircle, 
  Flame, TrendingUp, BarChart2, MessageSquare, ArrowUpDown,
  Menu, X
} from "lucide-react";
import { Post, Category, SortOption, StatusResponse } from "./types";
import { PostCard } from "./components/PostCard";
import { PostForm } from "./components/PostForm";
import { PostDetail } from "./components/PostDetail";

export default function App() {
  // DB & System connection states
  const [posts, setPosts] = useState<Post[]>([]);
  const [usingSupabase, setUsingSupabase] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Search & Sort states
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("latest");

  // Interaction triggers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Comments map per single posts to display accurate comments count in cards
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});

  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast notifier states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const categories: Category[] = ["전체", "공지", "자유", "정보", "질문"];

  // Show dynamic toast overlay
  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch system status
  const checkStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data: StatusResponse = await res.json();
        setUsingSupabase(data.usingSupabase);
        setSupabaseUrl(data.supabaseUrl);
      }
    } catch (err) {
      console.error("Failed to check backend configuration status:", err);
    }
  };

  // 2. Fetch comments lists to count totals per posts
  const fetchCommentsCounts = async (postsList: Post[]) => {
    const counts: Record<string, number> = {};
    await Promise.all(
      postsList.map(async (p) => {
        try {
          const res = await fetch(`/api/posts/${p.id}/comments`);
          if (res.ok) {
            const data = await res.json();
            counts[p.id] = data.comments?.length || 0;
          }
        } catch (e) {
          counts[p.id] = 0;
        }
      })
    );
    setCommentsCounts(counts);
  };

  // 3. Main posts loader
  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const url = `/api/posts?category=${encodeURIComponent(selectedCategory)}&search=${encodeURIComponent(searchQuery)}&sort=${sortOption}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("게시글 리스트를 가져오는 데 실패했습니다.");
      
      const data = await res.json();
      setPosts(data.posts || []);
      
      // Load comment counts parallel
      fetchCommentsCounts(data.posts || []);
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    checkStatus();
  }, []);

  // Hot Reload list whenever filters or options change
  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, sortOption]);

  // Handle Manual Search Trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  // Create or Edit handler
  const handlePostSubmit = async (formData: {
    title: string;
    content: string;
    author: string;
    password?: string;
    category: Category;
  }) => {
    const isEdit = !!editingPost;
    const url = isEdit ? `/api/posts/${editingPost.id}` : "/api/posts";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.status === 403) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "서버 연동 도중 오류가 발생했습니다. 필드를 확인해 주세요.");
    }

    const data = await res.json();
    
    // Close forms
    setIsFormOpen(false);
    setEditingPost(null);
    
    // Notify
    triggerToast(isEdit ? "게시글이 안전하게 수정되었습니다." : "게시글 작성을 완료했습니다!");
    
    // Instant reload
    fetchPosts();

    // If detail modal was open under it, update its detail modal state
    if (selectedPost && selectedPost.id === data.post.id) {
      setSelectedPost(data.post);
    }
  };

  // Total views and likes calculated for summary board
  const totalViews = posts.reduce((sum, p) => sum + (Number(p.views) || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (Number(p.likes) || 0), 0);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* Toast Notification pop */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 border border-slate-800 shadow-premium animate-fade-in">
          {toastMessage.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-white text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Toast Notification pop */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 border border-slate-800 shadow-premium animate-fade-in">
          {toastMessage.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-white text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Mobile backdrop overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR: Slate-900 styling with mobile responsive sliding animation */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 h-full overflow-y-auto lg:overflow-visible transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        
        {/* Sidebar Brand Logo */}
        <div className="p-6 flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-display font-black text-white shadow-lg shadow-emerald-500/20">
              ⚡
            </div>
            <span className="font-bold text-white text-lg tracking-tight font-display">조세전문가 게시판</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            aria-label="카테고리 메뉴 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories as Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1 text-left">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
            <span>Navigation (카테고리)</span>
          </div>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const catCount = cat === "전체" 
              ? posts.length 
              : posts.filter(p => p.category === cat).length;
            
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                  isSelected 
                    ? "bg-slate-800 text-white font-semibold" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{cat === "전체" ? "All Discussions" : cat}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isSelected ? "bg-emerald-500 text-white font-bold" : "bg-slate-800 text-slate-500"
                }`}>
                  {catCount}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Database state and summary metrics nested inside Sidebar footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-left shrink-0 mt-auto">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Database Stat</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono text-slate-400">
            <div className="bg-slate-900 border border-slate-800 p-1.5 rounded flex flex-col justify-center">
              <span className="opacity-60 block">POSTS</span>
              <span className="font-bold text-white text-xs">{posts.length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-1.5 rounded flex flex-col justify-center">
              <span className="opacity-60 block">VIEWS</span>
              <span className="font-bold text-white text-xs">{totalViews}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-1.5 rounded flex flex-col justify-center">
              <span className="opacity-60 block">LIKES</span>
              <span className="font-bold text-rose-400 text-xs">{totalLikes}</span>
            </div>
          </div>
        </div>

      </aside>

      {/* RIGHT WORKSPACE: Header + dynamic query feeds */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 min-w-0 overflow-hidden">
        
        {/* Header bar workspace */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs z-30 gap-3">
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Mobile Sidebar toggle button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition shrink-0 cursor-pointer"
              aria-label="카테고리 메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Interactive filter search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-emerald-500 focus-within:bg-white px-3 py-1.5 rounded-lg w-full max-w-sm md:max-w-md transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목, 내용 또는 저자명 검색..."
                className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => {
                    setSearchQuery("");
                    fetchPosts();
                  }} 
                  className="text-xs text-slate-400 hover:text-slate-600 px-1 shrink-0"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Utility elements */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Sync loader button */}
            <button
              onClick={() => {
                fetchPosts();
                triggerToast("데이터 동기화 완료 🔄");
              }}
              className="p-2 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition shrink-0 cursor-pointer"
              title="데이터 동기화 새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Emerald CTA action */}
            <button 
              onClick={() => {
                setEditingPost(null);
                setIsFormOpen(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Discussion</span>
              <span className="sm:hidden">글쓰기</span>
            </button>
          </div>

        </header>

        {/* Dynamic content split body */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Dual Zone-1: Left Posts lists feed */}
          <section className="w-full lg:w-[380px] xl:w-[420px] border-r border-slate-200 bg-white flex flex-col h-full shrink-0">
            
            {/* Sub-header menu control */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/40">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
                {selectedCategory === "전체" ? "All Discussions" : `${selectedCategory} 목록`}
              </h2>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Sort:</span>
                <select 
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="text-[10px] font-semibold text-slate-600 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-1"
                >
                  <option value="latest">최신 등록순</option>
                  <option value="views">인기 조회순</option>
                  <option value="likes">추천 득표순</option>
                </select>
              </div>
            </div>

            {/* Scrollable list zones */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
                  <p className="text-slate-400 text-xs">포스트 채널을 연결하는 중...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">등록된 게시물이 없습니다.</p>
                  <p className="text-[10px] text-slate-400 mt-1">상단의 New Discussion 버튼으로 첫 글을 업로드하세요.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => setSelectedPost(post)}
                    commentCount={commentsCounts[post.id] || 0}
                    isSelected={selectedPost?.id === post.id}
                  />
                ))
              )}
            </div>

          </section>

          {/* Dual Zone-2: Welcome landing page & guidelines detailed panel */}
          <section className="hidden lg:flex flex-1 bg-slate-50 p-6 xl:p-8 overflow-y-auto h-full">
            <div className="max-w-3xl mx-auto h-full w-full flex flex-col">
              {selectedPost ? (
                <div className="h-full animate-fade-in flex flex-col">
                  <PostDetail
                    postId={selectedPost.id}
                    onClose={() => setSelectedPost(null)}
                    onEdit={(verifiedPost) => {
                      setSelectedPost(null);
                      setEditingPost(verifiedPost);
                      setIsFormOpen(true);
                    }}
                    onDeleteSuccess={() => {
                      setSelectedPost(null);
                      fetchPosts();
                    }}
                    onStatusMessage={({ text, type }) => triggerToast(text, type)}
                    isInline={true}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 min-h-[420px] text-center text-slate-400 w-full shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4 text-base font-bold">
                    ⚡
                  </div>
                  <h3 className="font-display font-semibold text-slate-800 text-sm mb-1.5">
                    선택된 게시글이 없습니다
                  </h3>
                  <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                    왼쪽 토픽 피드에서 글을 선택하면 본문 내용과 실시간으로 연동되는 댓글 대화를 이곳에서 바로 확인하고 작성하실 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          </section>

        </div>

      </main>

      {/* MODAL: Detailed text component overlay (Mobile Only) */}
      {selectedPost && (
        <div className="lg:hidden">
          <PostDetail
            postId={selectedPost.id}
            onClose={() => setSelectedPost(null)}
            onEdit={(verifiedPost) => {
              setSelectedPost(null);
              setEditingPost(verifiedPost);
              setIsFormOpen(true);
            }}
            onDeleteSuccess={() => {
              setSelectedPost(null);
              fetchPosts();
            }}
            onStatusMessage={({ text, type }) => triggerToast(text, type)}
          />
        </div>
      )}

      {/* MODAL: Compose dynamic overlay */}
      {isFormOpen && (
        <PostForm
          post={editingPost || undefined}
          categories={categories}
          onClose={() => {
            setIsFormOpen(false);
            setEditingPost(null);
          }}
          onSubmit={handlePostSubmit}
        />
      )}

    </div>
  );
}
