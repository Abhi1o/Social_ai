import { CsvExporter } from './csv-exporter';
import { PostStatus, Platform } from '@prisma/client';

describe('CsvExporter', () => {
  describe('exportPostsToCsv', () => {
    it('should export posts to CSV format', () => {
      const posts = [
        {
          id: 'post-1',
          content: {
            text: 'Test post content',
            hashtags: ['tag1', 'tag2'],
            mentions: ['@user1'],
            link: 'https://example.com',
            firstComment: 'First comment',
          },
          platformPosts: [
            {
              platform: Platform.INSTAGRAM,
              accountId: 'account-1',
              account: { username: 'testuser' },
            },
          ],
          status: PostStatus.PUBLISHED,
          scheduledAt: new Date('2024-12-25T10:00:00Z'),
          publishedAt: new Date('2024-12-25T10:00:00Z'),
          mediaAssets: [{ media: { id: 'media-1' } }],
          campaignId: 'campaign-1',
          campaign: { name: 'Test Campaign' },
          tags: ['marketing'],
          aiGenerated: false,
          createdAt: new Date('2024-12-20T10:00:00Z'),
          updatedAt: new Date('2024-12-20T10:00:00Z'),
        },
      ];

      const csv = CsvExporter.exportPostsToCsv(posts);

      expect(csv).toContain('ID,Text,Platforms');
      expect(csv).toContain('post-1');
      expect(csv).toContain('Test post content');
      expect(csv).toContain('INSTAGRAM');
      expect(csv).toContain('testuser');
      expect(csv).toContain('PUBLISHED');
    });

    it('should handle posts with multiple platforms', () => {
      const posts = [
        {
          id: 'post-1',
          content: { text: 'Multi-platform post' },
          platformPosts: [
            {
              platform: Platform.INSTAGRAM,
              accountId: 'account-1',
              account: { username: 'user1' },
            },
            {
              platform: Platform.FACEBOOK,
              accountId: 'account-2',
              account: { username: 'user2' },
            },
          ],
          status: PostStatus.SCHEDULED,
          mediaAssets: [],
          tags: [],
          aiGenerated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const csv = CsvExporter.exportPostsToCsv(posts);

      expect(csv).toContain('INSTAGRAM,FACEBOOK');
      expect(csv).toContain('user1,user2');
    });

    it('should handle empty posts array', () => {
      const csv = CsvExporter.exportPostsToCsv([]);

      expect(csv).toContain('ID,Text,Platforms');
      expect(csv.split('\n').length).toBe(2); // Header + empty line
    });
  });

  describe('exportPostsToJson', () => {
    it('should export posts to JSON format', () => {
      const posts = [
        {
          id: 'post-1',
          content: { text: 'Test post' },
          status: PostStatus.DRAFT,
        },
      ];

      const json = CsvExporter.exportPostsToJson(posts);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('post-1');
      expect(parsed[0].content.text).toBe('Test post');
    });
  });
});
