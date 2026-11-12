-- Active medicines recorded for a patient
CREATE TABLE IF NOT EXISTS patient_medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    brand_id INT REFERENCES brands(id) ON DELETE SET NULL,
    custom_name VARCHAR(255),
    dose_amount NUMERIC(8,2),                -- e.g., 1 or 500
    dose_unit VARCHAR(50),                   -- e.g., 'tablet', 'mg', 'ml'
    doses_per_day INT NOT NULL DEFAULT 1,    -- e.g., 1, 2, 3
    is_prn BOOLEAN DEFAULT FALSE,            -- TRUE = as-needed medicine (dose total bypassed)
    frequency_text VARCHAR(100),             -- 'twice daily with food'
    timing_schedule JSONB DEFAULT '[]'::jsonb, -- e.g., ["08:00", "20:00"]
    start_date DATE,
    end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan history log (NEVER stores photos - privacy guarantee)
CREATE TABLE IF NOT EXISTS scan_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    matched_drugs JSONB NOT NULL,            -- Detected medicines and match confidence
    confidence NUMERIC(4,2),                 -- Average confidence score (0.0 to 1.0)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders & adherence (Backend deferred in v1; schema established for future migration)
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_medicine_id UUID NOT NULL REFERENCES patient_medicines(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'active'      -- 'active', 'paused'
);

CREATE TABLE IF NOT EXISTS adherence_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,             -- 'taken', 'missed', 'skipped'
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

