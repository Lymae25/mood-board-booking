import PinScreen from '@/app/components/PinScreen'
export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params
  return <PinScreen customerId={customerId} />
}
