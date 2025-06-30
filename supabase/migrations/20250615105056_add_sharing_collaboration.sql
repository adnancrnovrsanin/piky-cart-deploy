/*
  # Shopping List Sharing and Collaboration Feature
  
  1. New Tables
    - `share_invitations` - Email-based invitations for sharing lists
    - `list_collaborators` - User collaborations on shared lists
    
  2. Schema Updates
    - Add collaboration metadata to `shopping_lists` table
    
  3. Features
    - Email-based invitations with expiration
    - Role-based permissions system (enforced in application layer)
    - Real-time sync support via updated_at triggers
    - Coexistence with existing link-based sharing
    
  Note: Permission logic is handled in the application layer, not via RLS
*/

-- Create share_invitations table for email-based invitations
CREATE TABLE share_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  role text CHECK (role IN ('editor', 'viewer')) DEFAULT 'editor',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  
  -- Ensure unique pending invitations per email/list combination
  UNIQUE(invitee_email, list_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create list_collaborators table for active collaborations
CREATE TABLE list_collaborators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'editor',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique user/list combinations
  UNIQUE(user_id, list_id)
);

-- Add collaboration metadata to shopping_lists table
ALTER TABLE shopping_lists 
ADD COLUMN is_collaborative boolean DEFAULT false,
ADD COLUMN last_updated_by_collaborator_at timestamptz;

-- Create indexes for better performance
CREATE INDEX idx_share_invitations_invitee_email ON share_invitations(invitee_email);
CREATE INDEX idx_share_invitations_list_id ON share_invitations(list_id);
CREATE INDEX idx_share_invitations_inviter_id ON share_invitations(inviter_id);
CREATE INDEX idx_share_invitations_status ON share_invitations(status);
CREATE INDEX idx_share_invitations_expires_at ON share_invitations(expires_at);

-- Composite index for efficient invitation lookups
CREATE INDEX idx_share_invitations_email_status ON share_invitations(invitee_email, status);

-- List collaborators indexes
CREATE INDEX idx_list_collaborators_user_id ON list_collaborators(user_id);
CREATE INDEX idx_list_collaborators_list_id ON list_collaborators(list_id);
CREATE INDEX idx_list_collaborators_role ON list_collaborators(role);

-- Composite index for user collaboration lookups
CREATE INDEX idx_list_collaborators_user_list ON list_collaborators(user_id, list_id);

-- Shopping lists collaboration indexes
CREATE INDEX idx_shopping_lists_is_collaborative ON shopping_lists(is_collaborative);
CREATE INDEX idx_shopping_lists_last_updated_by_collaborator ON shopping_lists(last_updated_by_collaborator_at);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_share_invitations_updated_at
  BEFORE UPDATE ON share_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_list_collaborators_updated_at
  BEFORE UPDATE ON list_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add the list owner as a collaborator when creating a new list
CREATE OR REPLACE FUNCTION add_owner_as_collaborator()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the list owner as a collaborator with 'owner' role
  INSERT INTO list_collaborators (user_id, list_id, role)
  VALUES (NEW.user_id, NEW.id, 'owner')
  ON CONFLICT (user_id, list_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically add owner as collaborator when a list is created
CREATE TRIGGER add_owner_as_collaborator_trigger
  AFTER INSERT ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_collaborator();

-- Function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_invitation(invitation_id uuid, accepting_user_id uuid)
RETURNS boolean AS $$
DECLARE
  invitation_record share_invitations;
  user_email text;
BEGIN
  -- Get the user's email
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = accepting_user_id;
  
  -- Get the invitation details
  SELECT * INTO invitation_record 
  FROM share_invitations 
  WHERE id = invitation_id 
    AND invitee_email = user_email 
    AND status = 'pending' 
    AND expires_at > now();
  
  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Add user as collaborator
  INSERT INTO list_collaborators (user_id, list_id, role)
  VALUES (accepting_user_id, invitation_record.list_id, invitation_record.role)
  ON CONFLICT (user_id, list_id) 
  DO UPDATE SET 
    role = invitation_record.role,
    updated_at = now();
  
  -- Update invitation status
  UPDATE share_invitations 
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_id;
  
  -- Mark list as collaborative
  UPDATE shopping_lists 
  SET is_collaborative = true, updated_at = now()
  WHERE id = invitation_record.list_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM share_invitations 
  WHERE status = 'pending' AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;