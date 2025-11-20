export interface InfluencerMetrics {
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
}

export interface AudienceAuthenticity {
  score: number;
  suspiciousFollowers: number;
  realFollowers: number;
  botPercentage: number;
  factors: {
    followerGrowthPattern: number;
    engagementConsistency: number;
    followerQuality: number;
    commentQuality: number;
  };
}

export interface InfluencerScore {
  overall: number;
  reach: number;
  engagement: number;
  authenticity: number;
  relevance: number;
  consistency: number;
}

export interface InfluencerAnalysisResult {
  platform: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  metrics: InfluencerMetrics;
  authenticityAnalysis: AudienceAuthenticity;
  score: InfluencerScore;
  niche: string[];
  audienceData: {
    demographics: {
      ageGroups: Record<string, number>;
      genderSplit: Record<string, number>;
      topLocations: Array<{ location: string; percentage: number }>;
    };
    interests: string[];
  };
  recentPosts: Array<{
    id: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    postedAt: Date;
  }>;
  recommendations: string[];
}
