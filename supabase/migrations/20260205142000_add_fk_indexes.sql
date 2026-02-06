-- =====================================================
-- Add indexes for foreign key columns (performance)
-- =====================================================

-- levels.stage_id
CREATE INDEX IF NOT EXISTS idx_levels_stage_id ON public.levels(stage_id);

-- influencers.user_id
CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON public.influencers(user_id);

-- referrals.influencer_id (referred_user_id already indexed by UNIQUE)
CREATE INDEX IF NOT EXISTS idx_referrals_influencer_id ON public.referrals(influencer_id);

-- user_vocabulary_progress.vocabulary_id (user_id covered by UNIQUE(user_id, vocabulary_id))
CREATE INDEX IF NOT EXISTS idx_user_vocabulary_progress_vocabulary_id ON public.user_vocabulary_progress(vocabulary_id);

-- user_level_progress.level_id (user_id covered by UNIQUE(user_id, level_id))
CREATE INDEX IF NOT EXISTS idx_user_level_progress_level_id ON public.user_level_progress(level_id);

-- user_achievements.achievement_id (user_id covered by UNIQUE(user_id, achievement_id))
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
