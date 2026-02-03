-- ============================================
-- TukTalk Database Schema (v2 - with fixes)
-- ============================================

-- Enable UUID extension in the extensions schema and make it available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Create a wrapper function in public schema
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS UUID AS $$
  SELECT extensions.uuid_generate_v4();
$$ LANGUAGE SQL;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    current_level INTEGER DEFAULT 1 CHECK (current_level >= 1),
    fluency_score INTEGER DEFAULT 0 CHECK (fluency_score >= 0),
    streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0),
    streak_last_updated DATE,
    total_words_mastered INTEGER DEFAULT 0 CHECK (total_words_mastered >= 0),
    total_time_spent_minutes INTEGER DEFAULT 0 CHECK (total_time_spent_minutes >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

CREATE TYPE subscription_status AS ENUM ('free', 'active', 'cancelled', 'expired');
CREATE TYPE subscription_plan AS ENUM ('free', 'monthly', 'annual');

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan subscription_plan DEFAULT 'free',
    status subscription_status DEFAULT 'free',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE UNIQUE INDEX idx_subscriptions_stripe_customer_id 
    ON public.subscriptions(stripe_customer_id) 
    WHERE stripe_customer_id IS NOT NULL;
    
CREATE UNIQUE INDEX idx_subscriptions_stripe_subscription_id 
    ON public.subscriptions(stripe_subscription_id) 
    WHERE stripe_subscription_id IS NOT NULL;

-- ============================================
-- VOCABULARY
-- ============================================

CREATE TABLE public.vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thai_script TEXT NOT NULL,
    romanization TEXT NOT NULL,
    english_translation TEXT NOT NULL,
    icon_url TEXT,
    audio_url TEXT,
    morpheme_breakdown JSONB,
    part_of_speech TEXT,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocabulary_difficulty ON public.vocabulary(difficulty_level);

-- ============================================
-- STAGES & LEVELS
-- ============================================

CREATE TABLE public.stages (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT
);

CREATE TABLE public.levels (
    id INTEGER PRIMARY KEY,
    stage_id INTEGER NOT NULL REFERENCES public.stages(id),
    level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 30),
    environment_name TEXT NOT NULL,
    is_free BOOLEAN DEFAULT FALSE,
    video_intro_url TEXT,
    cultural_media_url TEXT,
    game_world_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_levels_stage_id ON public.levels(stage_id);
CREATE INDEX idx_levels_is_free ON public.levels(is_free);

CREATE TABLE public.level_vocabulary (
    level_id INTEGER NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
    vocabulary_id UUID NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
    PRIMARY KEY (level_id, vocabulary_id)
);

CREATE INDEX idx_level_vocabulary_vocabulary_id ON public.level_vocabulary(vocabulary_id);

-- ============================================
-- USER PROGRESS
-- ============================================

CREATE TABLE public.user_vocabulary_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vocabulary_id UUID NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
    srs_box INTEGER DEFAULT 1 CHECK (srs_box BETWEEN 1 AND 5),
    times_correct INTEGER DEFAULT 0 CHECK (times_correct >= 0),
    times_incorrect INTEGER DEFAULT 0 CHECK (times_incorrect >= 0),
    last_reviewed TIMESTAMPTZ,
    next_review_date TIMESTAMPTZ,
    is_problem_word BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, vocabulary_id)
);

CREATE INDEX idx_user_vocabulary_progress_user_id ON public.user_vocabulary_progress(user_id);
CREATE INDEX idx_user_vocabulary_progress_vocabulary_id ON public.user_vocabulary_progress(vocabulary_id);
CREATE INDEX idx_user_vocabulary_progress_next_review ON public.user_vocabulary_progress(user_id, next_review_date);

CREATE TYPE level_status AS ENUM ('locked', 'unlocked', 'in_progress', 'completed');

CREATE TABLE public.user_level_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
    status level_status DEFAULT 'locked',
    score INTEGER CHECK (score IS NULL OR score >= 0),
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    completion_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, level_id)
);

