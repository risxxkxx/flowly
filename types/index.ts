export type Category = 'work' | 'chores'
export type Priority = 'low' | 'medium' | 'high'

export interface User {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

export interface Project {
  id: string
  owner_id: string
  name: string
  description: string | null
  category: Category
  color: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id: string | null
  title: string
  category: Category
  completed: boolean
  completed_at: string | null
  due_date: string | null
  priority: Priority
  total_seconds: number
  timer_started_at: string | null
  created_at: string
}

export interface ProjectAccess {
  id: string
  project_id: string
  owner_id: string
  viewer_id: string
  granted_at: string
}

export interface Plant {
  id: string
  owner_id: string
  name: string
  location: string | null
  capacity_kw: number | null
  battery_kwh: number | null
  created_at: string
}

export interface DailyLog {
  id: string
  plant_id: string
  user_id: string
  log_date: string
  production_kwh: number | null
  soc_percent: number | null
  notes: string | null
  created_at: string
}
