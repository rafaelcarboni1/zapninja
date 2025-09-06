-- Migration: 001_advanced_features.sql
-- Description: Adds advanced database features for ZAPNINJA
-- Created: 2025-09-05
-- Author: AI Code Generator v3.3

-- This migration adds advanced indexing, views, and performance optimizations
-- to the existing ZAPNINJA database schema.

BEGIN;

-- ==================================================
-- STEP 1: ADD ADVANCED COMPOSITE INDEXES
-- ==================================================

-- Composite index for frequent conversation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created_desc 
ON messages(conversation_id, created_at DESC);

-- Composite index for user context filtering  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_context_user_session_type 
ON user_context(user_id, session_id, context_type);

-- Composite index for session metrics analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_metrics_session_type_time 
ON system_metrics(session_id, metric_type, recorded_at DESC);

-- Composite index for learning data analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_data_user_interaction_time 
ON learning_data(user_id, interaction_type, created_at DESC);

-- Composite index for admin commands auditing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_commands_session_command_time 
ON admin_commands(session_id, command_name, created_at DESC);

-- ==================================================
-- STEP 2: ADD PARTIAL INDEXES FOR FILTERED QUERIES
-- ==================================================

-- Index only active sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_sessions_active_only 
ON whatsapp_sessions(session_name, phone_number) 
WHERE is_active = true;

-- Index only active users  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_users_active_only 
ON whatsapp_users(phone_number, name) 
WHERE is_active = true;

-- Index only non-expired context
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_context_non_expired 
ON user_context(user_id, session_id, relevance_score DESC) 
WHERE expires_at IS NULL OR expires_at > NOW();

