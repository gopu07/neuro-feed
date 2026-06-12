import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Loader2 } from 'lucide-react';
import { useExploreTrending, useExploreSearch } from '@/hooks/useExplore';
import { LearningCard } from '@/components/Card/LearningCard';
import { useNavigate } from 'react-router-dom';
import { useCardInteraction } from '@/hooks/useFeed';
import { toast } from 'sonner';

const topics = [
  { name: 'LLMs', icon: '🤖' },
  { name: 'Agents', icon: '🎯' },
  { name: 'RAG', icon: '📚' },
  { name: 'MLOps', icon: '⚙️' },
  { name: 'Robotics', icon: '🤖' },
  { name: 'Vision', icon: '👁️' },
  { name: 'Diffusion', icon: '🎨' },
  { name: 'Open Source', icon: '🔓' },
];

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { mutate: interact } = useCardInteraction();
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  
  const { data: trendingCards, isLoading: isLoadingTrending } = useExploreTrending();
  const { data: searchResults, isLoading: isLoadingSearch } = useExploreSearch(searchQuery);

  const isSearching = searchQuery.length >= 2;

  const handleSaveCard = (id: string) => {
    setSavedCards((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
        interact({ cardId: id, action: 'unsave', dwellSeconds: 0 });
      } else {
        updated.add(id);
        interact({ cardId: id, action: 'save', dwellSeconds: 0 });
        toast.success("Card saved to profile!");
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">Explore</h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search topics, concepts, papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-6xl mx-auto">
        {isSearching ? (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6">
              Search Results
            </h2>
            {isLoadingSearch ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : searchResults?.length === 0 ? (
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            ) : (
              <div className="space-y-6 max-w-2xl">
                {searchResults?.map((card: any, index: number) => (
                  <LearningCard
                    key={card.id}
                    {...card}
                    isSaved={savedCards.has(card.id)}
                    onSave={handleSaveCard}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Topics Section */}
            <div className="mb-12">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Popular Topics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topics.map((topic, index) => (
                  <motion.button
                    key={topic.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-xl bg-card/50 border border-border hover:bg-card/80 hover:border-primary transition-smooth text-center group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={() => setSearchQuery(topic.name)}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                      {topic.icon}
                    </div>
                    <h3 className="font-bold text-foreground text-sm">
                      {topic.name}
                    </h3>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Trending Section */}
            <div className="mb-12">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Trending Now
              </h2>
              {isLoadingTrending ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {trendingCards?.map((item: any, index: number) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/content/${item.id}`)}
                      className="p-5 rounded-lg bg-card/30 border border-border hover:bg-card/50 transition-smooth cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/content/${item.id}`);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {item.title}
                          </h3>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>🔥 {item.upvotes || 0} upvotes</span>
                            <span>{item.domain}</span>
                          </div>
                        </div>
                        <Zap className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Collections */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-6">
                Featured Collections
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: 'AI Safety Fundamentals',
                    searchTerm: 'Safety',
                    items: 24,
                    image: '🛡️',
                  },
                  {
                    title: 'Building Production LLM Apps',
                    searchTerm: 'LLM',
                    items: 32,
                    image: '🏭',
                  },
                  {
                    title: 'Research Paper Analysis',
                    searchTerm: 'Research',
                    items: 18,
                    image: '📖',
                  },
                ].map((collection, index) => (
                  <motion.div
                    key={collection.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSearchQuery(collection.searchTerm)}
                    className="p-6 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border hover:border-primary transition-smooth cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSearchQuery(collection.searchTerm);
                      }
                    }}
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                      {collection.image}
                    </div>
                    <h3 className="font-bold text-foreground mb-2">
                      {collection.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {collection.items} learning cards
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="h-10" />
      </div>
    </div>
  );
}
