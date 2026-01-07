# Hygieia Platform - Complete Data Model Specification

## Overview

This specification provides complete data model definitions with field types, validation rules, constraints, indexes, and relationships for the Hygieia Platform database.

**Note:** Hygieia is a single-tenant application. All tables belong to a single organization without multi-tenant isolation.

## Database Configuration

### PostgreSQL Settings
- **Version:** PostgreSQL 14+
- **Collation:** en_US.UTF-8
- **Timezone:** UTC
- **Connection Pooling:** PgBouncer (transaction pooling)

### Schema Organization
- **Public Schema:** Main application tables
- **Extensions:** uuid-ossp, pg_trgm, btree_gin

## Common Column Types & Constraints

### UUID Primary Keys
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v7()
```

### Audit Columns
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
created_by_user_id UUID REFERENCES users(id)
updated_by_user_id UUID REFERENCES users(id)
archived_at TIMESTAMPTZ -- Soft delete
```

### Triggers for Timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## Core Identity Tables

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    supabase_user_id UUID NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'pending')),
    last_login_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_phone_format CHECK (phone ~* '^\+?[1-9]\d{1,14}$' OR phone IS NULL),
    CONSTRAINT users_full_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0)
);

-- Indexes
CREATE UNIQUE INDEX idx_users_supabase_user_id ON users(supabase_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### roles
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    key VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT roles_key_format CHECK (key ~* '^[a-z_]+$')
);

-- Seed system roles
INSERT INTO roles (key, label, description, is_system_role, permissions) VALUES
('owner', 'Owner', 'Full system access', true, '{"all": true}'),
('admin', 'Admin', 'CRM, proposals, contracts, reporting', true, '{"crm": true, "proposals": true, "contracts": true, "reporting": true}'),
('manager', 'Manager', 'Estimates, facilities, tasks, cleaners', true, '{"estimates": true, "facilities": true, "tasks": true, "cleaners": true}'),
('cleaner', 'Cleaner', 'Assigned work orders only', true, '{"work_orders": true, "own_tasks_only": true}');
```

### user_roles
```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by_user_id UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_roles_no_future_expires CHECK (expires_at IS NULL OR expires_at > NOW())
);

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

## CRM & Sales Pipeline Tables

### lead_sources
```sql
CREATE TABLE lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT lead_sources_color_format CHECK (color ~* '^#[0-9A-Fa-f]{6}$')
);

-- Indexes
CREATE INDEX idx_lead_sources_active ON lead_sources(is_active);
```

### leads
```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    lead_source_id UUID REFERENCES lead_sources(id),
    status VARCHAR(30) NOT NULL DEFAULT 'lead' CHECK (status IN (
        'lead', 'walk_through_booked', 'walk_through_completed',
        'proposal_sent', 'negotiation', 'won', 'lost', 'reopened'
    )),
    company_name VARCHAR(255),
    contact_name VARCHAR(255) NOT NULL,
    primary_email VARCHAR(255),
    primary_phone VARCHAR(20),
    secondary_email VARCHAR(255),
    secondary_phone VARCHAR(20),
    address JSONB,
    estimated_value DECIMAL(12,2),
    probability INTEGER CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    notes TEXT,
    lost_reason TEXT,
    assigned_to_user_id UUID REFERENCES users(id),
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT leads_email_format CHECK (
        (primary_email IS NULL OR primary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') AND
        (secondary_email IS NULL OR secondary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
    ),
    CONSTRAINT leads_phone_format CHECK (
        (primary_phone IS NULL OR primary_phone ~* '^\+?[1-9]\d{1,14}$') AND
        (secondary_phone IS NULL OR secondary_phone ~* '^\+?[1-9]\d{1,14}$')
    ),
    CONSTRAINT leads_has_contact_name CHECK (LENGTH(TRIM(contact_name)) > 0),
    CONSTRAINT leads_value_positive CHECK (estimated_value IS NULL OR estimated_value >= 0)
);

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_source_id ON leads(lead_source_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to_user_id);
CREATE INDEX idx_leads_email ON leads(primary_email);
CREATE INDEX idx_leads_expected_close_date ON leads(expected_close_date);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- GIN index for address JSONB
CREATE INDEX idx_leads_address ON leads USING GIN(address);
```

