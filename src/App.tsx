import React, { useState, useEffect } from "react";
import { 
  Plus, Search, RefreshCw, Layers, Database, 
  HelpCircle, AlertTriangle, AlertCircle, CheckCircle, 
  Flame, TrendingUp, BarChart2, MessageSquare, ArrowUpDown,
  Menu, X, Settings
} from "lucide-react";
import { Post, Category, SortOption } from "./types";
import { PostCard } from "./components/PostCard";
import { PostForm } from "./components/PostForm";
import { PostDetail } from "./components/PostDetail";
import { dbService, getDbConfig } from "./db";

export default function App() {
  // DB & System connection states
  const [posts, setPosts] = useState<Post[]>([]);
  const [usingSupabase, setUsingSupabase] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom Database Setup modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [dbInputUrl, setDbInputUrl] = useState("");
  const [dbInputKey, setDbInputKey] = useState("");
  const [setupSource, setSetupSource] = useState<"env" | "override" | "none">("none");

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
      const data = await dbService.checkStatus();
      setUsingSupabase(data.usingSupabase);
      setSupabaseUrl(data.supabaseUrl);
      setSetupSource(data.source);
      
      const config = getDbConfig();
      setDbInputUrl(config.supabaseUrl || "");
      setDbInputKey(config.supabaseAnonKey || "");
    } catch (err) {
      console.error("Failed to check database configuration status:", err);
    }
  };

  // 2. Fetch comments lists to count totals per posts
  const fetchCommentsCounts = async (postsList: Post[]) => {
    const counts: Record<string, number> = {};
    await Promise.all(
      postsList.map(async (p) => {
        try {
          const data = await dbService.getComments(p.id);
          counts[p.id] = data.comments?.length || 0;
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
      const data = await dbService.getPosts(selectedCategory, searchQuery, sortOption);
      setPosts(data.posts || []);
      
      // Load comment counts parallel
      fetchCommentsCounts(data.posts || []);
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Save Config Custom Overrides
  const handleSaveConfig = () => {
    if (!dbInputUrl.trim() || !dbInputKey.trim()) {
      dbService.clearOverrideConfig();
      triggerToast("연결 설정을 초기화했습니다. 로컬 데모 모드로 복귀합니다.", "success");
    } else {
      dbService.saveOverrideConfig(dbInputUrl, dbInputKey);
      triggerToast("Supabase 데이터베이스 연동 및 저장이 반영되었습니다! ⚡", "success");
    }
    setIsConfigModalOpen(false);
    checkStatus();
    fetchPosts();
  };

  // Initial load
  useEffect(() => {
    checkStatus();
  }, []);

  // Hot Reload list whenever filters or options change
  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, sortOption]);

  // Synchronize the detail view (selectedPost) whenever the posts list updates:
  // This ensures that when category or filters are changed, the post content window (detail view)
  // automatically switches to the first post of the current category/list.
  useEffect(() => {
    if (posts.length > 0) {
      // If there is currently a selected post, see if it exists in the active posts array
      const stillExists = selectedPost ? posts.some(p => p.id === selectedPost.id) : false;
      if (!stillExists) {
        // If it was deleted, or we changed category so it's not in the list, auto-select the first post
        setSelectedPost(posts[0]);
      } else {
        // Keep the selected post synced with any updates (like views or likes) from the list
        const updatedPost = posts.find(p => p.id === selectedPost.id);
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }
    } else {
      setSelectedPost(null);
    }
  }, [posts]);

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
    
    try {
      let resData;
      if (isEdit) {
        resData = await dbService.updatePost(editingPost.id, formData);
      } else {
        resData = await dbService.createPost(formData);
      }

      const data = resData;
      
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
    } catch (err: any) {
      throw new Error(err.message || "서버 연동 도중 오류가 발생했습니다. 필드를 확인해 주세요.");
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
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">DB Connection</span>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${usingSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            </div>
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
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0 bg-slate-50/40">
              <div className="flex justify-between items-center">
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

              {/* Category Quick Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden py-1">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-[10.5px] font-medium transition-all shrink-0 cursor-pointer border ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white font-semibold shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                      }`}
                    >
                      {cat === "전체" ? "All Discussions" : cat}
                    </button>
                  );
                })}
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

      {/* MODAL: Database Settings custom config overlay */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-150 animate-fade-in text-left">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-premium border border-slate-100 overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <h3 className="font-display font-semibold text-slate-800 text-sm">Supabase 데이터베이스 연동 및 관리</h3>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-slate-500 text-xs leading-relaxed">
                현재 설치된 게시판은 백엔드 중계 서버 없이 웹 브라우저에서 직접 Supabase와 통신하는 <strong>클라이언트 전용 SPA 방식</strong>입니다. 아래 정보를 기입해 즉시 실시간 데이터베이스를 구축하세요.
              </p>
              
              <div className="p-3 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 leading-normal border border-emerald-100">
                💡 <strong>안내:</strong> 정보는 사용자의 브라우저 내 로컬 저장소(<code className="font-mono bg-emerald-100 px-1 rounded text-[10px]">localStorage</code>)에만 안전하게 비밀리에 저장되며 네트워크상 외부에 노출되지 않습니다.
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  SUPABASE PROJECT URL
                </label>
                <input
                  type="url"
                  placeholder="https://xxxx.supabase.co"
                  value={dbInputUrl}
                  onChange={(e) => setDbInputUrl(e.target.value)}
                  className="w-full text-xs font-mono h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  SUPABASE ANON KEY (PUBLIC API KEY)
                </label>
                <textarea
                  placeholder="eyJhbGciOi..."
                  value={dbInputKey}
                  onChange={(e) => setDbInputKey(e.target.value)}
                  rows={3}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition resize-none"
                />
              </div>

              <div className="text-[10px] text-slate-400 leading-normal">
                연결 정보가 비어 있는 경우 기본적으로 동적인 데모 동작이 가능하도록 로컬 브라우저 기기 저장소(<strong className="text-amber-600">LocalStorage</strong>)에 자동 안전 저장하여 fallback 연동됩니다.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setDbInputUrl("");
                  setDbInputKey("");
                  dbService.clearOverrideConfig();
                  triggerToast("설정을 초기화했습니다. 로컬 기기 데이터베이스 모드로 복원됩니다.");
                  setIsConfigModalOpen(false);
                  checkStatus();
                  fetchPosts();
                }}
                className="text-rose-500 hover:text-rose-700 font-medium text-xs px-2.5 py-1.5 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
              >
                연결 해제 (초기화)
              </button>
              
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/10 transition cursor-pointer"
                >
                  저장 및 연결
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
