import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, FileText, Lightbulb, Loader2, ArrowRight, BookOpen, Clock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RoadmapStep {
  title: string;
  desc: string;
  time: string;
}

export default function AiLabs() {
  // Chat Assistant State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Ask me anything about machine learning models, training pipelines, or concepts!' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatLoading]);

  // Paper Summarizer State
  const [paperInput, setPaperInput] = useState('');
  const [paperSummary, setPaperSummary] = useState<string | null>(null);
  const [isPaperLoading, setIsPaperLoading] = useState(false);

  // Concept Explainer State
  const [conceptInput, setConceptInput] = useState('');
  const [conceptExplanation, setConceptExplanation] = useState<string | null>(null);
  const [isConceptLoading, setIsConceptLoading] = useState(false);

  // Roadmap Generator State
  const [roadmapSkill, setRoadmapSkill] = useState('');
  const [roadmapLevel, setRoadmapLevel] = useState('beginner');
  const [roadmapSteps, setRoadmapSteps] = useState<RoadmapStep[] | null>(null);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);

  // Handle Chat Submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await api.post('/api/labs/chat', { message: userMessage });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to get chat response');
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I hit a connection issue. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle Paper Summarize
  const handlePaperSummarize = async () => {
    if (!paperInput.trim() || isPaperLoading) return;
    setIsPaperLoading(true);
    setPaperSummary(null);

    try {
      const response = await api.post('/api/labs/summarize', { url_or_text: paperInput });
      setPaperSummary(response.data.summary);
      toast.success('Paper summary processed!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Summarization failed');
    } finally {
      setIsPaperLoading(false);
    }
  };

  // Handle Concept Explain
  const handleConceptExplain = async () => {
    if (!conceptInput.trim() || isConceptLoading) return;
    setIsConceptLoading(true);
    setConceptExplanation(null);

    try {
      const response = await api.post('/api/labs/explain', { concept: conceptInput });
      setConceptExplanation(response.data.explanation);
      toast.success('Concept analogical breakdown completed!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Concept explanation failed');
    } finally {
      setIsConceptLoading(false);
    }
  };

  // Handle Roadmap Generate
  const handleRoadmapGenerate = async () => {
    if (!roadmapSkill.trim() || isRoadmapLoading) return;
    setIsRoadmapLoading(true);
    setRoadmapSteps(null);

    try {
      const response = await api.post('/api/labs/roadmap', { skill: roadmapSkill, level: roadmapLevel });
      setRoadmapSteps(response.data.steps || []);
      toast.success('Personalized training roadmap generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Roadmap generation failed');
    } finally {
      setIsRoadmapLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-secondary" />
            AI Labs
          </h1>
          <p className="text-muted-foreground">
            Your personal AI workspace for deeper research & customized training roadmaps
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Chat Assistant */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border min-h-[450px] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-secondary animate-pulse" />
                  <h2 className="text-xl font-bold text-foreground">AI Assistant</h2>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-secondary/20 text-secondary border border-secondary/30 rounded-md">Real-Time</span>
              </div>
              
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 scroll-smooth scrollbar-thin scrollbar-thumb-white/10">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap break-words transition-all ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-auto shadow-md shadow-primary/10' 
                        : 'bg-secondary/15 text-muted-foreground border border-secondary/20 shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl max-w-[150px] flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                    Assistant is typing...
                  </div>
                )}
                {/* Scroll Anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <form onSubmit={handleChatSubmit} className="mt-auto pt-4 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a technical ML query..."
                disabled={isChatLoading}
                className="flex-1 px-4 py-3 bg-white/5 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-sm disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={isChatLoading || !chatInput.trim()}
                className="px-4 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-lg transition-colors text-sm flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </motion.div>

          {/* Paper Summarizer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border min-h-[450px] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">arXiv Paper Summarizer</h2>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded-md">Real-Time</span>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Drop a technical paper abstract or paste an arXiv link below to parse core architectural objectives and engineer insights:
                </p>
                {paperSummary ? (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap animate-in fade-in duration-300">
                    {paperSummary}
                  </div>
                ) : isPaperLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs">Analyzing paper contents...</span>
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={paperInput}
                    onChange={(e) => setPaperInput(e.target.value)}
                    placeholder="Paste arXiv link or paper abstract text here..."
                    className="w-full p-4 bg-white/5 border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                )}
              </div>
            </div>
            
            <div className="mt-auto pt-4">
              {paperSummary ? (
                <button 
                  onClick={() => setPaperSummary(null)}
                  className="w-full py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-lg transition-colors text-sm cursor-pointer"
                >
                  Analyze Another Paper
                </button>
              ) : (
                <button 
                  onClick={handlePaperSummarize}
                  disabled={isPaperLoading || !paperInput.trim()}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Summarize Paper
                </button>
              )}
            </div>
          </motion.div>

          {/* Concept Explainer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border min-h-[450px] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-bold text-foreground">Concept Explainer (ELI5)</h2>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-md">Real-Time</span>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Type a complex AI topic (e.g. "Contrastive Learning", "KV Caching") and get an intuitive analogy-based simple breakdown:
                </p>
                {conceptExplanation ? (
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap animate-in fade-in duration-300">
                    {conceptExplanation}
                  </div>
                ) : isConceptLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                    <span className="text-xs">Generating simple analogies...</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={conceptInput}
                    onChange={(e) => setConceptInput(e.target.value)}
                    placeholder="Enter an AI/ML concept (e.g. Diffusion models)..."
                    className="w-full px-4 py-3 bg-white/5 border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                )}
              </div>
            </div>
            
            <div className="mt-auto pt-4">
              {conceptExplanation ? (
                <button 
                  onClick={() => setConceptExplanation(null)}
                  className="w-full py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-lg transition-colors text-sm cursor-pointer"
                >
                  Explain New Concept
                </button>
              ) : (
                <button 
                  onClick={handleConceptExplain}
                  disabled={isConceptLoading || !conceptInput.trim()}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Explain intuitive style
                </button>
              )}
            </div>
          </motion.div>

          {/* Roadmap Generator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-card border border-border min-h-[450px] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-between justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                  <h2 className="text-xl font-bold text-foreground">Roadmap Generator</h2>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-secondary/20 text-secondary border border-secondary/30 rounded-md">Real-Time</span>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Input an ML target domain and select your tier level to output a step-by-step chronological roadmap timeline:
                </p>
                {roadmapSteps ? (
                  <div className="space-y-3.5 animate-in fade-in duration-300">
                    {roadmapSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 items-start bg-white/5 p-3 rounded-lg border border-border">
                        <div className="w-7 h-7 rounded-full bg-secondary/20 text-secondary border border-secondary/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-bold text-foreground text-sm leading-none">{step.title}</h4>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-border">
                              <Clock className="w-3 h-3 text-secondary" />
                              {step.time}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isRoadmapLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                    <span className="text-xs">Generating learning milestones...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={roadmapSkill}
                      onChange={(e) => setRoadmapSkill(e.target.value)}
                      placeholder="Target skill (e.g. Fine-tuning LLMs)..."
                      className="w-full px-4 py-3 bg-white/5 border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                    />
                    <select
                      value={roadmapLevel}
                      onChange={(e) => setRoadmapLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-border rounded-lg text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent cursor-pointer"
                    >
                      <option value="beginner">Beginner Track</option>
                      <option value="intermediate">Intermediate Track</option>
                      <option value="advanced">Advanced Track</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-auto pt-4">
              {roadmapSteps ? (
                <button 
                  onClick={() => setRoadmapSteps(null)}
                  className="w-full py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-lg transition-colors text-sm cursor-pointer"
                >
                  Generate New Roadmap
                </button>
              ) : (
                <button 
                  onClick={handleRoadmapGenerate}
                  disabled={isRoadmapLoading || !roadmapSkill.trim()}
                  className="w-full py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Steps
                </button>
              )}
            </div>
          </motion.div>

        </div>
        <div className="h-12" />
      </div>
    </div>
  );
}