-- Index only recent messages (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recent 
ON messages(conversation_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- ==================================================
-- STEP 3: CREATE MATERIALIZED VIEWS FOR ANALYTICS
-- ==================================================

-- Session activity summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_session_activity AS
SELECT 
  s.id as session_id,
  s.session_name,
  s.is_active,
  COUNT(DISTINCT c.user_id) as unique_users,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.sender_type = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN m.sender_type = 'ai' THEN 1 END) as ai_messages,
  MAX(c.last_interaction) as last_activity,
  AVG(CASE WHEN sm.metric_type = 'response_time' 
      THEN (sm.metric_value->>'value')::numeric END) as avg_response_time
FROM whatsapp_sessions s
LEFT JOIN conversations c ON s.id = c.session_id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN system_metrics sm ON s.id = sm.session_id
GROUP BY s.id, s.session_name, s.is_active;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_session_activity_session_id 
ON mv_session_activity(session_id);

-- User engagement summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_engagement AS
SELECT 
  u.id as user_id,
  u.phone_number,
  u.name,
  COUNT(DISTINCT c.session_id) as sessions_used,
  COUNT(m.id) as total_messages_sent,
  COUNT(CASE WHEN m.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as messages_last_7_days,
  COUNT(CASE WHEN m.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as messages_last_30_days,
  MAX(m.created_at) as last_message_date,
  AVG(ld.feedback_score) as avg_feedback_score
FROM whatsapp_users u
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id AND m.sender_type = 'user'
LEFT JOIN learning_data ld ON u.id = ld.user_id
GROUP BY u.id, u.phone_number, u.name;

-- Create unique index for user engagement view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_engagement_user_id 
ON mv_user_engagement(user_id);

-- ==================================================
-- STEP 4: ADD ADVANCED ANALYTICS FUNCTIONS
-- ==================================================

-- Function to get user conversation context
CREATE OR REPLACE FUNCTION get_user_conversation_context(
  p_user_id UUID,
  p_session_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  message_content TEXT,
  sender_type VARCHAR(20),
  message_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE,
  context_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.content,
    m.sender_type,
    m.message_type,
    m.created_at,
    uc.context_data
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  LEFT JOIN user_context uc ON uc.user_id = c.user_id 
    AND uc.session_id = c.session_id
  WHERE c.user_id = p_user_id 
    AND c.session_id = p_session_id
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate session health score
CREATE OR REPLACE FUNCTION calculate_session_health_score(p_session_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  health_score NUMERIC := 0;
  message_count INTEGER;
  error_count INTEGER;
  avg_response_time NUMERIC;
  user_satisfaction NUMERIC;
BEGIN
  -- Get message count in last 24 hours
  SELECT COUNT(*) INTO message_count
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE c.session_id = p_session_id
    AND m.created_at > NOW() - INTERVAL '24 hours';
  
  -- Get error count from system metrics
  SELECT COUNT(*) INTO error_count
  FROM system_metrics sm
  WHERE sm.session_id = p_session_id
    AND sm.metric_type = 'error'
    AND sm.recorded_at > NOW() - INTERVAL '24 hours';
  
  -- Get average response time
  SELECT AVG((metric_value->>'value')::numeric) INTO avg_response_time
  FROM system_metrics sm
  WHERE sm.session_id = p_session_id
    AND sm.metric_type = 'response_time'
    AND sm.recorded_at > NOW() - INTERVAL '24 hours';
  
  -- Get user satisfaction from learning data
  SELECT AVG(feedback_score) INTO user_satisfaction
  FROM learning_data ld
  WHERE ld.session_id = p_session_id
    AND ld.created_at > NOW() - INTERVAL '7 days';
  
  -- Calculate health score (0-100)
  health_score := GREATEST(0, LEAST(100,
    -- Message activity (25 points max)
    LEAST(25, message_count * 0.5) +
    -- Low error rate (25 points max)
    GREATEST(0, 25 - error_count * 5) +
    -- Response time (25 points max)
    CASE 
      WHEN avg_response_time IS NULL THEN 25
      WHEN avg_response_time <= 2000 THEN 25
      WHEN avg_response_time <= 5000 THEN 15
      ELSE 5
    END +
    -- User satisfaction (25 points max)
    COALESCE(user_satisfaction * 5, 20)
  ));
  
  RETURN health_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- STEP 5: ADD MAINTENANCE FUNCTIONS
-- ==================================================

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Delete old system metrics
  DELETE FROM system_metrics 
  WHERE recorded_at < NOW() - INTERVAL '1 day' * retention_days;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete expired user context
  DELETE FROM user_context 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old learning data (keep last 30 days regardless)
  DELETE FROM learning_data 
  WHERE created_at < NOW() - INTERVAL '1 day' * GREATEST(retention_days, 30);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Refresh materialized views
  REFRESH MATERIALIZED VIEW mv_session_activity;
  REFRESH MATERIALIZED VIEW mv_user_engagement;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to optimize database performance
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
BEGIN
  -- Analyze all tables to update statistics
  ANALYZE whatsapp_sessions;
  ANALYZE whatsapp_users;
  ANALYZE conversations;
  ANALYZE messages;
  ANALYZE user_context;
  ANALYZE admin_commands;
  ANALYZE system_metrics;
  ANALYZE learning_data;
  
  result := 'Database optimization completed. Statistics updated for all tables.';
  
  -- Refresh materialized views
  REFRESH MATERIALIZED VIEW mv_session_activity;
  REFRESH MATERIALIZED VIEW mv_user_engagement;
  
  result := result || ' Materialized views refreshed.';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- STEP 6: ADD MONITORING VIEWS
-- ==================================================

-- System performance monitoring view
CREATE OR REPLACE VIEW v_system_performance AS
SELECT 
  DATE_TRUNC('hour', sm.recorded_at) as hour_bucket,
  s.session_name,
  sm.metric_type,
  AVG((sm.metric_value->>'value')::numeric) as avg_value,
  MAX((sm.metric_value->>'value')::numeric) as max_value,
  MIN((sm.metric_value->>'value')::numeric) as min_value,
  COUNT(*) as sample_count
FROM system_metrics sm
JOIN whatsapp_sessions s ON sm.session_id = s.id
WHERE sm.recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', sm.recorded_at), s.session_name, sm.metric_type
ORDER BY hour_bucket DESC, s.session_name, sm.metric_type;

-- Daily conversation summary view
CREATE OR REPLACE VIEW v_daily_conversations AS
SELECT 
  DATE(c.last_interaction) as conversation_date,
  s.session_name,
  COUNT(DISTINCT c.user_id) as unique_users,
  COUNT(c.id) as total_conversations,
  COUNT(CASE WHEN c.last_interaction > c.created_at + INTERVAL '5 minutes' THEN 1 END) as engaged_conversations,
  AVG(
    (SELECT COUNT(*) FROM messages m 
     WHERE m.conversation_id = c.id AND m.sender_type = 'user')
  ) as avg_messages_per_conversation
FROM conversations c
JOIN whatsapp_sessions s ON c.session_id = s.id
WHERE c.last_interaction > NOW() - INTERVAL '30 days'
GROUP BY DATE(c.last_interaction), s.session_name
ORDER BY conversation_date DESC, s.session_name;

-- Performance monitoring views
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'Unused'
    WHEN idx_scan < 100 THEN 'Low Usage'
    WHEN idx_scan < 1000 THEN 'Medium Usage'
    ELSE 'High Usage'
  END as usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Table sizes view
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMIT;

-- ==================================================
-- POST-MIGRATION VERIFICATION
-- ==================================================

-- Verify all indexes were created
SELECT 'Advanced indexes created successfully' as migration_status
WHERE EXISTS (
  SELECT 1 FROM pg_indexes 
  WHERE indexname = 'idx_messages_conversation_created_desc'
);

-- Verify materialized views were created
SELECT 'Materialized views created successfully' as migration_status
WHERE EXISTS (
  SELECT 1 FROM pg_matviews 
  WHERE matviewname = 'mv_session_activity'
);

-- Initial refresh of materialized views
REFRESH MATERIALIZED VIEW mv_session_activity;
REFRESH MATERIALIZED VIEW mv_user_engagement;