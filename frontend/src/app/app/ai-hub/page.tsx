'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Brain, 
  Target, 
  MessageSquare, 
  BarChart3, 
  TrendingUp, 
  Users,
  Play,
  Pause,
  Settings,
  Zap,
  Activity,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const aiAgents = [
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Generates engaging content for all platforms',
    icon: Brain,
    status: 'active',
    performance: 94,
    tasksCompleted: 1247,
    color: 'from-purple-500 to-pink-500',
    currentTask: 'Creating Instagram carousel for product launch',
    capabilities: ['Text Generation', 'Hashtag Research', 'Platform Optimization']
  },
  {
    id: 'strategy-agent',
    name: 'Strategy Agent',
    description: 'Analyzes performance and optimizes strategy',
    icon: Target,
    status: 'active',
    performance: 89,
    tasksCompleted: 892,
    color: 'from-blue-500 to-cyan-500',
    currentTask: 'Analyzing competitor content strategy',
    capabilities: ['Performance Analysis', 'Strategy Optimization', 'Trend Prediction']
  },
  {
    id: 'engagement-agent',
    name: 'Engagement Agent',
    description: 'Monitors and responds to social interactions',
    icon: MessageSquare,
    status: 'active',
    performance: 96,
    tasksCompleted: 2156,
    color: 'from-green-500 to-emerald-500',
    currentTask: 'Responding to customer inquiries',
    capabilities: ['Auto-Response', 'Sentiment Analysis', 'Community Management']
  },
  {
    id: 'analytics-agent',
    name: 'Analytics Agent',
    description: 'Processes data and generates insights',
    icon: BarChart3,
    status: 'idle',
    performance: 91,
    tasksCompleted: 743,
    color: 'from-orange-500 to-red-500',
    currentTask: 'Generating weekly performance report',
    capabilities: ['Data Processing', 'Insight Generation', 'Report Creation']
  },
  {
    id: 'trend-agent',
    name: 'Trend Detection',
    description: 'Identifies trending topics and opportunities',
    icon: TrendingUp,
    status: 'active',
    performance: 87,
    tasksCompleted: 634,
    color: 'from-indigo-500 to-purple-500',
    currentTask: 'Monitoring industry trends',
    capabilities: ['Trend Analysis', 'Opportunity Detection', 'Market Research']
  },
  {
    id: 'competitor-agent',
    name: 'Competitor Analysis',
    description: 'Tracks competitor activities and strategies',
    icon: Users,
    status: 'active',
    performance: 92,
    tasksCompleted: 521,
    color: 'from-pink-500 to-rose-500',
    currentTask: 'Analyzing competitor posting patterns',
    capabilities: ['Competitor Tracking', 'Strategy Analysis', 'Benchmarking']
  }
];

const activityFeed = [
  {
    id: 1,
    agent: 'Content Creator',
    action: 'Generated 5 Instagram captions',
    time: '2 minutes ago',
    status: 'completed',
    icon: CheckCircle
  },
  {
    id: 2,
    agent: 'Engagement Agent',
    action: 'Responded to 12 customer messages',
    time: '5 minutes ago',
    status: 'completed',
    icon: CheckCircle
  },
  {
    id: 3,
    agent: 'Strategy Agent',
    action: 'Optimized posting schedule',
    time: '15 minutes ago',
    status: 'completed',
    icon: CheckCircle
  },
  {
    id: 4,
    agent: 'Trend Detection',
    action: 'Identified new trending hashtag',
    time: '23 minutes ago',
    status: 'alert',
    icon: AlertCircle
  },
  {
    id: 5,
    agent: 'Analytics Agent',
    action: 'Processing weekly metrics',
    time: '1 hour ago',
    status: 'in-progress',
    icon: Activity
  }
];

export default function AIHubPage() {
  const [mounted, setMounted] = useState(false);

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
          <h1 className="text-3xl font-bold text-white mb-2">AI Command Center</h1>
          <p className="text-gray-400">Monitor and manage your AI agents</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="success" className="px-3 py-1">
            <Activity className="w-4 h-4 mr-2" />
            5 Agents Active
          </Badge>
          <Button variant="secondary">
            <Settings className="w-4 h-4 mr-2" />
            Configure Agents
          </Button>
        </div>
      </div>

      {/* AI Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">AI Budget Used</p>
                <p className="text-2xl font-bold text-white">$127.50</p>
                <p className="text-xs text-gray-500">of $500.00</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Tasks Completed</p>
                <p className="text-2xl font-bold text-white">6,193</p>
                <p className="text-xs text-green-400">+23% this week</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">1.2s</p>
                <p className="text-xs text-green-400">-0.3s improved</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-white">94.2%</p>
                <p className="text-xs text-green-400">+1.2% this week</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Agents Grid */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">AI Agents</CardTitle>
              <CardDescription className="text-gray-400">
                Your AI team working 24/7 to optimize your social media
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiAgents.map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="p-4 rounded-lg glass border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${agent.color} flex items-center justify-center`}>
                        <agent.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={agent.status === 'active' ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {agent.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          {agent.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <h3 className="text-white font-semibold mb-1">{agent.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{agent.description}</p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Performance</span>
                        <span className="text-white">{agent.performance}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-gradient-to-r ${agent.color}`}
                          style={{ width: `${agent.performance}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-2">
                      Current Task: {agent.currentTask}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Tasks: {agent.tasksCompleted.toLocaleString()}</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Activity Feed</CardTitle>
              <CardDescription className="text-gray-400">
                Real-time AI agent activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityFeed.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'completed' ? 'bg-green-500/20' :
                      activity.status === 'alert' ? 'bg-yellow-500/20' :
                      'bg-blue-500/20'
                    }`}>
                      <activity.icon className={`w-4 h-4 ${
                        activity.status === 'completed' ? 'text-green-400' :
                        activity.status === 'alert' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{activity.action}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="glass" className="text-xs">
                          {activity.agent}
                        </Badge>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="secondary" className="w-full mt-4">
                View All Activities
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card mt-6">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="secondary" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2" />
                  Train Custom Agent
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Agent Settings
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Performance Report
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Usage & Billing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}