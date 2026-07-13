import { useParams, Link } from 'wouter';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Link as LinkIcon, Calendar, ArrowLeft, MessageCircle } from 'lucide-react';
import { PostCard } from '@/components/feed/Post';
import { format } from 'date-fns';

export default function Profile() {
  const { id } = useParams();
  const { currentUser, users, posts } = useAppStore();
  
  const profileId = id || currentUser?.id;
  const profile = profileId ? users[profileId] : null;
  const isOwnProfile = currentUser?.id === profileId;

  if (!profile) return <div className="p-8 text-center">User not found</div>;

  const userPosts = posts.filter(p => p.authorId === profile.id);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-1 max-w-2xl border-r border-border/50 min-h-screen pb-20">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 glass px-4 py-2 flex items-center gap-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="font-display font-bold text-xl leading-tight">{profile.displayName}</h2>
            <p className="text-xs text-muted-foreground">{userPosts.length} posts</p>
          </div>
        </div>

        {/* Cover Photo */}
        <div className="h-32 md:h-48 bg-muted relative">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-primary/40 to-accent/20" />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="flex justify-between items-start -mt-12 md:-mt-16 mb-4 relative z-10">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background bg-background shadow-xl">
              <AvatarImage src={profile.avatarUrl} />
              <AvatarFallback className="text-3xl">{profile.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="mt-14 md:mt-16">
              {isOwnProfile ? (
                <Button variant="outline" className="rounded-full font-medium">Edit profile</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-full"><MessageCircle className="w-4 h-4" /></Button>
                  <Button className="rounded-full font-medium px-6">Follow</Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="font-display font-bold text-2xl flex items-center gap-1">
              {profile.displayName}
              {profile.verified && (
                <svg className="w-5 h-5 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
            </h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>

          {profile.bio && (
            <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-y-2 gap-x-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>San Francisco, CA</span>
            </div>
            <div className="flex items-center gap-1">
              <LinkIcon className="w-4 h-4" />
              <a href="#" className="text-primary hover:underline">alexrivera.design</a>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Joined September 2023</span>
            </div>
          </div>

          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex gap-1 hover:underline cursor-pointer">
              <span className="font-bold text-foreground">{profile.following}</span>
              <span className="text-muted-foreground">Following</span>
            </div>
            <div className="flex gap-1 hover:underline cursor-pointer">
              <span className="font-bold text-foreground">{profile.followers.toLocaleString()}</span>
              <span className="text-muted-foreground">Followers</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full mt-2">
          <TabsList className="w-full bg-transparent h-12 p-0 rounded-none grid grid-cols-4 border-b border-border/50">
            {['Posts', 'Replies', 'Media', 'Likes'].map((tab) => (
              <TabsTrigger 
                key={tab}
                value={tab.toLowerCase()} 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium h-full text-muted-foreground data-[state=active]:text-foreground"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="posts" className="m-0 focus-visible:outline-none">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="py-20 text-center text-muted-foreground">
                <h3 className="font-display font-medium text-xl mb-2 text-foreground">No posts yet</h3>
                <p>When they post, it will show up here.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="replies" className="m-0 p-8 text-center text-muted-foreground">Replies feed</TabsContent>
          <TabsContent value="media" className="m-0 p-8 text-center text-muted-foreground">Media grid</TabsContent>
          <TabsContent value="likes" className="m-0 p-8 text-center text-muted-foreground">Liked posts</TabsContent>
        </Tabs>
      </div>
      
      {/* Right Sidebar */}
      <div className="hidden lg:block w-[350px] p-4 space-y-6">
        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
          <h3 className="font-display font-medium text-lg mb-4">You might like</h3>
          <div className="space-y-4">
            {Object.values(users).filter(u => u.id !== profile.id && u.id !== currentUser?.id).slice(0, 3).map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate hover:underline cursor-pointer">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="rounded-full">Follow</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

