'use client'

import { useParams } from 'next/navigation'
import ProjectDetail from '@/app/components/ProjectDetail'

export default function ProjectPage() {
  const params = useParams()
  const id = params.id as string

  return <ProjectDetail projectId={id} />
}
