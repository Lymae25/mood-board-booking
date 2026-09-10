// Mock database - we'll connect to PostgreSQL later
export interface Project {
  id: string
  name: string
  description: string
  clientName: string
  status: 'active' | 'completed' | 'on-hold'
  startDate: string
  endDate: string
  createdAt: string
}

export interface Idea {
  id: string
  projectId: string
  title: string
  description: string
  imageUrl?: string
  category: string
  createdAt: string
}

export interface TimelineItem {
  id: string
  projectId: string
  title: string
  description: string
  dueDate: string
  status: 'pending' | 'in-progress' | 'completed'
  createdAt: string
}

// Mock data for demo
let projects: Project[] = [
  {
    id: '1',
    name: 'CVS Video Production - Summer Campaign',
    description: 'Summer marketing campaign for video production services',
    clientName: 'Chrome Vault Studios',
    status: 'active',
    startDate: '2025-01-15',
    endDate: '2025-06-30',
    createdAt: new Date().toISOString()
  }
]

let ideas: Idea[] = []
let timeline: TimelineItem[] = []

export async function getProjects() {
  return projects
}

export async function getProjectById(id: string) {
  return projects.find(p => p.id === id)
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt'>) {
  const newProject: Project = {
    ...project,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  }
  projects.push(newProject)
  return newProject
}

export async function getIdeas(projectId: string) {
  return ideas.filter(i => i.projectId === projectId)
}

export async function createIdea(projectId: string, idea: Omit<Idea, 'id' | 'projectId' | 'createdAt'>) {
  const newIdea: Idea = {
    ...idea,
    id: Date.now().toString(),
    projectId,
    createdAt: new Date().toISOString()
  }
  ideas.push(newIdea)
  return newIdea
}

export async function getTimeline(projectId: string) {
  return timeline.filter(t => t.projectId === projectId)
}

export async function createTimelineItem(projectId: string, item: Omit<TimelineItem, 'id' | 'projectId' | 'createdAt'>) {
  const newItem: TimelineItem = {
    ...item,
    id: Date.now().toString(),
    projectId,
    createdAt: new Date().toISOString()
  }
  timeline.push(newItem)
  return newItem
}
