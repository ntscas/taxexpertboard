import React, { useState, useEffect } from "react";
import { X, Send, Save, User, ShieldAlert, BookOpen } from "lucide-react";
import { Post, Category } from "../types";

interface PostFormProps {
  post?: Post; // If set, we are in Edit Mode
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    content: string;
    author: string;
    password?: string;
    category: Category;
  }) => Promise<void>;
  categories: Category[];
}

export function PostForm({ post, onClose, onSubmit, categories }: PostFormProps) {
  const isEdit = !!post;
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState<Category>("자유");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setAuthor(post.author);
      setCategory(post.category as Category);
      setContent(post.content);
      setPassword(post.password || ""); // Prefill verified password so user doesn't type it twice
    }
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("제목을 입력해 주세요.");
    if (!author.trim()) return setError("작성자를 입력해 주세요.");
    if (!content.trim()) return setError("내용을 입력해 주세요.");
    if (isEdit && post?.password && !password) return setError("수정 확인을 위해 원본 패스워드를 적어주세요.");

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        title,
        content,
        author,
        password: password || undefined,
        category,
      });
    } catch (err: any) {
      setError(err?.message || "작업 도중 요류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-premium overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand" />
            <h2 className="font-display font-semibold text-lg text-gray-900">
              {isEdit ? "게시글 수정하기" : "새로운 게시글 작성"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition"
              >
                {categories.filter((c) => c !== "전체").map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="게시물의 제목을 기입해 주세요"
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition"
                required
              />
            </div>
          </div>

          {/* Author & Password Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" /> 작성자명
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="닉네임 혹은 실명"
                disabled={isEdit} // Prevent author rename on edit for consistency
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none disabled:opacity-60 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                {isEdit ? "패스워드 입력 (인증됨)" : "게시물 수정/삭제 비밀번호 (선택)"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="수정/삭제 시 필요한 비밀번호"
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition"
                required={isEdit && !!post?.password}
              />
            </div>
          </div>

          {/* Content TextArea */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="게시물의 상세 내용을 기입하십시오. Markdown(제목#, 리스트- 등) 문법이 연동되어 뷰어에서 정돈되게 보입니다."
              rows={10}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none transition font-sans leading-relaxed resize-none"
              required
            />
          </div>
        </form>

        {/* Form Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
          >
            취소
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 px-5 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl flex items-center justify-center gap-1.5 cursor-pointer select-none transition shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <span className="animate-spin mr-1">●</span>
            ) : isEdit ? (
              <Save className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isEdit ? "수정 완료" : "작성 완료"}
          </button>
        </div>

      </div>
    </div>
  );
}
