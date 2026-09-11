'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CustomerDashboard({ customerId }: { customerId: string }) {
  const [projects, setProjects] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch(`/api/projects?customerId=${customerId}`).then(r => r.json())
    ]).then(([customers, projs]) => {
      setCustomer(customers.find((c: any) => c.id === customerId))
      setProjects(projs || [])
      setLoading(false)
    })
  }, [customerId])

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOADING</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '60px 40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '60px', borderBottom: '1px solid #333', paddingBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {customer?.logoUrl && <img src={customer.logoUrl} alt={customer.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #333' }} />}
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>{customer?.name}</h1>
              <p style={{ fontSize: '12px', color: '#999', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '5px' }}>Mine Projekter</p>
            </div>
          </div>
          <button onClick={() => router.push('/')} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #333', color: '#999', cursor: 'pointer', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Log ud</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '40px' }}>
          {projects.map((project: any) => (
            <Link key={project.id} href={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'transparent', border: '1px solid #333', cursor: 'pointer', transition: 'all 0.3s' }}>
                {project.logoUrl && <img src={project.logoUrl} alt={project.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />}
                <div style={{ padding: '30px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{project.name}</h3>
                  <p style={{ color: '#999', fontSize: '12px', marginBottom: '15px', lineHeight: '1.6' }}>{project.description}</p>
                  <div style={{ paddingTop: '20px', borderTop: '1px solid #333' }}>
                    <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{project.status}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && <div style={{ textAlign: 'center', paddingTop: '60px' }}><p style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Ingen projekter endnu</p></div>}
      </div>
    </div>
  )
}