### accounts
```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('commercial', 'residential')),
    industry VARCHAR(100),
    website VARCHAR(500),
    billing_email VARCHAR(255),
    billing_phone VARCHAR(20),
    billing_address JSONB,
    qbo_customer_id VARCHAR(50), -- QuickBooks customer ID
    tax_id VARCHAR(50),
    payment_terms VARCHAR(50) DEFAULT 'NET30',
    credit_limit DECIMAL(12,2),
    account_manager_id UUID REFERENCES users(id),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT accounts_billing_email_valid CHECK (billing_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR billing_email IS NULL),
    CONSTRAINT accounts_billing_phone_valid CHECK (billing_phone ~* '^\+?[1-9]\d{1,14}$' OR billing_phone IS NULL),
    CONSTRAINT accounts_website_valid CHECK (website ~* '^https?://.+' OR website IS NULL),
    CONSTRAINT accounts_credit_limit_positive CHECK (credit_limit IS NULL OR credit_limit >= 0)
);

-- Indexes
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_account_manager ON accounts(account_manager_id);
CREATE INDEX idx_accounts_qbo_customer_id ON accounts(qbo_customer_id);

-- GIN index for billing_address JSONB
CREATE INDEX idx_accounts_billing_address ON accounts USING GIN(billing_address);
```

### contacts
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    title VARCHAR(100),
    department VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    is_billing BOOLEAN DEFAULT false,
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT contacts_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT contacts_phone_format CHECK (
        (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$') AND
        (mobile IS NULL OR mobile ~* '^\+?[1-9]\d{1,14}$')
    ),
    CONSTRAINT contacts_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Indexes
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_primary ON contacts(is_primary);
CREATE INDEX idx_contacts_is_billing ON contacts(is_billing);
CREATE UNIQUE INDEX idx_contacts_account_primary ON contacts(account_id) WHERE is_primary = true;
```

### opportunities
```sql
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    lead_id UUID REFERENCES leads(id),
    account_id UUID REFERENCES accounts(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'prospecting' CHECK (status IN (
        'prospecting', 'qualification', 'needs_analysis', 'value_proposition',
        'negotiation', 'closed_won', 'closed_lost'
    )),
    probability INTEGER CHECK (probability BETWEEN 0 AND 100),
    expected_value DECIMAL(12,2),
    actual_value DECIMAL(12,2),
    expected_close_date DATE,
    actual_close_date DATE,
    description TEXT,
    assigned_to_user_id UUID REFERENCES users(id),
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT opportunities_has_lead_or_account CHECK (lead_id IS NOT NULL OR account_id IS NOT NULL),
    CONSTRAINT opportunities_value_positive CHECK (
        (expected_value IS NULL OR expected_value >= 0) AND
        (actual_value IS NULL OR actual_value >= 0)
    ),
    CONSTRAINT opportunities_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Indexes
CREATE INDEX idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX idx_opportunities_account_id ON opportunities(account_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to_user_id);
CREATE INDEX idx_opportunities_expected_close_date ON opportunities(expected_close_date);
```

## Facility Management Tables

### facilities
```sql
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    account_id UUID REFERENCES accounts(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address JSONB NOT NULL,
    square_feet DECIMAL(10,2),
    building_type VARCHAR(50),
    access_instructions TEXT,
    parking_info TEXT,
    special_requirements TEXT,
    facility_manager_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT facilities_name_account_unique UNIQUE(account_id, name),
    CONSTRAINT facilities_square_feet_positive CHECK (square_feet IS NULL OR square_feet > 0)
);

-- Indexes
CREATE INDEX idx_facilities_account_id ON facilities(account_id);
CREATE INDEX idx_facilities_status ON facilities(status);
CREATE INDEX idx_facilities_facility_manager ON facilities(facility_manager_id);

-- GIN index for address JSONB
CREATE INDEX idx_facilities_address ON facilities USING GIN(address);
```

### areas
```sql
CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    area_type_id UUID NOT NULL REFERENCES area_types(id),
    name VARCHAR(255),
    quantity INTEGER NOT NULL DEFAULT 1,
    square_feet DECIMAL(10,2),
    condition_level VARCHAR(20) DEFAULT 'good' CHECK (condition_level IN ('excellent', 'good', 'fair', 'poor')),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT areas_facility_name_unique UNIQUE(facility_id, name),
    CONSTRAINT areas_quantity_positive CHECK (quantity > 0),
    CONSTRAINT areas_square_feet_positive CHECK (square_feet IS NULL OR square_feet > 0)
);

-- Indexes
CREATE INDEX idx_areas_facility_id ON areas(facility_id);
CREATE INDEX idx_areas_area_type_id ON areas(area_type_id);
CREATE INDEX idx_areas_condition_level ON areas(condition_level);
```

### area_types
```sql
CREATE TABLE area_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_square_feet DECIMAL(10,2),
    base_cleaning_time_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT area_types_base_time_positive CHECK (base_cleaning_time_minutes IS NULL OR base_cleaning_time_minutes > 0),
    CONSTRAINT area_types_default_sf_positive CHECK (default_square_feet IS NULL OR default_square_feet > 0)
);

