export interface StudyGroup {
  id: string;
  name: string;
  created_at: string;
  creator_id: string;
  total_hours: number;
  group_members?: {
    user_id: string;
    role: string;
    user: {
      full_name: string | null;
      avatar_url: string | null;
    };
  }[];
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface GroupTask {
  id: string;
  group_id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  created_by: string;
  assignee?: UserProfile;
}

export interface StudyGroupWithMembers extends StudyGroup {
  members: GroupMember[];
  tasks: GroupTask[];
}

export interface StudySession {
  id: number;
  subject: string;
  duration: number;
  created_at: string;
  user_id: string;
  group_id?: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
} 