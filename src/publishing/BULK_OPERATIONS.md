# Bulk Operations

This document describes the bulk operations functionality for the publishing system.

## Features

### 1. Bulk Schedule from CSV
Upload a CSV file to schedule multiple posts at once.

**Endpoint:** `POST /api/posts/bulk/schedule`

**CSV Format:**
```csv
text,platforms,accountIds,scheduledAt,hashtags,mentions,link,firstComment,mediaIds,campaignId,tags
"Post content",INSTAGRAM,account-uuid,2024-12-25T10:00:00Z,"tag1,tag2","@user1",https://example.com,"Comment","media-uuid","campaign-uuid","tag1,tag2"
```

**Required Fields:**
- `text`: Post content
- `platforms`: Comma-separated platform names (INSTAGRAM, FACEBOOK, TWITTER, etc.)
- `accountIds`: Comma-separated account UUIDs (must match platforms count)

**Optional Fields:**
- `scheduledAt`: ISO 8601 date string
- `hashtags`: Comma-separated hashtags
- `mentions`: Comma-separated mentions
- `link`: URL to include
- `firstComment`: First comment (Instagram)
- `mediaIds`: Comma-separated media asset UUIDs
- `campaignId`: Campaign UUID
- `tags`: Comma-separated tags

### 2. Bulk Edit
Edit multiple posts at once.

**Endpoint:** `PUT /api/posts/bulk/edit`

**Request Body:**
```json
{
  "postIds": ["post-uuid-1", "post-uuid-2"],
  "scheduledAt": "2024-12-25T10:00:00Z",
  "platforms": ["INSTAGRAM", "FACEBOOK"],
  "status": "SCHEDULED",
  "tags": ["updated", "bulk"],
  "campaignId": "campaign-uuid"
}
```

### 3. Bulk Delete
Delete multiple posts at once.

**Endpoint:** `DELETE /api/posts/bulk/delete`

**Request Body:**
```json
{
  "postIds": ["post-uuid-1", "post-uuid-2"],
  "confirmed": true
}
```

**Note:** `confirmed` must be `true` to proceed with deletion.

### 4. Export Posts
Export posts to CSV format.

**Endpoint:** `GET /api/posts/export`

**Query Parameters:**
- `status`: Filter by post status
- `platform`: Filter by platform
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `campaignId`: Filter by campaign
- `postIds`: Comma-separated post IDs to export

**Response:** CSV file download

### 5. Get CSV Template
Download a CSV template for bulk scheduling.

**Endpoint:** `GET /api/posts/bulk/template`

**Response:** CSV template file

## Usage Examples

### Bulk Schedule with cURL
```bash
curl -X POST http://localhost:3000/api/posts/bulk/schedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@posts.csv"
```

### Bulk Edit with cURL
```bash
curl -X PUT http://localhost:3000/api/posts/bulk/edit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "postIds": ["post-1", "post-2"],
    "scheduledAt": "2024-12-25T10:00:00Z",
    "tags": ["updated"]
  }'
```

### Export Posts with cURL
```bash
curl -X GET "http://localhost:3000/api/posts/export?status=PUBLISHED" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o posts-export.csv
```

## Error Handling

All bulk operations return detailed results including:
- `success`: Overall operation success
- `totalPosts`: Total number of posts processed
- `successCount`: Number of successful operations
- `failureCount`: Number of failed operations
- `results`: Array of individual results with errors

Example response:
```json
{
  "success": false,
  "totalPosts": 3,
  "successCount": 2,
  "failureCount": 1,
  "results": [
    { "index": 0, "success": true, "postId": "post-123" },
    { "index": 1, "success": true, "postId": "post-456" },
    { "index": 2, "success": false, "error": "Invalid account" }
  ]
}
```
