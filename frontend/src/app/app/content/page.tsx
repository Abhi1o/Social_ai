'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus,
  Calendar,
  Clock,
  Image,
  Video,
  FileText,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Eye,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const tabs = [
  { id: 'composer', label: 'Composer', icon: Plus },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'queue', label: 'Queue', icon: Clock },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'published', label: 'Published', icon: TrendingUp },
];

const mockPosts = [
  {
    id: 1,
    content: 'Excited to announce our new AI-powered features! 🚀 Transform your social media strategy with intelligent automation.',
    platforms: ['instagram', 'twitter', 'linkedin'],
    status: 'scheduled',
    scheduledAt: '2024-01-15T14:30:00Z',
    mediaType: 'image',
    engagement: { likes: 245, comments: 32, shares: 18 },
    aiGenerated: true
  },
  {
    id: 2,
    content: 'Behind the scenes: How our team builds amazing products. Check out our latest blog post for insights! 💡',
    platforms: ['linkedin', 'facebook'],
    status: 'published',
    publishedAt: '2024-01-14T10:00:00Z',
    mediaType: 'video',
    engagement: { likes: 189, comments: 24, shares: 12 },
    aiGenerated: false
  },
  {
    id: 3,
    content: 'Quick tip: Use AI to optimize your posting times for maximum engagement. Here\'s what we learned...',
    platforms: ['twitter', 'instagram'],
    status: 'draft',
    mediaType: 'carousel',
    aiGenerated: true
  },
  {
    id: 4,
    content: 'Customer success story: How @company increased their social media ROI by 300% using our platform 📈',
    platforms: ['linkedin'],
    status: 'scheduled',
    scheduledAt: '2024-01-16T09:00:00Z',
    mediaType: 'image',
    aiGenerated: true
  }
];

const platformIcons = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
};

const platformColors = {
  instagram: 'from-pink-500 to-purple-500',
  twitter: 'from-blue-400 to-blue-600',
  linkedin: 'from-blue-600 to-blue-800',
  facebook: 'from-blue-500 to-indigo-600',
};

export default function ContentPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('composer');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const filteredPosts = mockPosts.filter(post =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Content Hub</h1>
          <p className="text-gray-400">Create, schedule, and manage your social media content</p>
        </div>
        <Button className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 glass-card p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white/20 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'composer' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Create New Post</CardTitle>
            <CardDescription className="text-gray-400">
              Use AI to create engaging content for your audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Platform Selection */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Select Platforms
              </label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(platformIcons).map(([platform, Icon]) => (
                  <button
                    key={platform}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg glass-button hover:bg-white/20 transition-colors`}
                  >
                    <div className={`w-5 h-5 rounded bg-gradient-to-r ${platformColors[platform]} flex items-center justify-center`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white capitalize">{platform}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Input */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Content
              </label>
              <textarea
                placeholder="What's on your mind? Let AI help you create amazing content..."
                className="w-full h-32 glass-input resize-none"
              />
            </div>

            {/* Media Upload */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Media
              </label>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 transition-colors cursor-pointer">
                <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">
                  Drag & drop images or videos, or click to browse
                </p>
              </div>
            </div>

            {/* AI Options */}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
              <Button variant="secondary">
                <TrendingUp className="w-4 h-4 mr-2" />
                AI Optimize
              </Button>
              <Button variant="secondary">
                <Copy className="w-4 h-4 mr-2" />
                AI Variations
              </Button>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <div className="flex space-x-3">
                <Button variant="secondary">Save Draft</Button>
                <Button variant="secondary">Schedule</Button>
              </div>
              <Button className="gradient-primary">
                Publish Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab !== 'composer' && (
        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="secondary" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="glass">
                {filteredPosts.length} posts
              </Badge>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="glass-card hover:scale-105 transition-transform duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {post.platforms.map((platform) => {
                          const Icon = platformIcons[platform];
                          return (
                            <div
                              key={platform}
                              className={`w-6 h-6 rounded bg-gradient-to-r ${platformColors[platform]} flex items-center justify-center`}
                            >
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            post.status === 'published' ? 'success' :
                            post.status === 'scheduled' ? 'warning' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {post.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm line-clamp-3">
                      {post.content}
                    </p>
                    
                    {post.aiGenerated && (
                      <Badge variant="glass" className="text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                    
                    {post.status === 'scheduled' && post.scheduledAt && (
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(post.scheduledAt).toLocaleDateString()} at{' '}
                          {new Date(post.scheduledAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    )}
                    
                    {post.engagement && (
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>❤️ {post.engagement.likes}</span>
                        <span>💬 {post.engagement.comments}</span>
                        <span>🔄 {post.engagement.shares}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        {post.mediaType === 'image' && <Image className="w-4 h-4 text-gray-400" />}
                        {post.mediaType === 'video' && <Video className="w-4 h-4 text-gray-400" />}
                        {post.mediaType === 'carousel' && <FileText className="w-4 h-4 text-gray-400" />}
                        <span className="text-xs text-gray-400 capitalize">{post.mediaType}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}