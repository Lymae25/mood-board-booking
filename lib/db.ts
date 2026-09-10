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

export interface Scene {
  id: string
  projectId: string
  sceneNumber: number
  title: string
  description: string
  imageUrl?: string
  createdAt: string
}

export interface TimelineItem {
  id: string
  projectId: string
  title: string
  description: string
  dueDate: string
  status: 'pending' | 'in-progress' | 'completed'
  imageUrl?: string
  createdAt: string
}

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
let scenes: Scene[] = []
let timeline: TimelineItem[] = []

export async function getProjects(): Promise<Project[]> {
  return projects
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
  const newProject: Project = { ...project, id: Date.now().toString(), createdAt: new Date().toISOString() }
  projects.push(newProject)
  return newProject
}

export async function getIdeas(projectId: string): Promise<Idea[]> {
  return ideas.filter(i => i.projectId === projectId)
}

export async function createIdea(projectId: string, idea: Omit<Idea, 'id' | 'projectId' | 'createdAt'>): Promise<Idea> {
  const newIdea: Idea = { ...idea, id: Date.now().toString(), projectId, createdAt: new Date().toISOString() }
  ideas.push(newIdea)
  return newIdea
}

export async function getScenes(projectId: string): Promise<Scene[]> {
  return scenes.filter(s => s.projectId === projectId).sort((a, b) => a.sceneNumber - b.sceneNumber)
}

export async function createScene(projectId: string, scene: Omit<Scene, 'id' | 'projectId' | 'createdAt'>): Promise<Scene> {
  const newScene: Scene = { ...scene, id: Date.now().toString(), projectId, createdAt: new Date().toISOString() }
  scenes.push(newScene)
  return newScene
}

export async function getTimeline(projectId: string): Promise<TimelineItem[]> {
  return timeline.filter(t => t.projectId === projectId)
}

export async function createTimelineItem(projectId: string, item: Omit<TimelineItem, 'id' | 'projectId' | 'createdAt'>): Promise<TimelineItem> {
  const newItem: TimelineItem = { ...item, id: Date.now().toString(), projectId, createdAt: new Date().toISOString() }
  timeline.push(newItem)
  return newItem
}
