-- Eventos que já aconteceram e em que todos os membros atuais do grupo confirmaram presença
-- (resposta 'yes' na proposta do evento) passam a ser 'confirmed'. Eventos futuros e 'declined'
-- não mudam; daqui em diante o status é recalculado a cada confirmação ou cancelamento.
UPDATE "event" AS e
SET "status" = 'confirmed'
WHERE e."status" = 'pending'
  AND e."timeslot" < now()
  AND EXISTS (SELECT 1 FROM "user_group" AS ug WHERE ug."group_id" = e."group_id")
  AND NOT EXISTS (
    SELECT 1 FROM "user_group" AS ug
    WHERE ug."group_id" = e."group_id"
      AND NOT EXISTS (
        SELECT 1
        FROM "proposal" AS p
        JOIN "proposal_response" AS r ON r."proposal_id" = p."id"
        WHERE p."event_id" = e."id"
          AND r."user_id" = ug."user_id"
          AND r."answer" = 'yes'
      )
  );
