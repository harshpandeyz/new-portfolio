-- Remove analytics records that belonged to the retired chat mode.
DELETE FROM "AnalyticsEvent" WHERE "type" = 'interview_turn';