CREATE INDEX idx_user_level_progress_user_id ON public.user_level_progress(user_id);
CREATE INDEX idx_user_level_progress_level_id ON public.user_level_progress(level_id);

-- ============================================
-- INFLUENCER / REFERRAL SYSTEM
-- ============================================

CREATE TABLE public.influencers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 30.00 CHECK (commission_rate BETWEEN 0 AND 100),
    recurring_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (recurring_rate BETWEEN 0 AND 100),
    cookie_days INTEGER DEFAULT 30 CHECK (cookie_days > 0),
    total_referrals INTEGER DEFAULT 0 CHECK (total_referrals >= 0),
    total_earnings DECIMAL(10,2) DEFAULT 0 CHECK (total_earnings >= 0),
    stripe_connect_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_influencers_user_id ON public.influencers(user_id);
CREATE INDEX idx_influencers_code ON public.influencers(code);
CREATE UNIQUE INDEX idx_influencers_stripe_connect_id 
    ON public.influencers(stripe_connect_id) 
    WHERE stripe_connect_id IS NOT NULL;

CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE RESTRICT,
    referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    discount_applied DECIMAL(5,2) CHECK (discount_applied IS NULL OR discount_applied BETWEEN 0 AND 100),
    commission_paid DECIMAL(10,2) DEFAULT 0 CHECK (commission_paid >= 0),
    attributed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    UNIQUE(referred_user_id)
);

CREATE INDEX idx_referrals_influencer_id ON public.referrals(influencer_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);

-- ============================================
-- SOCIAL / VIRAL FEATURES
-- ============================================

CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT CHECK (category IN ('streak', 'vocabulary', 'level', 'social')),
    requirement_value INTEGER CHECK (requirement_value > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    shared_at TIMESTAMPTZ,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);

