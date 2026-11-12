-- Pairwise drug-drug interactions (DDInter / TWOSIDES import)
-- CRITICAL SAFETY RULE: Enforces canonical integer ordering (ingredient_a < ingredient_b)
-- Action text is applied by engine templates in constants.js, not stored as per-row advice.
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    ingredient_a INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    ingredient_b INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL,           -- 'major', 'moderate', 'minor'
    summary VARCHAR(500) NOT NULL,
    explanation TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,            -- e.g., 'DDInter v2.0' or 'MedGuard sample data (not clinically verified)'
    CONSTRAINT chk_canonical_order CHECK (ingredient_a < ingredient_b),
    UNIQUE(ingredient_a, ingredient_b)
);

-- Administration timing & spacing conflicts
CREATE TABLE IF NOT EXISTS timing_rules (
    id SERIAL PRIMARY KEY,
    ingredient_a INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    ingredient_b INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    min_gap_hours NUMERIC(4,1) NOT NULL,     -- e.g., 2.0 or 4.0 hours
    severity VARCHAR(20) DEFAULT 'moderate',
    advice TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    CONSTRAINT chk_timing_order CHECK (ingredient_a < ingredient_b),
    UNIQUE(ingredient_a, ingredient_b)
);

-- Disease-drug contraindications using controlled condition codes (e.g., 'CKD', 'ASTHMA')
CREATE TABLE IF NOT EXISTS contraindications (
    id SERIAL PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    condition_code VARCHAR(50) NOT NULL,     -- Controlled uppercase code: 'CKD', 'HEART_FAILURE', etc.
    severity VARCHAR(20) NOT NULL,           -- 'major', 'moderate'
    description TEXT NOT NULL,
    source VARCHAR(100) NOT NULL
);

-- Beers Criteria for elderly patients (age 65+)
CREATE TABLE IF NOT EXISTS beers_rules (
    id SERIAL PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    rationale TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'major',
    source VARCHAR(100) DEFAULT 'AGS Beers Criteria 2023'
);

-- Food and alcohol interactions
CREATE TABLE IF NOT EXISTS food_interactions (
    id SERIAL PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    item VARCHAR(100) NOT NULL,              -- 'alcohol', 'grapefruit', 'dairy'
    severity VARCHAR(20) NOT NULL,           -- 'major', 'moderate', 'minor'
    description TEXT NOT NULL,
    source VARCHAR(100) NOT NULL
);

-- Age-adjusted maximum daily dose limits
CREATE TABLE IF NOT EXISTS dose_limits (
    id SERIAL PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    age_min INT DEFAULT 0,
    age_max INT DEFAULT 150,
    max_daily_dose_mg NUMERIC(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'mg',
    rationale TEXT,
    source VARCHAR(100) NOT NULL
);

