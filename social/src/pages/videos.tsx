import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, MoreVertical } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const MOCK_VIDEOS = [
  { id: 'v1', authorId: 'u3', videoUrl: 'https://picsum.photos/seed/v1/400/700', desc: 'NYC architecture walks.', likes: 12400, comments: 342, shares: 120 },
  { id: 'v2', authorId: 'u1', videoUrl: 'https://picsum.photos/seed/v2/400/700', desc: 'Design process timelapse 🎨', likes: 8900, comments: 210, shares: 45 },
  { id: 'v3', authorId: 'u2', videoUrl: 'https://picsum.photos/seed/v3/400/700', desc: 'Coding setup tour 💻', likes: 4500, comments: 89, shares: 12 },
];

export default function Videos() {
  const { users } = useAppStore();
  const [activeIdx, setActiveIdx] = useState(0);

  // In a real app we'd use intersection observer to snap and play videos.
  // Here we're mocking the UI for shorts-style vertical feed.

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen w-full bg-black flex justify-center snap-y snap-mandatory overflow-y-scroll hide-scrollbar">
      {MOCK_VIDEOS.map((video, i) => {
        const author = users[video.authorId];
        if (!author) return null;
        
        return (
          <div key={video.id} className="h-full w-full max-w-[450px] snap-center relative bg-zinc-900 shrink-0">
            {/* Mock Video Player */}
            <div className="absolute inset-0">
              <img src={video.videoUrl} className="w-full h-full object-cover opacity-80" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

            {/* Right Action Bar */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
              <button className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors text-white">
                  <Heart className="w-6 h-6" />
                </div>
                <span className="text-white text-xs font-medium">{video.likes > 1000 ? (video.likes/1000).toFixed(1) + 'K' : video.likes}</span>
              </button>
              
              <button className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors text-white">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-white text-xs font-medium">{video.comments}</span>
              </button>

              <button className="flex flex-col items-center gap-1 group">
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:bg-black/60 transition-colors text-white">
                  <Share className="w-6 h-6" />
                </div>
                <span className="text-white text-xs font-medium">{video.shares}</span>
              </button>

              <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60 transition-colors text-white mt-4">
                <MoreVertical className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Info */}
            <div className="absolute left-4 bottom-6 right-20 z-10">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10 border border-white/20">
                  <AvatarImage src={author.avatarUrl} />
                  <AvatarFallback>{author.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-white font-medium hover:underline cursor-pointer">{author.displayName}</span>
                <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-medium px-3 py-1 rounded-full transition-colors">
                  Follow
                </button>
              </div>
              <p className="text-white text-[15px]">{video.desc}</p>
              
              <div className="flex items-center gap-2 mt-3 text-white/70 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                <div className="flex overflow-hidden">
                  <span className="animate-marquee whitespace-nowrap">Original Sound - {author.displayName}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
