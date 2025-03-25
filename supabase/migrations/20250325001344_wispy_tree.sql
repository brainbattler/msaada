/*
  # Enhance Chat System

  1. Changes
    - Add attachment support to chat_messages
    - Add read receipts
    - Add typing status tracking
    - Add cleanup functionality for typing status

  2. Security
    - Maintain existing RLS policies
    - Add policies for typing status
*/

-- Enhance chat_messages table
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_type text,
ADD COLUMN IF NOT EXISTS read_at timestamptz,
ADD COLUMN IF NOT EXISTS is_typing boolean DEFAULT false;

-- Create typing status table
CREATE TABLE IF NOT EXISTS chat_typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  is_typing boolean DEFAULT false,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing status
ALTER TABLE chat_typing_status ENABLE ROW LEVEL SECURITY;

-- Policies for typing status
CREATE POLICY "Users can update their typing status"
ON chat_typing_status
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_typing_status (conversation_id, user_id, is_typing)
  VALUES (NEW.conversation_id, NEW.user_id, NEW.is_typing)
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET 
    is_typing = NEW.is_typing,
    last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for typing status
CREATE TRIGGER update_typing_status_trigger
  AFTER INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_typing_status();

-- Function to clean up old typing statuses
CREATE OR REPLACE FUNCTION cleanup_typing_status()
RETURNS void AS $$
BEGIN
  UPDATE chat_typing_status
  SET is_typing = false
  WHERE last_updated < now() - interval '10 seconds';
END;
$$ LANGUAGE plpgsql;