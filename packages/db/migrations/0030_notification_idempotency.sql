WITH ranked_notifications AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY member_id, event_id, template_key
      ORDER BY
        CASE status
          WHEN 'sent' THEN 0
          WHEN 'queued' THEN 1
          ELSE 2
        END,
        created_at DESC,
        id
    ) AS duplicate_rank
  FROM notifications
)
DELETE FROM notifications
WHERE id IN (
  SELECT id
  FROM ranked_notifications
  WHERE duplicate_rank > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_member_event_template_idx" ON "notifications" USING btree ("member_id","event_id","template_key");
