import React from "react";
import { MessageSquare, Eye, ThumbsUp, User } from "lucide-react";
import { Post } from "../types";

interface PostCardProps {
  key?: string | number;
  post: Post;
  onClick: () => void;
  commentCount: number;
  isSelected?: boolean;
}

// Map categories to visual styles with premium slate aesthetics
export const categoryConfig: Record<string, { bg: string; text: string; border: string; borderL: string; label: string }> = {
  "공지": { bg: "bg-rose-50 text-rose-600", text: "text-rose-600", border: "border-rose-100", borderL: "border-l-rose-500", label: "공지" },
  "자유": { bg: "bg-blue-50 text-blue-600", text: "text-blue-500", border: "border-blue-100", borderL: "border-l-blue-500", label: "자유" },
  "질문": { bg: "bg-emerald-50 text-emerald-600", text: "text-emerald-500", border: "border-emerald-100", borderL: "border-l-emerald-500", label: "질문" },
  "정보": { bg: "bg-purple-50 text-purple-600", text: "text-purple-500", border: "border-purple-100", borderL: "border-l-purple-500", label: "정보" },
  "대기": { bg: "bg-slate-50 text-slate-600", text: "text-slate-500", border: "border-slate-100", borderL: "border-l-slate-400", label: "기타" },
};

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 0) return "방금 전";
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / (3600000 * 24));

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  } catch (err) {
    return dateString;
  }
}

export function PostCard({ post, onClick, commentCount, isSelected = false }: PostCardProps) {
  const cat = categoryConfig[post.category] || categoryConfig["대기"];

  const getCleanPreview = (text: string) => {
    const withoutMarkdown = text
      .replace(/[#*`[\]\-]/g, "")
      .replace(/\n+/g, " ")
      .trim();
    return withoutMarkdown.length > 100 
      ? withoutMarkdown.substring(0, 100) + "..." 
      : withoutMarkdown;
  };

  return (
    <div
      id={`post-card-${post.id}`}
      onClick={onClick}
      className={`p-5 border-b border-slate-100 cursor-pointer transition-all duration-150 text-left relative flex flex-col justify-between ${
        isSelected 
          ? "bg-emerald-50/30 border-l-4 " + cat.borderL
          : "hover:bg-slate-50 border-l-4 " + cat.borderL + " bg-white"
      }`}
    >
      <div>
        {/* Top meta tags */}
        <div className="flex justify-between items-center mb-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.text}`}>
            {post.category}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {formatDate(post.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 line-clamp-1 mb-1 font-display">
          {post.title}
        </h3>

        {/* Short inline content preview */}
        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
          {getCleanPreview(post.content)}
        </p>
      </div>

      {/* Footer information section */}
      <div className="flex items-center justify-between mt-4 self-stretch pt-2.5 border-t border-slate-50">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 font-mono uppercase border border-slate-200">
            {post.author.slice(0, 2)}
          </div>
          <span className="text-xs font-semibold text-slate-600">{post.author}</span>
        </div>

        {/* Stats view counters */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-0.5" title="조회수">
            <Eye className="w-3 h-3 text-slate-400" />
            <span>{post.views}</span>
          </span>
          <span className="flex items-center gap-0.5 text-rose-400" title="추천">
            <ThumbsUp className="w-3 h-3" />
            <span>{post.likes}</span>
          </span>
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-emerald-500" title="댓글">
              <MessageSquare className="w-3 h-3" />
              <span>{commentCount}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
