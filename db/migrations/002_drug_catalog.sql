-- Standardized active ingredients
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,       -- Normalized lowercase: 'paracetamol'
    rxcui VARCHAR(50)                        -- RxNorm identifier (e.g., '161')
);

-- Ingredient alternative synonyms (e.g., acetaminophen -> paracetamol)
CREATE TABLE IF NOT EXISTS ingredient_synonyms (
    id SERIAL PRIMARY KEY,
    ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    synonym VARCHAR(255) UNIQUE NOT NULL     -- Normalized lowercase: 'acetaminophen'
);

-- Pharmacological drug classes (for allergy cross-checks and duplicate therapy)
CREATE TABLE IF NOT EXISTS drug_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,       -- e.g., 'NSAID', 'ACE Inhibitor', 'SSRI'
    description TEXT
);

-- Many-to-many relationship: Ingredients to Drug Classes
CREATE TABLE IF NOT EXISTS ingredient_drug_classes (
    ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    drug_class_id INT NOT NULL REFERENCES drug_classes(id) ON DELETE CASCADE,
    PRIMARY KEY (ingredient_id, drug_class_id)
);

-- Commercial brands (loaded via sample seed or Indian brand CSV importer)
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,        -- e.g., 'Dolo 650', 'Pan-D'
    manufacturer VARCHAR(255),               -- e.g., 'Micro Labs', 'Alkem'
    form VARCHAR(100),                       -- 'tablet', 'capsule', 'syrup'
    strength_raw VARCHAR(100)                -- '650mg', '40mg/30mg'
);

-- Multi-ingredient mapping (Combination product resolver)
CREATE TABLE IF NOT EXISTS brand_ingredients (
    id SERIAL PRIMARY KEY,
    brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    strength_mg NUMERIC(10,2) NOT NULL,
    UNIQUE(brand_id, ingredient_id)
);