CREATE TABLE public.leaderboard (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    display_name TEXT,
    fluency_score INTEGER DEFAULT 0 CHECK (fluency_score >= 0),
    streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0),
    words_mastered INTEGER DEFAULT 0 CHECK (words_mastered >= 0),
    rank INTEGER CHECK (rank IS NULL OR rank > 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_fluency_score ON public.leaderboard(fluency_score DESC);
CREATE INDEX idx_leaderboard_rank ON public.leaderboard(rank);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Vocabulary progress policies
CREATE POLICY "Users can view own vocabulary progress" ON public.user_vocabulary_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vocabulary progress" ON public.user_vocabulary_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vocabulary progress" ON public.user_vocabulary_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Level progress policies
CREATE POLICY "Users can view own level progress" ON public.user_level_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own level progress" ON public.user_level_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own level progress" ON public.user_level_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON public.user_achievements
    FOR UPDATE USING (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "Users can view own referral" ON public.referrals
    FOR SELECT USING (auth.uid() = referred_user_id);

-- Influencers policies
CREATE POLICY "Anyone can view active influencers" ON public.influencers
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Influencers can view own record" ON public.influencers
    FOR SELECT USING (auth.uid() = user_id);

-- Public content policies
CREATE POLICY "Anyone can view vocabulary" ON public.vocabulary FOR SELECT USING (true);
CREATE POLICY "Anyone can view stages" ON public.stages FOR SELECT USING (true);
CREATE POLICY "Anyone can view levels" ON public.levels FOR SELECT USING (true);
CREATE POLICY "Anyone can view level_vocabulary" ON public.level_vocabulary FOR SELECT USING (true);
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    first_free_level INTEGER;
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    
    INSERT INTO public.subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'free', 'free');
    
    SELECT id INTO first_free_level
    FROM public.levels
    WHERE is_free = TRUE
    ORDER BY level_number ASC
    LIMIT 1;
    
    IF first_free_level IS NOT NULL THEN
        INSERT INTO public.user_level_progress (user_id, level_id, status)
        VALUES (NEW.id, first_free_level, 'unlocked');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_leaderboard_updated_at
    BEFORE UPDATE ON public.leaderboard
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO public.stages (id, name, description, goal) VALUES
(1, 'Survival Thai', 'Essential phrases for tourists and new expats', 'Functional in 72 hours for basic scenarios'),
(2, 'Social Connection', 'Build relationships and express preferences', 'Handle social situations confidently'),
(3, 'Daily Life Mastery', 'Handle routine tasks independently', 'Navigate daily life in Thailand'),
(4, 'Cultural Depth', 'Understand Thai social hierarchy', 'Navigate implicit communication'),
(5, 'Fluency Building', 'Express complex ideas', 'Master tense and aspect'),
(6, 'Mastery & Specialization', 'Near-native fluency', 'Specialized vocabulary paths');

INSERT INTO public.levels (id, stage_id, level_number, environment_name, is_free, game_world_config) VALUES
(1, 1, 1, 'Airport Arrival', TRUE, '{"mechanic": "dialogue_branching", "scene": "airport"}'),
(2, 1, 2, 'TukTuk Ride', FALSE, '{"mechanic": "map_navigation", "scene": "tuktuk"}'),
(3, 1, 3, 'Street Food Stall', FALSE, '{"mechanic": "transaction_simulator", "scene": "food_stall"}'),
(4, 1, 4, '7-Eleven', FALSE, '{"mechanic": "item_selection", "scene": "convenience_store"}'),
(5, 1, 5, 'Hotel Check-In', FALSE, '{"mechanic": "roleplay_conversation", "scene": "hotel"}'),
(6, 2, 6, 'Coffee Shop', TRUE, '{"mechanic": "conversation_tree", "scene": "coffee_shop"}'),
(7, 2, 7, 'Coworking Space', FALSE, '{"mechanic": "speed_meeting", "scene": "coworking"}'),
(8, 2, 8, 'Weekend Market', FALSE, '{"mechanic": "haggling_simulator", "scene": "market"}'),
(9, 2, 9, 'Yoga Studio', FALSE, '{"mechanic": "follow_instructor", "scene": "yoga"}'),
(10, 2, 10, 'Rooftop Bar', FALSE, '{"mechanic": "story_building", "scene": "bar"}');

INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('สวัสดี', 'sa-wat-dii', 'Hello', 'greeting', 1),
('ครับ', 'khrap', 'Polite particle (male)', 'particle', 1),
('ค่ะ', 'kha', 'Polite particle (female)', 'particle', 1),
('ขอบคุณ', 'khawp-khun', 'Thank you', 'phrase', 1),
('ผม', 'phom', 'I/me (male)', 'pronoun', 1),
('ฉัน', 'chan', 'I/me (female/informal)', 'pronoun', 1),
('คุณ', 'khun', 'You (polite)', 'pronoun', 1),
('ใช่', 'chai', 'Yes/correct', 'adverb', 1),
('ไม่ใช่', 'mai-chai', 'No/not correct', 'adverb', 1),
('ไม่', 'mai', 'No/not', 'adverb', 1),
('ชื่อ', 'cheu', 'Name', 'noun', 1),
('อะไร', 'a-rai', 'What', 'question', 1),
('ยินดีที่ได้รู้จัก', 'yin-dii-thii-dai-ruu-jak', 'Nice to meet you', 'phrase', 1),
('สนามบิน', 'sa-naam-bin', 'Airport', 'noun', 1),
('แท็กซี่', 'taek-sii', 'Taxi', 'noun', 1);

INSERT INTO public.achievements (name, description, category, requirement_value) VALUES
('First Steps', 'Complete your first lesson', 'level', 1),
('Week Warrior', 'Maintain a 7-day streak', 'streak', 7),
('Month Master', 'Maintain a 30-day streak', 'streak', 30),
('Word Collector', 'Learn 50 words', 'vocabulary', 50),
('Vocabulary Virtuoso', 'Learn 100 words', 'vocabulary', 100),
('Survival Speaker', 'Complete Stage 1', 'level', 5),
('Social Butterfly', 'Complete Stage 2', 'level', 10),
('Share the Love', 'Share an achievement on social media', 'social', 1);

