import React, { useState, useEffect, useMemo } from "react";
import { Star, MessageCircle, CheckCircle2, ShieldAlert, RefreshCw, StarHalf } from "lucide-react";
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { UserFeedback } from "../types";

interface FeedbackSectionProps {
  mode: "full" | "form";
}

export default function FeedbackSection({ mode }: FeedbackSectionProps) {
  // Feedback states
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackVerifyAnswer, setFeedbackVerifyAnswer] = useState("");
  const [mathCaptcha, setMathCaptcha] = useState({ num1: 5, num2: 4, answer: 9 });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [alertState, setAlertState] = useState<{ title: string; message: string; type: "success" | "error" | "rate" } | null>(null);

  // Load random math values for anti-spam check
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 8) + 2;
    const n2 = Math.floor(Math.random() * 8) + 2;
    setMathCaptcha({ num1: n1, num2: n2, answer: n1 + n2 });
    setFeedbackVerifyAnswer("");
  };

  // Setup Real-time listener on feedback collection
  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(100));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const parsed: UserFeedback[] = [];
        snapshot.forEach((docSnap) => {
          parsed.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as UserFeedback);
        });
        setFeedbacks(parsed);
      },
      (error) => {
        console.error("Firestore Error in feedback listener:", error);
        handleFirestoreError(error, OperationType.GET, "feedback");
      }
    );

    // Initial captcha load
    generateCaptcha();

    return () => {
      unsubscribe();
    };
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    if (feedbacks.length === 0) {
      return { average: 5.0, count: 0, starDistribution: [0, 0, 0, 0, 0] };
    }
    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const avg = Math.round((sum / feedbacks.length) * 10) / 10;
    
    const dist = [0, 0, 0, 0, 0];
    feedbacks.forEach((f) => {
      const idx = Math.max(1, Math.min(5, f.rating)) - 1;
      dist[idx]++;
    });
    
    return {
      average: avg,
      count: feedbacks.length,
      starDistribution: dist,
    };
  }, [feedbacks]);

  // Handle feed submissions
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertState(null);

    // Validation
    const trimmedName = feedbackName.trim();
    const trimmedComment = feedbackComment.trim();

    if (!trimmedName || !trimmedComment) {
      setAlertState({
        title: "Validation Error",
        message: "⚠️ Please enter your name and a comment before submitting.",
        type: "error",
      });
      return;
    }

    if (trimmedName.length > 50) {
      setAlertState({
        title: "Validation Error",
        message: "⚠️ Name must be 50 characters or less.",
        type: "error",
      });
      return;
    }

    if (trimmedComment.length > 1000) {
      setAlertState({
        title: "Validation Error",
        message: "⚠️ Comment cannot exceed 1000 characters.",
        type: "error",
      });
      return;
    }

    // 1. Abuse prevention: Profanity Filter
    const PROFANITIES = [
      "putangina", "tangina", "puta", "gago", "bobo", "tarantado", "ulol", "kupal", "pakshet",
      "pota", "bilat", "burat", "pepe", "dede", "suso", "puke", "titi", "kantot", "bayag",
      "fuck", "shit", "asshole", "bitch", "cunt", "dick", "pussy", "bastard", "idiot", "dumb"
    ];
    
    const lowerName = trimmedName.toLowerCase();
    const lowerComment = trimmedComment.toLowerCase();
    const containsProfanity = PROFANITIES.some(
      (word) => lowerName.includes(word) || lowerComment.includes(word)
    );

    if (containsProfanity) {
      setAlertState({
        title: "Language Filter Triggered",
        message: "❌ Comment Blocked: For the safety and professionalism of our DepEd teacher community, inappropriate or profane words are strictly blocked.",
        type: "error",
      });
      return;
    }

    // 2. Abuse prevention: Client Rate Limiting
    const lastTime = localStorage.getItem("reelsystem_last_feedback_time");
    if (lastTime) {
      const diff = Date.now() - parseInt(lastTime, 10);
      if (diff < 30000) {
        const remaining = Math.ceil((30000 - diff) / 1000);
        setAlertState({
          title: "Rate Limited",
          message: `⏳ Please wait ${remaining}s before posting again. We appreciate your eagerness to contribute!`,
          type: "rate",
        });
        return;
      }
    }

    // 3. Abuse prevention: Math verification
    const valAns = parseInt(feedbackVerifyAnswer, 10);
    if (isNaN(valAns) || valAns !== mathCaptcha.answer) {
      setAlertState({
        title: "Anti-Spam Verification",
        message: "❌ Math answer is incorrect! Please solve the simple calculation to submit.",
        type: "error",
      });
      generateCaptcha();
      return;
    }

    // 4. Save to firestore
    setSubmittingFeedback(true);
    const id = "fb_" + Math.random().toString(36).substring(2, 11);
    const tempFeedback: UserFeedback = {
      id,
      name: trimmedName,
      comment: trimmedComment,
      rating: feedbackRating,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "feedback", id), tempFeedback);
      
      // Update rate limiter
      localStorage.setItem("reelsystem_last_feedback_time", Date.now().toString());
      
      // Clean up form states
      setFeedbackComment("");
      setFeedbackVerifyAnswer("");
      generateCaptcha();

      setAlertState({
        title: "Published Successfully!",
        message: "🎉 Thank you! Your rating and comments have been added live to the REEL IN ONE bulletin board.",
        type: "success",
      });
    } catch (err) {
      console.error("Error creating feedback document in Firestore:", err);
      // Fail gracefully & alert user
      setAlertState({
        title: "Publishing Failure",
        message: "⚠️ A database write error occurred. Check network or security credentials.",
        type: "error",
      });
      handleFirestoreError(err, OperationType.CREATE, `feedback/${id}`);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Helper to render star graphics
  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= rating;
          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && setFeedbackRating(star)}
              className={`${
                interactive ? "hover:scale-125 cursor-pointer active:scale-90 transition-transform" : ""
              }`}
            >
              <Star
                className={`w-5 h-5 ${
                  isFilled ? "text-amber-400 fill-amber-400" : "text-slate-200"
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  const formattedDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Just now";
    }
  };

  // ----------------------------------------------------------------------
  // RENDER JUST THE FORM COMPONENT (Support / Donate Page)
  // ----------------------------------------------------------------------
  if (mode === "form") {
    return (
      <div className="bg-white border-4 border-slate-900 rounded-2xl p-5 md:p-6 shadow-[4px_4px_0px_rgba(15,23,42,1)] space-y-4 text-slate-800">
        <div className="space-y-1">
          <h3 className="text-base font-black uppercase text-rose-950 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-rose-600" />
            Submit Public Teacher Review
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">Your comment and star rating will appear instantly on the main dashboard live feed!</p>
        </div>

        {alertState && (
          <div
            className={`border-2 border-slate-900 text-xs p-3 rounded-xl flex items-start gap-2.5 ${
              alertState.type === "success"
                ? "bg-emerald-50 text-emerald-900"
                : alertState.type === "rate"
                ? "bg-amber-50 text-amber-900"
                : "bg-rose-50 text-rose-900"
            }`}
          >
            {alertState.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <strong className="font-extrabold">{alertState.title}</strong>
              <p className="font-medium">{alertState.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500">Name / Designation</label>
              <input
                type="text"
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
                placeholder="e.g. Teacher Jane Santos"
                disabled={submittingFeedback}
                className="w-full text-xs font-semibold px-3 py-2 border-2 border-slate-900 rounded-xl focus:outline-none focus:bg-slate-50 disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <span className="text-[11px] font-black uppercase text-slate-500 mb-1">Star Rating</span>
              <div className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 max-w-[150px] flex justify-center">
                {renderStars(feedbackRating, true)}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-slate-500">Your Feedback / Comment</label>
            <textarea
              rows={3}
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="How has REEL IN ONE saved your planning hours? Share standard suggestions or general support notes here..."
              disabled={submittingFeedback}
              className="w-full text-xs font-semibold px-3 py-2 border-2 border-slate-900 rounded-xl resize-none focus:outline-none focus:bg-slate-50 disabled:bg-slate-100"
            />
          </div>

          {/* Verification anti-spam block */}
          <div className="bg-rose-50/50 border-2 border-dashed border-slate-400 p-3 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-rose-100 text-rose-800 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-rose-300">SPAM STOPPER</span>
              <span className="text-[11.5px] font-black tracking-tight text-slate-600">
                Solve: <span className="text-rose-950 font-black">{mathCaptcha.num1} + {mathCaptcha.num2} = ?</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={3}
                value={feedbackVerifyAnswer}
                onChange={(e) => setFeedbackVerifyAnswer(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Ans"
                disabled={submittingFeedback}
                className="w-16 text-center text-xs font-black py-1.5 border-2 border-slate-900 rounded-lg focus:outline-none"
              />
              <button
                type="button"
                onClick={generateCaptcha}
                disabled={submittingFeedback}
                className="p-1.5 bg-white border-2 border-slate-900 rounded-lg hover:bg-slate-100 active:scale-95 transition-all text-slate-700 disabled:opacity-50"
                title="Roll new verification calculation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submittingFeedback}
            className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white py-2.5 rounded-xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer text-white!"
          >
            {submittingFeedback ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Publishing Feedback...</span>
              </>
            ) : (
              <>
                <span>Publish Feedback to Bulletin Board</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER THE FULL VIEW (Dashboard / Home Tab)
  // ----------------------------------------------------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-800">
      
      {/* COLUMN 1: FORM AND METRICS (LEFT side, span 5) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* STATS GENERAL PANEL */}
        <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-4">
          <h3 className="text-lg font-black uppercase text-rose-950 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Public Teacher Ratings
          </h3>

          <div className="flex items-center gap-4 py-2 border-b-2 border-slate-100">
            <div className="text-center bg-slate-50 border-2 border-slate-900 rounded-2xl p-3 shadow-sm shrink-0 min-w-[90px]">
              <span className="text-3xl font-black text-slate-900 block leading-none">{stats.average.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 font-black uppercase mt-1 block">out of 5.0</span>
            </div>
            
            <div className="space-y-1 flex-grow">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const val = stats.average;
                  const isFull = star <= Math.floor(val);
                  const isHalf = !isFull && star === Math.ceil(val) && val % 1 !== 0;
                  return (
                    <span key={star}>
                      {isFull ? (
                        <Star className="w-4.5 h-4.5 text-amber-400 fill-amber-400" />
                      ) : isHalf ? (
                        <StarHalf className="w-4.5 h-4.5 text-amber-400 fill-amber-400" />
                      ) : (
                        <Star className="w-4.5 h-4.5 text-slate-200" />
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-slate-600 font-bold">
                From <span className="text-rose-900 font-extrabold">{stats.count}</span> verified educational reviews!
              </p>
            </div>
          </div>

          {/* Rating Distribution Bars */}
          <div className="space-y-1.5 text-xs text-slate-600 font-medium pt-1">
            {[5, 4, 3, 2, 1].map((starIdx) => {
              const countForStar = stats.starDistribution[starIdx - 1];
              const pct = stats.count > 0 ? (countForStar / stats.count) * 100 : 0;
              return (
                <div key={starIdx} className="flex items-center gap-2">
                  <span className="w-12 text-right font-bold shrink-0">{starIdx} Star</span>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full border border-slate-300 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 font-bold shrink-0 text-right">{countForStar}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FEEDBACK SUBMISSION BLOCK */}
        <div className="bg-white border-4 border-slate-900 rounded-3xl p-5 md:p-6 shadow-[6px_6px_0px_rgba(15,23,42,1)] space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-black uppercase text-rose-950 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-rose-600" />
              Submit Live Review
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Have ideas or comments? Share them live with other teachers immediately.</p>
          </div>

          {alertState && (
            <div
              className={`border-2 border-slate-900 text-xs p-3 rounded-xl flex items-start gap-2.5 ${
                alertState.type === "success"
                  ? "bg-emerald-50 text-emerald-900"
                  : alertState.type === "rate"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-rose-50 text-rose-900"
              }`}
            >
              {alertState.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <strong className="font-extrabold">{alertState.title}</strong>
                <p className="font-medium">{alertState.message}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500">Name / Designation</label>
                <input
                  type="text"
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="e.g. Teacher Jane Santos"
                  disabled={submittingFeedback}
                  className="w-full text-xs font-semibold px-3 py-2 border-2 border-slate-900 rounded-xl focus:outline-none focus:bg-slate-50 disabled:bg-slate-100 font-sans"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <span className="text-[11px] font-black uppercase text-slate-500 mb-1">Star Rating</span>
                <div className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 flex justify-center max-w-[150px]">
                  {renderStars(feedbackRating, true)}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500">Your Feedback / Comment</label>
              <textarea
                rows={3}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="How has REEL IN ONE saved your planning hours? Share standard suggestions or general support notes here..."
                disabled={submittingFeedback}
                className="w-full text-xs font-semibold px-3 py-2 border-2 border-slate-900 rounded-xl resize-none focus:outline-none focus:bg-slate-50 disabled:bg-slate-100 font-sans"
              />
            </div>

            {/* Verification anti-spam block */}
            <div className="bg-rose-50/50 border-2 border-dashed border-slate-400 p-3 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="bg-rose-100 text-rose-800 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-rose-300">SPAM STOPPER</span>
                <span className="text-[11.5px] font-black tracking-tight text-slate-600">
                  Solve: <span className="text-rose-950 font-black">{mathCaptcha.num1} + {mathCaptcha.num2} = ?</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={3}
                  value={feedbackVerifyAnswer}
                  onChange={(e) => setFeedbackVerifyAnswer(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Ans"
                  disabled={submittingFeedback}
                  className="w-16 text-center text-xs font-black py-1.5 border-2 border-slate-900 rounded-lg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={generateCaptcha}
                  disabled={submittingFeedback}
                  className="p-1.5 bg-white border-2 border-slate-900 rounded-lg hover:bg-slate-100 active:scale-95 transition-all text-slate-700 disabled:opacity-50"
                  title="Roll new verification calculation"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingFeedback}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white py-2.5 rounded-xl text-xs font-black shadow-[3px_3px_0px_rgba(0,0,0,0.15)] hover:shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer text-white!"
            >
              {submittingFeedback ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Feedback...</span>
                </>
              ) : (
                <>
                  <span>Publish Feedback to Bulletin Board</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* COLUMN 2: REAL-TIME FEED (RIGHT side, span 7) */}
      <div className="lg:col-span-7 flex flex-col bg-white border-4 border-slate-900 rounded-3xl overflow-hidden shadow-[6px_6px_0px_rgba(15,23,42,1)] self-start w-full">
        {/* Header indicator */}
        <div className="bg-slate-900 text-white px-5 py-4 border-b-4 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-white!">📢 Live Feedback Bulletin Board</h3>
          </div>
          <span className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700 text-rose-200 font-extrabold uppercase">Real-Time Sync Ready</span>
        </div>

        {/* Scrollable container of feedbacks */}
        <div className="p-4 md:p-6 max-h-[580px] overflow-y-auto space-y-4 scrollbar-thin">
          {feedbacks.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto animate-bounce" />
              <div className="max-w-xs mx-auto space-y-1">
                <p className="font-extrabold text-slate-700 text-sm">No live comments yet</p>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Be the very first educator to share your thoughts, star rating, or custom support comments!</p>
              </div>
            </div>
          ) : (
            feedbacks.map((f) => (
              <div
                key={f.id}
                className="bg-slate-50/70 border-2 border-slate-900 p-4 rounded-2xl shadow-sm hover:shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-all space-y-2.5 relative overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase flex items-center justify-center border border-rose-300 shrink-0">
                      {f.name ? f.name.charAt(0).toUpperCase() : "T"}
                    </span>
                    <strong className="text-xs font-black text-slate-900">{f.name}</strong>
                    <span className="bg-slate-200 border border-slate-300 text-[9px] font-extrabold text-slate-600 px-1.5 py-0.2 rounded-full uppercase">Teacher</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">{formattedDate(f.createdAt)}</span>
                </div>

                <div className="space-y-1">
                  {renderStars(f.rating)}
                  <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{f.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
