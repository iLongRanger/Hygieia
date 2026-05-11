-- Add HR profile fields for People management.
ALTER TABLE "users"
  ADD COLUMN "percentage_pay_rate" DECIMAL(5, 2),
  ADD COLUMN "employee_number" VARCHAR(50),
  ADD COLUMN "job_title" VARCHAR(120),
  ADD COLUMN "department" VARCHAR(120),
  ADD COLUMN "employment_type" VARCHAR(40),
  ADD COLUMN "supervisor_user_id" UUID,
  ADD COLUMN "start_date" DATE,
  ADD COLUMN "termination_date" DATE,
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "emergency_contact" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "availability" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "skills" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "compliance" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "onboarding" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "hr_notes" JSONB NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX "users_employee_number_key" ON "users"("employee_number");

ALTER TABLE "users"
  ADD CONSTRAINT "users_supervisor_user_id_fkey"
  FOREIGN KEY ("supervisor_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
