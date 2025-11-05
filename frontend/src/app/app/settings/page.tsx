'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User,
  Building,
  Sparkles,
  Link as LinkIcon,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Globe,
  Moon,
  Sun,
  Monitor,
  Save,
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';

const settingsTabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Building },
  { id: 'ai', label: 'AI Settings', icon: Sparkles },
  { id: 'platforms', label: 'Platforms', icon: LinkIcon },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const connectedPlatforms = [
  { name: 'Instagram', connected: true, accounts: 2, status: 'active' },
  { name: 'Twitter', connected: true, accounts: 1, status: 'active' },
  { name: 'LinkedIn', connected: true, accounts: 1, status: 'active' },
  { name: 'Facebook', connected: false, accounts: 0, status: 'disconnected' },
  { name: 'TikTok', connected: false, accounts: 0, status: 'disconnected' },
  { name: 'YouTube', connected: true, accounts: 1, status: 'warning' },
];

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const { theme, setTheme } = useUIStore();
  const { user, tenant } = useAuthStore();

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
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardContent className="p-4">
              <nav className="space-y-2">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeTab === 'account' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your personal account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    defaultValue={user?.firstName || ''}
                    placeholder="Enter your first name"
                  />
                  <Input
                    label="Last Name"
                    defaultValue={user?.lastName || ''}
                    placeholder="Enter your last name"
                  />
                </div>
                <Input
                  label="Email Address"
                  type="email"
                  defaultValue={user?.email || ''}
                  placeholder="Enter your email"
                />
                <div>
                  <label className="text-sm font-medium text-white mb-3 block">
                    Profile Picture
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <Button variant="secondary">Change Picture</Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="gradient-primary">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'workspace' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Workspace Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure your workspace preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Input
                  label="Workspace Name"
                  defaultValue={tenant?.name || ''}
                  placeholder="Enter workspace name"
                />
                <div>
                  <label className="text-sm font-medium text-white mb-3 block">
                    Current Plan
                  </label>
                  <div className="flex items-center justify-between p-4 rounded-lg glass border border-white/10">
                    <div>
                      <p className="text-white font-medium capitalize">{tenant?.planTier} Plan</p>
                      <p className="text-gray-400 text-sm">Full access to all features</p>
                    </div>
                    <Button variant="secondary">Upgrade</Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white mb-3 block">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'auto', label: 'Auto', icon: Monitor },
                    ].map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => setTheme({ mode: themeOption.id as any })}
                        className={`flex flex-col items-center space-y-2 p-4 rounded-lg border transition-all ${
                          theme.mode === themeOption.id
                            ? 'border-primary bg-primary/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <themeOption.icon className="w-6 h-6 text-white" />
                        <span className="text-sm text-white">{themeOption.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'platforms' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Connected Platforms</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your social media platform connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connectedPlatforms.map((platform) => (
                    <div key={platform.name} className="flex items-center justify-between p-4 rounded-lg glass border border-white/10">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{platform.name}</p>
                          <p className="text-gray-400 text-sm">
                            {platform.connected 
                              ? `${platform.accounts} account${platform.accounts > 1 ? 's' : ''} connected`
                              : 'Not connected'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={
                            platform.status === 'active' ? 'success' :
                            platform.status === 'warning' ? 'warning' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {platform.status}
                        </Badge>
                        <Button
                          variant={platform.connected ? 'secondary' : 'default'}
                          size="sm"
                        >
                          {platform.connected ? 'Manage' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'ai' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">AI Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Customize your AI agents and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-white mb-3 block">
                    AI Budget Limit
                  </label>
                  <div className="flex items-center space-x-4">
                    <Input
                      type="number"
                      defaultValue="500"
                      placeholder="Monthly budget in USD"
                      className="flex-1"
                    />
                    <span className="text-gray-400">USD/month</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Current usage: $127.50 (25.5% of budget)
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-white mb-3 block">
                    Content Generation Style
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'professional', label: 'Professional' },
                      { id: 'casual', label: 'Casual' },
                      { id: 'creative', label: 'Creative' },
                      { id: 'bold', label: 'Bold' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        className="p-3 rounded-lg glass border border-white/10 hover:border-white/20 transition-colors text-left"
                      >
                        <p className="text-white font-medium">{style.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white mb-3 block">
                    Automation Level
                  </label>
                  <div className="space-y-3">
                    {[
                      { id: 'manual', label: 'Manual', desc: 'AI suggests, you approve' },
                      { id: 'assisted', label: 'Assisted', desc: 'AI creates, you review' },
                      { id: 'autonomous', label: 'Autonomous', desc: 'AI handles everything' },
                    ].map((level) => (
                      <label key={level.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="automation"
                          className="text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-white font-medium">{level.label}</p>
                          <p className="text-gray-400 text-sm">{level.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Notification Preferences</CardTitle>
                <CardDescription className="text-gray-400">
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                  { id: 'push', label: 'Push Notifications', desc: 'Browser and mobile notifications' },
                  { id: 'digest', label: 'Daily Digest', desc: 'Summary of daily activities' },
                  { id: 'alerts', label: 'Performance Alerts', desc: 'Notifications for significant changes' },
                ].map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{notification.label}</p>
                      <p className="text-gray-400 text-sm">{notification.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}