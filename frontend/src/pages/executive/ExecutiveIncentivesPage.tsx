import IncentivesView from '@/components/sales/IncentivesView'
import { useGetExecutiveStatsQuery } from '@/redux/api'

export default function ExecutiveIncentivesPage() {
  const { data: stats } = useGetExecutiveStatsQuery()
  return <IncentivesView earned={stats?.incentiveEarned ?? 0} commissionPct={stats?.commissionPct ?? 5} role="executive" />
}
