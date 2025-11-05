'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Target
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const metrics = [
  {
    title: 'Total Reach',
    value: '124.5K',
    change: '+12.3%',
    icon: Eye,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    title: 'Engagement Rate',
    value: '8.2%',
    change: '+2.1%',
    icon: Heart,
    color: 'from-pink-500 to-rose-500'
  },
  {
    title: 'New Followers',
    value: '2,847',
    change: '+18.7%',
    icon: Users,
    color: 'from-green-500 to-emerald-500'
  },
  {
    title: 'Total Posts',
    value: '156',
    change: '+5.2%',
    icon: BarChart3,
    color: 'from-purple-500 to-indigo-500'
  }
];

const topPosts = [
  {
    id: 1,
    content: 'AI-powered social media automation is here! 🚀',
    platform: 'Instagram',
    engagement: 1247,
    reach: 15600,
    date: '2024-01-14'
  },
  {
    id: 2,
    content: 'Behind the scenes: How we build amazing products',
    platform: 'LinkedIn',
    engagement: 892,
    reach: 12300,
    date: '2024-01-13'
  },
  {
    id: 3,
    content: 'Quick tip: Optimize your posting times with AI',
    platform: 'Twitter',
    engagement: 634,
    reach: 8900,
    date: '2024-01-12'
  }
];

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Track your social media performance and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 glass-card p-1">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{metric.title}</p>
                    <p className="text-2xl font-bold text-white">{metric.value}</p>
                    <Badge variant="success" className="text-xs mt-1">
                      {metric.change}
                    </Badge>
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                    <metric.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Performance Overview</CardTitle>
              <CardDescription className="text-gray-400">
                Engagement and reach trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Interactive chart would be rendered here</p>
                  <p className="text-sm">Using Recharts or similar library</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Posts */}
        <div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Posts</CardTitle>
              <CardDescription className="text-gray-400">
                Your best content this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPosts.map((post, index) => (
                  <div key={post.id} className="p-3 rounded-lg glass border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="glass" className="text-xs">
                        {post.platform}
                      </Badge>
                      <span className="text-xs text-gray-500">{post.date}</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3 text-gray-400">
                        <span className="flex items-center">
                          <Heart className="w-3 h-3 mr-1" />
                          {post.engagement}
                        </span>
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {post.reach.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Platform Performance</CardTitle>
            <CardDescription className="text-gray-400">
              Engagement by platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { platform: 'Instagram', engagement: '45%', color: 'from-pink-500 to-purple-500' },
                { platform: 'LinkedIn', engagement: '28%', color: 'from-blue-600 to-blue-800' },
                { platform: 'Twitter', engagement: '18%', color: 'from-blue-400 to-blue-600' },
                { platform: 'Facebook', engagement: '9%', color: 'from-blue-500 to-indigo-600' },
              ].map((item) => (
                <div key={item.platform} className="flex items-center justify-between">
                  <span className="text-white">{item.platform}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${item.color}`}
                        style={{ width: item.engagement }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12">{item.engagement}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">AI Insights</CardTitle>
            <CardDescription className="text-gray-400">
              AI-generated recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-start space-x-2">
                  <Target className="w-4 h-4 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-400 font-medium">Optimization Tip</p>
                    <p className="text-xs text-gray-300">Post between 2-4 PM for 23% higher engagement</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Trend Alert</p>
                    <p className="text-xs text-gray-300">Video content performing 40% better this week</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-start space-x-2">
                  <Activity className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-400 font-medium">Audience Insight</p>
                    <p className="text-xs text-gray-300">Your audience is most active on weekdays</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}