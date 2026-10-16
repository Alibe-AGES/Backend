-- Keep only the first proposal created for each event.
WITH duplicate_proposals AS (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at, id) AS position
    FROM proposal
  ) AS ranked_proposals
  WHERE position > 1
),
deleted_responses AS (
  DELETE FROM proposal_response
  WHERE proposal_id IN (SELECT id FROM duplicate_proposals)
)
DELETE FROM proposal
WHERE id IN (SELECT id FROM duplicate_proposals);

CREATE UNIQUE INDEX "proposal_event_id_key" ON "proposal"("event_id");
