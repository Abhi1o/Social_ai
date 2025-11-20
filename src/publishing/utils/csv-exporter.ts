import { stringify } from 'csv-stringify/sync';

export interface PostExportData {
  id: string;
  text: string;
  platforms: string;
  accountIds: string;
  accountNames: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  hashtags?: string;
  mentions?: string;
  link?: string;
  firstComment?: string;
  mediaCount: number;
  campaignId?: string;
  campaignName?: string;
  tags?: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CsvExporter {
  /**
   * Export posts to CSV format
   */
  static exportPostsToCsv(posts: any[]): string {
    const exportData: PostExportData[] = posts.map(post => this.transformPostForExport(post));

    const csv = stringify(exportData, {
      header: true,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'text', header: 'Text' },
        { key: 'platforms', header: 'Platforms' },
        { key: 'accountIds', header: 'Account IDs' },
        { key: 'accountNames', header: 'Account Names' },
        { key: 'status', header: 'Status' },
        { key: 'scheduledAt', header: 'Scheduled At' },
        { key: 'publishedAt', header: 'Published At' },
        { key: 'hashtags', header: 'Hashtags' },
        { key: 'mentions', header: 'Mentions' },
        { key: 'link', header: 'Link' },
        { key: 'firstComment', header: 'First Comment' },
        { key: 'mediaCount', header: 'Media Count' },
        { key: 'campaignId', header: 'Campaign ID' },
        { key: 'campaignName', header: 'Campaign Name' },
        { key: 'tags', header: 'Tags' },
        { key: 'aiGenerated', header: 'AI Generated' },
        { key: 'createdAt', header: 'Created At' },
        { key: 'updatedAt', header: 'Updated At' },
      ],
    });

    return csv;
  }

  /**
   * Transform post data for export
   */
  private static transformPostForExport(post: any): PostExportData {
    const content = post.content || {};
    const platformPosts = post.platformPosts || [];
    const mediaAssets = post.mediaAssets || [];

    return {
      id: post.id,
      text: content.text || '',
      platforms: platformPosts.map((pp: any) => pp.platform).join(','),
      accountIds: platformPosts.map((pp: any) => pp.accountId).join(','),
      accountNames: platformPosts.map((pp: any) => pp.account?.username || '').join(','),
      status: post.status,
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString() : undefined,
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      hashtags: content.hashtags ? content.hashtags.join(',') : undefined,
      mentions: content.mentions ? content.mentions.join(',') : undefined,
      link: content.link,
      firstComment: content.firstComment,
      mediaCount: mediaAssets.length,
      campaignId: post.campaignId,
      campaignName: post.campaign?.name,
      tags: post.tags ? post.tags.join(',') : undefined,
      aiGenerated: post.aiGenerated || false,
      createdAt: new Date(post.createdAt).toISOString(),
      updatedAt: new Date(post.updatedAt).toISOString(),
    };
  }

  /**
   * Export posts to JSON format
   */
  static exportPostsToJson(posts: any[]): string {
    return JSON.stringify(posts, null, 2);
  }
}
