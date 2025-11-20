-- Add thank you message fields to claims table
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS thank_you_message text,
ADD COLUMN IF NOT EXISTS thank_you_sent_at timestamp with time zone;