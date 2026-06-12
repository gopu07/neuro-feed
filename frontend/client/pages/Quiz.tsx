import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Zap, ArrowRight, Loader2, Brain, Sparkles } from 'lucide-react';
import { useQuizFeed, useSubmitQuiz } from '@/hooks/useQuiz';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Quiz() {
  const { data: quizQuestions, isLoading, isError } = useQuizFeed();
  const submitQuiz = useSubmitQuiz();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = useCallback((optionId: string) => {
    if (isSubmitting || showFeedback || !quizQuestions) return;
    
    const question = quizQuestions[currentQuestion];
    if (!question) return;

    setSelectedOptionId(optionId);
    setIsSubmitting(true);
    
    submitQuiz.mutate({ cardId: question.id, optionId }, {
      onSuccess: (data) => {
        setFeedbackData(data);
        setShowFeedback(true);
        setIsSubmitting(false);
        if (data.is_correct) {
          setScore(s => s + 1);
        }
        setTotalXpEarned(xp => xp + (data.xp_earned || 0));
      },
      onError: () => {
        setIsSubmitting(false);
        setSelectedOptionId(null);
      }
    });
  }, [isSubmitting, showFeedback, quizQuestions, currentQuestion, submitQuiz]);

  const handleNext = useCallback(() => {
    if (!quizQuestions) return;
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOptionId(null);
      setShowFeedback(false);
      setFeedbackData(null);
    } else {
      setCompleted(true);
    }
  }, [currentQuestion, quizQuestions]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed || !quizQuestions || quizQuestions.length === 0) return;
      const question = quizQuestions[currentQuestion];
      if (!question) return;

      if (!showFeedback && !isSubmitting) {
        const optionKeys = ["1", "2", "3", "4"];
        const keyIndex = optionKeys.indexOf(e.key);
        if (keyIndex >= 0 && keyIndex < question.options.length) {
          e.preventDefault();
          handleAnswer(question.options[keyIndex].id);
        }
      }

      if (showFeedback && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, showFeedback, isSubmitting, completed, quizQuestions, handleAnswer, handleNext]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center font-poppins">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
        <span className="text-xs text-muted-foreground font-medium">Loading quiz questions...</span>
      </div>
    );
  }

  if (isError || !quizQuestions) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-poppins text-center p-6">
        <p className="text-red-500 font-bold mb-4">Failed to load quiz. Are you logged in?</p>
        <Link to="/">
          <button className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-all">
            Go Home
          </button>
        </Link>
      </div>
    );
  }

  if (quizQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-poppins text-center p-6">
        <Brain className="w-12 h-12 text-primary/40 mb-4" />
        <h2 className="text-2xl font-extrabold text-foreground mb-2 tracking-tight">You're all caught up!</h2>
        <p className="text-muted-foreground text-sm mb-6">No new quiz questions available right now.</p>
        <Link to="/">
          <button className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:scale-105 transition-all">
            Back to Feed
          </button>
        </Link>
      </div>
    );
  }

  const question = quizQuestions[currentQuestion];

  // Helper to determine option styling based on feedback state
  const getOptionStyle = (optionId: string) => {
    const isSelected = selectedOptionId === optionId;
    const correctId = feedbackData?.correct_option_id;
    const isCorrectOption = correctId === optionId;

    // Before any submission
    if (!showFeedback && !isSubmitting) {
      return 'bg-card/50 border-white/5 hover:border-primary/40 hover:bg-white/[0.03] cursor-pointer';
    }

    // While submitting (loading)
    if (isSubmitting) {
      if (isSelected) {
        return 'bg-primary/10 border-primary/30 text-primary';
      }
      return 'bg-card/30 border-white/5 opacity-50 cursor-not-allowed';
    }

    // After feedback received
    if (showFeedback) {
      // This is the correct answer — always green
      if (isCorrectOption) {
        return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20';
      }
      // This is the selected wrong answer — red
      if (isSelected && !feedbackData?.is_correct) {
        return 'bg-red-500/10 border-red-500/40 text-red-300';
      }
      // Other unselected options — dim
      return 'bg-card/20 border-white/5 opacity-40 cursor-not-allowed';
    }

    return 'bg-card/50 border-white/5';
  };

  if (completed) {
    const accuracy = Math.round((score / quizQuestions.length) * 100);
    const emoji = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '💪' : accuracy >= 40 ? '📚' : '🔄';
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-poppins relative overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-md px-8 py-12 rounded-2xl glass-premium border border-white/10 text-center shadow-2xl shadow-black/30"
        >
          <motion.div 
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: 2 }}
          >
            {emoji}
          </motion.div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">
            Quiz Complete!
          </h1>
          <p className="text-5xl font-black text-primary mb-1">
            {score}/{quizQuestions.length}
          </p>
          <p className="text-muted-foreground text-sm mb-8">
            {accuracy}% Accuracy
          </p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-8"
          >
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-amber-300 text-sm">+{totalXpEarned} XP Earned</span>
          </motion.div>

          <Link to="/">
            <button className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-primary/20 text-sm">
              Back to Feed
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-poppins relative overflow-hidden">
      {/* Decorative backdrop */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="px-6 py-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
                <span className="text-[10px] text-secondary font-bold uppercase tracking-widest">Neural Quiz</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Question {currentQuestion + 1}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Progress</div>
              <div className="text-sm font-extrabold text-primary">
                {currentQuestion + 1}/{quizQuestions.length}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-secondary"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-10 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question */}
            <div className="mb-10">
              {question.domain && (
                <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-lg mb-4">
                  {question.domain}
                </span>
              )}
              <h2 className="text-xl md:text-2xl font-extrabold text-foreground leading-tight tracking-tight">
                {question.body}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 mb-10">
              {question.options.map((option: any, index: number) => {
                const isSelected = selectedOptionId === option.id;
                const correctId = feedbackData?.correct_option_id;
                const isCorrectOption = correctId === option.id;

                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    onClick={() => handleAnswer(option.id)}
                    disabled={showFeedback || isSubmitting}
                    className={cn(
                      'w-full p-5 rounded-xl text-left font-medium transition-all border-2 focus:outline-none group relative',
                      getOptionStyle(option.id)
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Option number badge */}
                      <span className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                        showFeedback && isCorrectOption 
                          ? "bg-emerald-500/20 text-emerald-400"
                          : showFeedback && isSelected && !feedbackData?.is_correct
                          ? "bg-red-500/20 text-red-400"
                          : "bg-white/5 text-muted-foreground group-hover:text-foreground"
                      )}>
                        {index + 1}
                      </span>

                      <span className="flex-1 text-sm">{option.text}</span>

                      {/* Status icons */}
                      {isSelected && isSubmitting && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                      )}
                      {showFeedback && isCorrectOption && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        </motion.div>
                      )}
                      {showFeedback && isSelected && !feedbackData?.is_correct && !isCorrectOption && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback Explanation */}
            <AnimatePresence>
              {showFeedback && feedbackData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    'p-5 rounded-xl mb-8 border overflow-hidden',
                    feedbackData.is_correct
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  <p className={cn(
                    "font-extrabold text-sm mb-2 tracking-tight",
                    feedbackData.is_correct ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {feedbackData.is_correct ? '✓ Correct!' : '✗ Incorrect'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feedbackData.explanation}</p>
                  {feedbackData.xp_earned > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-3 flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-amber-300">+{feedbackData.xp_earned} XP</span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next Button */}
            <AnimatePresence>
              {showFeedback && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={handleNext}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg shadow-primary/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {currentQuestion < quizQuestions.length - 1
                    ? 'Next Question'
                    : 'See Results'}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <div className="h-12" />
      </div>
    </div>
  );
}

