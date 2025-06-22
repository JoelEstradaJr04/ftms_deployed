-- Add status and date_released fields to hr_payroll table
ALTER TABLE hr_payroll 
ADD COLUMN status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Released', 'Cancelled')),
ADD COLUMN date_released TIMESTAMP WITH TIME ZONE;

-- Create index for status field for better performance
CREATE INDEX idx_hr_payroll_status ON hr_payroll(status);

-- Update existing records to have 'Pending' status
UPDATE hr_payroll SET status = 'Pending' WHERE status IS NULL; 