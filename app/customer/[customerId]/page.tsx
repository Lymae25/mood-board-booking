import CustomerDashboard from '@/app/components/CustomerDashboard'
export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params
  return <CustomerDashboard customerId={customerId} />
}
