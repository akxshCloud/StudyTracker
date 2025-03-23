export interface StudyGroup {
  id: string;
  name: string;
  created_at: string;
  creator_id: string;
  total_hours: number;
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
  user: UserProfile;
}

export interface GroupTask {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  created_by: string;
}

export interface StudyGroupWithMembers extends StudyGroup {
  members: GroupMember[];
  tasks: GroupTask[];
} 