import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Hash, MapPin, Calendar, MoreVertical, Bell } from 'lucide-react';

export default function Communities() {
  const { communities, toggleCommunityMembership } = useAppStore();

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-1 max-w-3xl border-r border-border/50 min-h-screen p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl">Communities</h1>
            <p className="text-muted-foreground">Find your people. Dive into your interests.</p>
          </div>
          <Button className="rounded-full font-medium">Create Community</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communities.map((community, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={community.id} 
              className="group rounded-2xl border border-border/50 overflow-hidden bg-card hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="h-24 bg-muted relative">
                <img src={community.coverUrl} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-5 relative">
                <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center -mt-10 mb-3 shadow-lg border border-border text-2xl">
                  {community.name.charAt(0)}
                </div>
                <h3 className="font-display font-medium text-lg leading-tight group-hover:text-primary transition-colors">{community.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4 line-clamp-2">{community.description}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{community.members.toLocaleString()} members</span>
                  </div>
                  <Button
                    variant={community.isMember ? "secondary" : "default"}
                    size="sm"
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCommunityMembership(community.id);
                    }}
                  >
                    {community.isMember ? 'Joined' : 'Join'}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Right Sidebar */}
      <div className="hidden lg:block w-[350px] p-4 space-y-6">
        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
          <h3 className="font-display font-medium text-lg mb-4">Your Communities</h3>
          <div className="space-y-3">
            {communities.filter(c => c.isMember).map((community) => (
              <div key={community.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-xl cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {community.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate text-sm">{community.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">2 new posts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