-- Indexes
CREATE INDEX idx_area_types_name ON area_types(name);
```

## Task Management Tables

### task_templates
```sql
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cleaning_type VARCHAR(50) NOT NULL CHECK (cleaning_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
    area_type_id UUID REFERENCES area_types(id),
    estimated_minutes INTEGER NOT NULL,
    difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
    required_equipment JSONB DEFAULT '[]',
    required_supplies JSONB DEFAULT '[]',
    instructions TEXT,
    is_global BOOLEAN DEFAULT false, -- Global templates vs facility-specific
    facility_id UUID REFERENCES facilities(id),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT task_templates_facility_or_global CHECK (is_global = true OR facility_id IS NOT NULL),
    CONSTRAINT task_templates_name_unique UNIQUE(name, facility_id, is_global),
    CONSTRAINT task_templates_minutes_positive CHECK (estimated_minutes > 0)
);

-- Indexes
CREATE INDEX idx_task_templates_cleaning_type ON task_templates(cleaning_type);
CREATE INDEX idx_task_templates_area_type_id ON task_templates(area_type_id);
CREATE INDEX idx_task_templates_facility_id ON task_templates(facility_id);
CREATE INDEX idx_task_templates_is_active ON task_templates(is_active);
CREATE INDEX idx_task_templates_is_global ON task_templates(is_global);

-- GIN indexes for JSONB arrays
CREATE INDEX idx_task_templates_equipment ON task_templates USING GIN(required_equipment);
CREATE INDEX idx_task_templates_supplies ON task_templates USING GIN(required_supplies);
```

### facility_tasks
```sql
CREATE TABLE facility_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id),
    task_template_id UUID REFERENCES task_templates(id),
    custom_name VARCHAR(255),
    custom_instructions TEXT,
    estimated_minutes INTEGER,
    is_required BOOLEAN DEFAULT true,
    cleaning_frequency VARCHAR(20) DEFAULT 'daily' CHECK (cleaning_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')),
    condition_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (condition_multiplier BETWEEN 0.5 AND 2.0),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT facility_tasks_minutes_positive CHECK (estimated_minutes IS NULL OR estimated_minutes > 0)
);

-- Indexes
CREATE INDEX idx_facility_tasks_facility_id ON facility_tasks(facility_id);
CREATE INDEX idx_facility_tasks_area_id ON facility_tasks(area_id);
CREATE INDEX idx_facility_tasks_task_template_id ON facility_tasks(task_template_id);
CREATE INDEX idx_facility_tasks_frequency ON facility_tasks(cleaning_frequency);
CREATE INDEX idx_facility_tasks_priority ON facility_tasks(priority);
```

## Pricing Tables

### pricing_rules
```sql
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pricing_type VARCHAR(20) NOT NULL CHECK (pricing_type IN ('hourly', 'square_foot', 'fixed', 'hybrid')),
    base_rate DECIMAL(10,2) NOT NULL,
    minimum_charge DECIMAL(10,2) DEFAULT 0,
    square_foot_rate DECIMAL(8,4),
    difficulty_multiplier DECIMAL(4,3) DEFAULT 1.0 CHECK (difficulty_multiplier BETWEEN 0.5 AND 3.0),
    condition_multipliers JSONB DEFAULT '{"excellent": 0.8, "good": 1.0, "fair": 1.3, "poor": 1.6}',
    cleaning_type VARCHAR(50),
    area_type_id UUID REFERENCES area_types(id),
    is_active BOOLEAN DEFAULT true,
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    CONSTRAINT pricing_rules_base_rate_positive CHECK (base_rate > 0),
    CONSTRAINT pricing_rules_minimum_positive CHECK (minimum_charge >= 0),
    CONSTRAINT pricing_rules_sf_rate_positive CHECK (square_foot_rate IS NULL OR square_foot_rate > 0)
);

