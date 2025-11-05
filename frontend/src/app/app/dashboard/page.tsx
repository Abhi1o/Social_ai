'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Calendar,
  BarChart3,
  Zap,
  Target,
  Plus,
  Settings,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const widgets = [
  {
    id: 'ai-insights',
    title: 'AI Insights',
    description: 'Your daily AI-generated insights',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    data: {
      insights: [
        'Your engagement rate increased 23% this week',
        'Best posting time: 2-4 PM on weekdays',
        'Video content performs 40% better than images'
      ]
    }
  },
  {
    id: 'performance',
    title: 'Performance Overview',
    description: 'Key metrics at a glance',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-500',
    data: {
      metrics: [
        { label: 'Total Reach', value: '124.5K', change: '+12%' },
        { label: 'Engagement', value: '8.2K', change: '+23%' },
        { label: 'Followers', value: '45.2K', change: '+5%' }
      ]
    }
  },
  {
    id: 'quick-composer',
    title: 'Quick Composer',
    description: 'Create content with AI',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    data: null
  },
  {
    id: 'schedule',
    title: 'Today\'s Schedule',
    description: 'Upcoming posts',
    icon: Calendar,
    color: 'from-orange-500 to-red-500',
    data: {
      posts: [
        { time: '2:00 PM', platform: 'Instagram', content: 'New product launch announcement' },
        { time: '4:30 PM', platform: 'Twitter', content: 'Industry insights thread' },
        { time: '6:00 PM', platform: 'LinkedIn', content: 'Company culture post' }
      ]
    }
  },
  {
    id: 'inbox',
    title: 'Social Inbox',
    description: 'Recent messages',
    icon: MessageSquare,
    color: 'from-indigo-500 to-purple-500',
    data: {
      messages: [
        { platform: 'Instagram', user: '@sarah_m', message: 'Love your latest post!', time: '5m ago' },
        { platform: 'Twitter', user: '@john_doe', message: 'Great insights, thanks for sharing', time: '12m ago' },
        { platform: 'LinkedIn', user: 'Mike Johnson', message: 'Interested in collaboration', time: '1h ago' }
      ]
    }
  },
  {
    id: 'agents',
    title: 'AI Agents Activity',
    description: 'Your AI team at work',
    icon: Users,
    color: 'from-pink-500 to-rose-500',
    data: {
      agents: [
        { name: 'Content Creator', status: 'active', task: 'Generating Instagram captions' },
        { name: 'Strategy Agent', status: 'active', task: 'Analyzing competitor content' },
        { name: 'Engagement Agent', status: 'idle', task: 'Monitoring mentions' }
      ]
    }
  }
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Good morning! 👋</h1>
            <p className="text-gray-400">Here's what's happening with your social media today</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="secondary" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button variant="secondary" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget, index) => (
          <motion.div
            key={widget.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="glass-card h-full hover:scale-105 transition-transform duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${widget.color} flex items-center justify-center`}>
                    <widget.icon className="w-5 h-5 text-white" />
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="text-white">{widget.title}</CardTitle>
                <CardDescription className="text-gray-400">{widget.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                {widget.id === 'ai-insights' && widget.data && (
                  <div className="space-y-3">
                    {widget.data.insights.map((insight, i) => (
                      <div key={i} className="flex items-start space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-300">{insight}</p>
                      </div>
                    ))}
                  </div>
                )}

                {widget.id === 'performance' && widget.data && (
                  <div className="space-y-4">
                    {widget.data.metrics.map((metric, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{metric.label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-semibold">{metric.value}</span>
                          <Badge variant="success" className="text-xs">
                            {metric.change}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {widget.id === 'quick-composer' && (
                  <div className="space-y-4">
                    <textarea 
                      placeholder="What's on your mind? Let AI help you create amazing content..."
                      className="w-full h-20 glass-input resize-none text-sm"
                    />
                    <Button className="w-full">
                      <Zap className="w-4 h-4 mr-2" />
                      Generate with AI
                    </Button>
                  </div>
                )}

                {widget.id === 'schedule' && widget.data && (
                  <div className="space-y-3">
                    {widget.data.posts.map((post, i) => (
                      <div key={i} className="flex items-center space-x-3 p-2 rounded-lg bg-white/5">
                        <div className="text-xs text-purple-400 font-medium">{post.time}</div>
                        <Badge variant="glass" className="text-xs">{post.platform}</Badge>
                        <p className="text-sm text-gray-300 truncate flex-1">{post.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {widget.id === 'inbox' && widget.data && (
                  <div className="space-y-3">
                    {widget.data.messages.map((message, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="glass" className="text-xs">{message.platform}</Badge>
                            <span className="text-xs text-gray-400">{message.user}</span>
                          </div>
                          <span className="text-xs text-gray-500">{message.time}</span>
                        </div>
                        <p className="text-sm text-gray-300">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {widget.id === 'agents' && widget.data && (
                  <div className="space-y-3">
                    {widget.data.agents.map((agent, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <div>
                          <p className="text-sm text-white font-medium">{agent.name}</p>
                          <p className="text-xs text-gray-400">{agent.task}</p>
                        </div>
                        <Badge 
                          variant={agent.status === 'active' ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {agent.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="secondary" className="h-20 flex-col">
                <Plus className="w-6 h-6 mb-2" />
                Create Post
              </Button>
              <Button variant="secondary" className="h-20 flex-col">
                <Calendar className="w-6 h-6 mb-2" />
                Schedule Content
              </Button>
              <Button variant="secondary" className="h-20 flex-col">
                <BarChart3 className="w-6 h-6 mb-2" />
                View Analytics
              </Button>
              <Button variant="secondary" className="h-20 flex-col">
                <Target className="w-6 h-6 mb-2" />
                AI Optimization
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}