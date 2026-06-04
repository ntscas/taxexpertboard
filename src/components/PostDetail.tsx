import React, { useState, useEffect } from "react";
import { 
  X, ThumbsUp, Trash2, Edit, MessageSquare, 
  Send, User, Calendar, Eye, ShieldCheck, HelpCircle, CornerDownRight 
} from "lucide-react";
import { Post, Comment } from "../types";
import { formatDate } from "./PostCard";
import { dbService } from "../db";

interface PostDetailProps {
  postId: string;
  onClose: () => void;
  onEdit: (post: Post) => void;
  onDeleteSuccess: () => void;
  onStatusMessage: (msg: { text: string; type: "success" | "error" }) => void;
  isInline?: boolean;
}

// Custom simple markdown formatter to visually polish markdown text inside cards
function SimpleMarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;
  
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeSnippet: string[] = [];
  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Toggle Codeblocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Render current codeblock
        renderedElements.push(
          <pre key={`code-${i}`} className="my-4 p-4 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs overflow-x-auto border border-gray-800 text-left">
            <code>{codeSnippet.join("\n")}</code>
          </pre>
        );
        codeSnippet = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeSnippet.push(line);
      continue;
    }

    // Headers
    if (line.trim().startsWith("### ")) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-gray-900 mt-5 mb-2 font-display">
          {line.replace("### ", "").trim()}
        </h3>
      );
    } else if (line.trim().startsWith("## ")) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-gray-900 mt-6 mb-3 font-display">
          {line.replace("## ", "").trim()}
        </h2>
      );
    } else if (line.trim().startsWith("# ")) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-xl font-extrabold text-gray-900 mt-7 mb-4 font-display">
          {line.replace("# ", "").trim()}
        </h1>
      );
    } 
    // Bullet lists
    else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      renderedElements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside text-gray-700 text-sm pl-4 my-1.5 space-y-1">
          <li className="leading-relaxed">{line.substring(2).trim()}</li>
        </ul>
      );
    } else if (line.trim() === "") {
      renderedElements.push(<div key={`space-${i}`} className="h-2.5" />);
    } else {
      // Normal paragraph
      renderedElements.push(
        <p key={`p-${i}`} className="text-gray-700 text-sm leading-relaxed mb-1.5">
          {line}
        </p>
      );
    }
  }

  // Handle unclosed codeblocks
  if (inCodeBlock && codeSnippet.length > 0) {
    renderedElements.push(
      <pre key={`code-unclosed`} className="my-4 p-4 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs overflow-x-auto text-left">
        <code>{codeSnippet.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5">{renderedElements}</div>;
}

export function PostDetail({ 
  postId, 
  onClose, 
  onEdit, 
  onDeleteSuccess, 
  onStatusMessage,
  isInline = false
}: PostDetailProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likeAnimating, setLikeAnimating] = useState(false);

  // Form states for adding comments
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentPassword, setCommentPassword] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Authenticated actions triggers
  const [actionType, setActionType] = useState<"edit" | "delete" | "delete-comment" | null>(null);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [targetCommentId, setTargetCommentId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Fetch target post detail and comments list
  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      
      const postData = await dbService.getPostDetail(postId);
      setPost(postData.post);

      const commentsData = await dbService.getComments(postId);
      setComments(commentsData.comments || []);
    } catch (err: any) {
      onStatusMessage({ text: err.message || "오류가 발생했습니다.", type: "error" });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [postId]);

  // Handle Post Upvote/Like
  const handleLike = async () => {
    if (!post) return;
    try {
      setLikeAnimating(true);
      const data = await dbService.likePost(postId);
      setPost(data.post);
      onStatusMessage({ text: "추천되었습니다 ❤️", type: "success" });
    } catch (err: any) {
      console.error(err);
      onStatusMessage({ text: err.message || "추천에 실패했습니다.", type: "error" });
    } finally {
      setTimeout(() => setLikeAnimating(false), 600);
    }
  };

  // Submit Comments
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentAuthor.trim() || !commentContent.trim()) {
      return onStatusMessage({ text: "댓글 작성자명과 내용을 모두 입력하세요.", type: "error" });
    }

    try {
      setIsSubmittingComment(true);
      await dbService.createComment(postId, {
        author: commentAuthor,
        content: commentContent,
        password: commentPassword || undefined,
      });

      // Reset input fields
      setCommentAuthor("");
      setCommentContent("");
      setCommentPassword("");
      
      onStatusMessage({ text: "댓글이 작성되었습니다.", type: "success" });
      
      // Reload comments
      const data = await dbService.getComments(postId);
      setComments(data.comments || []);
    } catch (err: any) {
      onStatusMessage({ text: err.message, type: "error" });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Enter action verification layer
  const triggerVerify = (type: "edit" | "delete" | "delete-comment", commentId?: string) => {
    setActionType(type);
    setVerifyPassword("");
    setVerifyError(null);
    if (commentId) setTargetCommentId(commentId);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    try {
      if (actionType === "delete") {
        await dbService.deletePost(postId, verifyPassword);
        onStatusMessage({ text: "게시글이 영구 삭제되었습니다.", type: "success" });
        onDeleteSuccess();
      } 
      
      else if (actionType === "edit") {
        // For editing, we verify on submission in form, so we close validation overlay,
        // send client auth password details directly to parent form launcher!
        const verifyPost = { ...post, password: verifyPassword };
        onEdit(verifyPost);
      } 
      
      else if (actionType === "delete-comment" && targetCommentId) {
        await dbService.deleteComment(targetCommentId, verifyPassword);
        onStatusMessage({ text: "댓글이 정상적으로 삭제되었습니다.", type: "success" });
        
        // Refresh comments list
        setComments((prev) => prev.filter((c) => c.id !== targetCommentId));
        setActionType(null);
        setTargetCommentId(null);
      }
    } catch (err: any) {
      setVerifyError(err.message || "작업 도중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    if (isInline) {
      return (
        <div className="w-full h-full flex items-center justify-center min-h-[350px] bg-white rounded-xl border border-slate-200">
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-slate-400 text-xs font-semibold">내용을 불러오고 있습니다...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-premium text-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">상세 정보를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className={isInline ? "w-full h-full flex flex-col bg-white rounded-xl border border-slate-200 relative overflow-hidden text-left" : "fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"}>
      <div className={isInline ? "w-full h-full flex flex-col overflow-hidden" : "bg-white rounded-2xl w-full max-w-3xl shadow-premium overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] text-left"}>
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-gray-50 text-gray-500">
            {post.category} 목록
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => triggerVerify("edit")}
              className="text-gray-500 hover:text-brand hover:bg-gray-50 p-2 rounded-xl transition flex items-center gap-1 text-xs font-medium cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" /> 수정
            </button>
            <button
              onClick={() => triggerVerify("delete")}
              className="text-gray-500 hover:text-rose-500 hover:bg-rose-50/50 p-2 rounded-xl transition flex items-center gap-1 text-xs font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> 삭제
            </button>
            <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal content body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* Article Title Header */}
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900 leading-snug mb-3">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-semibold text-gray-700">{post.author}</span>
                </span>
                <span className="text-gray-200">•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatDate(post.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-gray-400" /> {post.views}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-gray-400" /> {post.likes}
                </span>
              </div>
            </div>
          </div>

          {/* Article Body Content */}
          <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed min-h-[140px] text-left">
            <SimpleMarkdownRenderer text={post.content} />
          </div>

          {/* Recommendation/Like layout box */}
          <div className="flex justify-center py-6">
            <button
              onClick={handleLike}
              disabled={likeAnimating}
              className={`group flex items-center gap-2 px-6 py-3 rounded-full border select-none cursor-pointer transition duration-300 ${
                likeAnimating 
                ? "bg-rose-50 border-rose-200 text-rose-500 scale-105" 
                : "bg-white border-gray-200 text-gray-600 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50/20 shadow-premium"
              }`}
            >
              <ThumbsUp className={`w-4 h-4 transition duration-300 ${likeAnimating ? "animate-bounce text-rose-500 fill-rose-500" : "group-hover:scale-110"}`} />
              <span className="text-sm font-semibold">이 글 추천하기</span>
              <span className="bg-gray-100 group-hover:bg-rose-100 text-gray-700 group-hover:text-rose-600 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold transition">
                {post.likes}
              </span>
            </button>
          </div>

          {/* Comments list footer layout */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-1.5 mb-5">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900 font-display">
                댓글 <span className="text-brand font-mono">{comments.length}</span>
              </h2>
            </div>

            {/* Comment adding flow */}
            <form onSubmit={handleCommentSubmit} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="댓글 닉네임"
                    className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-xs focus:border-brand focus:outline-none transition"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={commentPassword}
                    onChange={(e) => setCommentPassword(e.target.value)}
                    placeholder="삭제용 비밀번호 (설정)"
                    className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs focus:border-brand focus:outline-none transition"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="댓글 내용을 입력해 보세요."
                  rows={2}
                  className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-xs focus:border-brand focus:outline-none leading-relaxed resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="px-4 bg-brand hover:bg-brand-dark text-white rounded-xl flex items-center justify-center transition cursor-pointer select-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Comments Lists */}
            {comments.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs font-medium">
                첫 댓글을 달고 의견을 공유해 보세요.
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="group border-b border-gray-50 pb-4 flex items-start gap-3">
                    <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500 shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 text-xs">{comment.author}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{formatDate(comment.created_at)}</span>
                        </div>
                        <button
                          onClick={() => triggerVerify("delete-comment", comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 p-1 rounded transition cursor-pointer"
                          title="댓글 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed text-left whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Password verification Overlay/Drawer */}
      {actionType && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-premium border border-gray-150 relative">
            <button
              onClick={() => {
                setActionType(null);
                setTargetCommentId(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-brand mb-4">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-semibold text-gray-900 text-base">
                {actionType === "edit" ? "글 비밀번호 검증" : 
                 actionType === "delete" ? "글 일방 삭제 검증" : "댓글 제거 보안 검증"}
              </h3>
            </div>

            <p className="text-xs text-text-gray-500 leading-normal mb-4">
              {actionType === "edit" ? "게시물을 수정하려면 생성 비밀번호를 작성하세요." :
               actionType === "delete" ? "게시물을 데이터베이스에서 완전 폐기하려면 등록 암호를 확인하세요." :
               "댓글을 안전하게 정리할 수 있도록 지정 암호를 기재하세요."}
            </p>

            <form onSubmit={handleVerifySubmit} className="space-y-3">
              {verifyError && (
                <div className="text-[11px] font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                  {verifyError}
                </div>
              )}
              <input
                type="password"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                placeholder="비밀번호(암호) 기입"
                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-brand focus:outline-none transition"
                required
                autoFocus
              />
              <button
                type="submit"
                className="w-full h-10 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold cursor-pointer select-none transition"
              >
                비밀번호 검증 및 동기화
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