-- Indexes
CREATE INDEX idx_pricing_rules_pricing_type ON pricing_rules(pricing_type);
CREATE INDEX idx_pricing_rules_cleaning_type ON pricing_rules(cleaning_type);
CREATE INDEX idx_pricing_rules_area_type_id ON pricing_rules(area_type_id);
CREATE INDEX idx_pricing_rules_is_active ON pricing_rules(is_active);
```

### pricing_overrides
```sql
CREATE TABLE pricing_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
    pricing_rule_id UUID REFERENCES pricing_rules(id),
    override_rate DECIMAL(10,2) NOT NULL,
    override_reason TEXT NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    approved_by_user_id UUID REFERENCES users(id),
    created_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pricing_overrides_rate_positive CHECK (override_rate > 0),
    CONSTRAINT pricing_overrides_dates_valid CHECK (expiry_date IS NULL OR expiry_date >= effective_date)
);

-- Indexes
CREATE INDEX idx_pricing_overrides_facility_id ON pricing_overrides(facility_id);
CREATE INDEX idx_pricing_overrides_effective_date ON pricing_overrides(effective_date);
CREATE INDEX idx_pricing_overrides_expiry_date ON pricing_overrides(expiry_date);
```

## Triggers for Automatic Timestamps

```sql
-- Create triggers for all tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_sources_updated_at BEFORE UPDATE ON lead_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_area_types_updated_at BEFORE UPDATE ON area_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON task_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facility_tasks_updated_at BEFORE UPDATE ON facility_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_overrides_updated_at BEFORE UPDATE ON pricing_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Data Validation Functions

```sql
-- Email validation function
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Phone validation function
CREATE OR REPLACE FUNCTION is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$';
END;
$$ LANGUAGE plpgsql;

-- Lead status transition validation
CREATE OR REPLACE FUNCTION can_transition_lead_status(
    current_status TEXT,
    new_status TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    CASE current_status
        WHEN 'lead' THEN
            RETURN new_status IN ('walk_through_booked', 'walk_through_completed', 'lost', 'reopened');
        WHEN 'walk_through_booked' THEN
            RETURN new_status IN ('walk_through_completed', 'lead', 'lost');
        WHEN 'walk_through_completed' THEN
            RETURN new_status IN ('proposal_sent', 'negotiation', 'lost');
        WHEN 'proposal_sent' THEN
            RETURN new_status IN ('negotiation', 'won', 'lost');
        WHEN 'negotiation' THEN
            RETURN new_status IN ('won', 'lost', 'proposal_sent');
        WHEN 'won' THEN
            RETURN new_status IN ('reopened');
        WHEN 'lost' THEN
            RETURN new_status IN ('reopened');
        WHEN 'reopened' THEN
            RETURN new_status IN ('lead', 'walk_through_booked');
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

## Performance Optimization Indexes

```sql
-- Composite indexes for common queries
CREATE INDEX idx_leads_status_assigned ON leads(status, assigned_to_user_id);
CREATE INDEX idx_facilities_account ON facilities(account_id);
CREATE INDEX idx_areas_facility_type_condition ON areas(facility_id, area_type_id, condition_level);
CREATE INDEX idx_task_templates_type_global ON task_templates(cleaning_type, is_global);

-- Partial indexes for common filters
CREATE INDEX idx_active_facilities ON facilities(account_id) WHERE status = 'active' AND archived_at IS NULL;
CREATE INDEX idx_active_leads ON leads(created_at) WHERE archived_at IS NULL;
CREATE INDEX idx_active_tasks ON facility_tasks(facility_id, is_required) WHERE archived_at IS NULL;
```

---

**This data model specification is mandatory. Any modifications require architectural review and documentation updates. All implementations must follow these exact specifications.**