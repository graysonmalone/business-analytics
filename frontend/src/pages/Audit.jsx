import { useQuery } from '@tanstack/react-query'
import { getAuditLog } from '@/api/audit'
import { CardSkeleton } from '@/components/Skeleton'
import { Package, DollarSign, TrendingUp, Target, Clock } from 'lucide-react'

const entityIcon = {
  product: Package,
  sale: TrendingUp,
  transaction: DollarSign,
  goal: Target,
}

const actionColor = {
  created: 'text-green-400 bg-green-500/10',
  updated: 'text-blue-400 bg-blue-500/10',
  deleted: 'text-red-400 bg-red-500/10',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Audit() {
  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ['audit'],
    queryFn: getAuditLog,
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Activity Log</h1>
        <p className="text-sm text-gray-400 mt-0.5">Recent changes across your account</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : isError ? (
        <p className="text-red-400 text-sm">Failed to load activity log.</p>
      ) : logs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Clock size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No activity yet</p>
          <p className="text-gray-500 text-sm mt-1">Actions like adding products, logging sales, and creating transactions will appear here.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-800">
            {logs.map((log, i) => {
              const Icon = entityIcon[log.entity] ?? Clock
              const colors = actionColor[log.action] ?? 'text-gray-400 bg-gray-700/20'
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-800/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors}`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{log.entity}</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1 leading-snug">{log.description}</p>
                  </div>
                  <span className="text-xs text-gray-600 shrink-0 mt-1">{timeAgo(log.created_at)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
