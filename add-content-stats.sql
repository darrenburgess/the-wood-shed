-- Add practice_count and last_practiced columns to content table

ALTER TABLE content
ADD COLUMN IF NOT EXISTS practice_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_practiced DATE;

-- Update existing content with actual counts and dates
UPDATE content
SET
  practice_count = COALESCE(stats.count, 0),
  last_practiced = stats.last_date
FROM (
  SELECT
    c.id as content_id,
    COUNT(DISTINCT COALESCE(l1.id, l2.id)) as count,
    MAX(COALESCE(l1.date, l2.date)) as last_date
  FROM content c
  -- Logs via goals with content (through goal_content join table)
  LEFT JOIN goal_content gc ON gc.content_id = c.id
  LEFT JOIN logs l1 ON l1.goal_id = gc.goal_id
  -- Direct logs via log_content table
  LEFT JOIN log_content lc ON lc.content_id = c.id
  LEFT JOIN logs l2 ON l2.id = lc.log_id
  GROUP BY c.id
) stats
WHERE content.id = stats.content_id;
