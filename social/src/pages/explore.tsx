import { useState } from 'react';
import { Search, TrendingUp, History, Hash, Users, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';

export default function Explore() {
  const [query, setQuery] = useState('');
  const { users } = useAppStore();

  const trendingTags = [
    { tag: 'DesignSystems', posts: '12.4K', trend: '+15%' },
    { tag: 'Frontend', posts: '8.2K', trend: '+5%' },
    { tag: 'ReactConf2024', posts: '5.1K', trend: 'New' },
    { tag: 'UIUX', posts: '3.9K', trend: '+22%' },
    { tag: 'TechTwitter', posts: '2.4K', trend: '-2%' },
  ];

  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x border-border/50 bg-background">
      <div className="sticky top-0 z-20 glass px-4 py-3 border-b border-border/50">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, people, or communities" 
            className="pl-10 bg-muted/50 border-none rounded-full h-10 text-base" 
          />
        </div>
      </div>

      {!query ? (
        <div className="p-4 space-y-8">
          <section>
            <h3 className="font-display font-medium text-lg flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-muted-foreground" />
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {['react server components', 'alex rivera', '#uiux', 'linear design'].map((item, i) => (
                <div key={i} className="px-4 py-2 rounded-full bg-muted/50 text-sm hover:bg-muted cursor-pointer transition-colors">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-display font-medium text-lg flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trending on Yor Talks
            </h3>
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
              {trendingTags.map((trend, i) => (
                <div key={i} className="p-4 flex justify-between items-center hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">#{trend.tag}</p>
                      <p className="text-sm text-muted-foreground">{trend.posts} posts</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${trend.trend.startsWith('+') || trend.trend === 'New' ? 'text-green-500' : 'text-red-500'}`}>
                    {trend.trend}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-display font-medium text-lg flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              Suggested People
            </h3>
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
              {Object.values(users).slice(0, 3).map((user) => (
                <div key={user.id} className="p-4 flex justify-between items-center hover:bg-muted/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                  <button className="bg-secondary text-secondary-foreground px-4 py-1.5 rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-4 opacity-50" />
          <p>Searching Yor Talks for "{query}"...</p>
        </div>
      )}
    </div>
  );
}
