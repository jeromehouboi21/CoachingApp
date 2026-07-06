-- Fix: 'beta' fehlte als gültiger feedback_type — jeder Insert aus dem
-- Beta-Feedback-Modal (ProfileScreen) schlug bisher an diesem Constraint fehl.

ALTER TABLE user_feedback DROP CONSTRAINT user_feedback_feedback_type_check;
ALTER TABLE user_feedback ADD CONSTRAINT user_feedback_feedback_type_check
  CHECK (feedback_type IN ('improvement', 'praise', 'bug', 'general', 'beta'));
