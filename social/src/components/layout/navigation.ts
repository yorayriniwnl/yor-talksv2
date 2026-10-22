import {
  House, Activity, Compass, Film, Globe2, MessageCircle, Bell, UserRound, Users,
  FileText, WandSparkles, Video, Radio, Megaphone, Scissors, Trophy, Swords,
  Gamepad2, Target, Award, Medal, Calendar, BarChart3, Store, ShoppingCart,
  Briefcase, Shirt, Layers, ShoppingBag, Coins, Ticket, Shield, Building2,
  HandCoins, Crown, Star, Brain, LayoutDashboard, Settings, Headphones, Mic2,
  KeyRound, Gauge, Bookmark, FolderKanban, CreditCard, Sparkles, Flag,
} from 'lucide-react';

// Shared by the feature menu and global search so every destination is reachable
// on touch screens as well as by keyboard.
export const navigationGroups = [
  { label: 'Your everyday', items: [
    { icon: House, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: Film, label: 'Reels', path: '/videos' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: KeyRound, label: 'Private messages', path: '/private-messages' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Bookmark, label: 'Saved', path: '/saved' },
    { icon: UserRound, label: 'Your profile', path: '/profile' },
  ] },
  { label: 'Find your people', items: [
    { icon: Globe2, label: 'Worlds', path: '/worlds' },
    { icon: Activity, label: 'Pulse', path: '/pulse' },
    { icon: Users, label: 'Communities', path: '/communities' },
    { icon: Megaphone, label: 'Broadcast Channels', path: '/channels' },
    { icon: Radio, label: 'Live', path: '/live' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: FileText, label: 'Articles', path: '/articles' },
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: Headphones, label: 'Lounge', path: '/lounge' },
    { icon: Crown, label: 'Fan Club', path: '/fanclub' },
    { icon: Mic2, label: 'Squad Comms', path: '/comms' },
    { icon: KeyRound, label: 'Custom Rooms', path: '/rooms' },
    { icon: Radio, label: 'Podcasts', path: '/podcasts' },
  ] },
  { label: 'Make something', items: [
    { icon: WandSparkles, label: 'Dream Engine', path: '/dream' },
    { icon: Video, label: 'Creator Studio', path: '/studio' },
    { icon: Gauge, label: 'Control Room', path: '/control-room' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: ShoppingCart, label: 'Creator Store', path: '/store' },
    { icon: Scissors, label: 'Clip Studio', path: '/clips' },
    { icon: Briefcase, label: 'Media Kit', path: '/media-kit' },
    { icon: Shirt, label: 'Merch Studio', path: '/merch' },
    { icon: Layers, label: 'Overlay Studio', path: '/overlays' },
    { icon: Brain, label: 'AI Assistant', path: '/ai' },
  ] },
  { label: 'Play together', items: [
    { icon: Trophy, label: 'Tournaments', path: '/tournaments' },
    { icon: Swords, label: 'Scrims', path: '/scrims' },
    { icon: Shield, label: 'Clans', path: '/clans' },
    { icon: Gamepad2, label: 'Arcade', path: '/arcade' },
    { icon: Target, label: 'Predictions', path: '/predictions' },
    { icon: Star, label: 'Achievements', path: '/achievements' },
    { icon: Award, label: 'Power Rankings', path: '/rankings' },
    { icon: Medal, label: 'Trophy Room', path: '/trophies' },
    { icon: Calendar, label: 'Esports Calendar', path: '/calendar' },
    { icon: Ticket, label: 'Battle Pass', path: '/pass' },
  ] },
  { label: 'Shops & work', items: [
    { icon: Store, label: 'Marketplace', path: '/marketplace' },
    { icon: ShoppingBag, label: 'Game Bazaar', path: '/bazaar' },
    { icon: HandCoins, label: 'Bounties', path: '/bounties' },
    { icon: Building2, label: 'Clan Treasury', path: '/treasury' },
    { icon: Coins, label: 'Points Shop', path: '/points-shop' },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Briefcase, label: 'Business', path: '/business' },
  ] },
  { label: 'Make it yours', items: [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: Sparkles, label: 'Yor Advanced', path: '/advanced' },
    { icon: Crown, label: 'Premium', path: '/premium' },
    { icon: CreditCard, label: 'Billing', path: '/billing' },
    { icon: Shield, label: 'Account eligibility', path: '/eligibility' },
    { icon: Shield, label: 'Moderation', path: '/moderation' },
    { icon: Flag, label: 'Report a concern', path: '/grievance' },
  ] },
];

export function isNavigationActive(location: string, path: string) {
  const pathname = location.split('?')[0];
  return pathname === path || path !== '/' && pathname.startsWith(`${path}/`);
}

export const OPEN_SEARCH_EVENT = 'yor:open-search';
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}
