import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/api/profile'
import { getDashboard } from '@/api/dashboard'
import { getGoals } from '@/api/goals'
import { CardSkeleton } from '@/components/Skeleton'
import {
  User, Mail, Calendar, Package, DollarSign, TrendingUp,
  Target, AlertTriangle, BarChart2, ShoppingCart, Layers,
} from 'lucide-react'

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtShort = (n) => {
  const v = Number(n || 0)
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(1) + 'k'
  return '$' + v.toFixed(2)
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, valueClass = 'text-gray-100', sub }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <p className={`text-2xl font-bold mt-3 ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function GoalBar({ goal }) {
  const pct = Math.min(goal.progress, 100)
  const isExpense = goal.metric === 'expenses'
  const barColor = isExpense
    ? (goal.progress >= 100 ? 'bg-red-500' : goal.progress >= 80 ? 'bg-yellow-500' : 'bg-green-500')
    : (goal.progress >= 100 ? 'bg-green-500' : goal.progress >= 60 ? 'bg-purple-500' : 'bg-gray-600')
  const metricColors = { revenue: 'text-green-400', expenses: 'text-red-400', profit: 'text-purple-400', sales: 'text-blue-400' }
  const metricLabels = { revenue: 'Revenue', expenses: 'Expenses', profit: 'Net Profit', sales: 'Sales' }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm text-gray-200 truncate">{goal.name}</p>
          <span className={`text-xs font-medium shrink-0 ${metricColors[goal.metric]}`}>{metricLabels[goal.metric]}</span>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{goal.progress.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  const { data: goals = [], isLoading: goalsLoading } = useQuery({ queryKey: ['goals'], queryFn: getGoals })

  const isLoading = profileLoading || statsLoading || goalsLoading

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const goalsReached = goals.filter(g => g.progress >= 100).length
  const profitMargin = stats?.total_revenue > 0
    ? ((stats.net_profit / stats.total_revenue) * 100).toFixed(1)
    : '0.0'

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="h-36 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-purple-900/40 via-purple-800/20 to-gray-900" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between gap-4 -mt-10">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-900 border-4 border-gray-900 bg-purple-600/20 ring-1 ring-purple-500/40 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-purple-300">{initials}</span>
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-bold text-gray-100">{profile?.name}</h1>
                <p className="text-sm text-gray-400">{profile?.email}</p>
              </div>
            </div>
            <div className="pb-1 text-right">
              <p className="text-xs text-gray-500">Member since</p>
              <p className="text-sm text-gray-300 font-medium">{joinedDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Stats */}
      {stats && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Business Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={DollarSign} iconBg="bg-green-500/15" iconColor="text-green-400"
                label="Total Revenue" value={fmtShort(stats.total_revenue)} valueClass="text-green-400"
              />
              <StatCard
                icon={TrendingUp} iconBg="bg-purple-500/15" iconColor="text-purple-400"
                label="Net Profit" value={fmtShort(stats.net_profit)}
                valueClass={stats.net_profit >= 0 ? 'text-purple-400' : 'text-red-400'}
                sub={`${profitMargin}% margin`}
              />
              <StatCard
                icon={Layers} iconBg="bg-red-500/15" iconColor="text-red-400"
                label="Total Expenses" value={fmtShort(stats.total_expenses)} valueClass="text-red-400"
              />
              <StatCard
                icon={ShoppingCart} iconBg="bg-blue-500/15" iconColor="text-blue-400"
                label="Sales Revenue" value={fmtShort(stats.total_sales)} valueClass="text-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Package} iconBg="bg-gray-700/50" iconColor="text-gray-300"
              label="Total Products" value={stats.total_products}
              sub={stats.low_stock_count > 0 ? `${stats.low_stock_count} low stock` : 'All stocked'}
            />
            <StatCard
              icon={BarChart2} iconBg="bg-gray-700/50" iconColor="text-gray-300"
              label="Inventory Value" value={fmtShort(stats.inventory_value)}
            />
            <StatCard
              icon={Target} iconBg="bg-gray-700/50" iconColor="text-gray-300"
              label="Goals Tracked" value={goals.length}
              sub={goals.length > 0 ? `${goalsReached} reached` : 'No goals yet'}
            />
            {stats.low_stock_count > 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-yellow-400" />
                </div>
                <p className="text-2xl font-bold mt-3 text-yellow-400">{stats.low_stock_count}</p>
                <p className="text-xs text-yellow-300/70 mt-1">Low Stock Items</p>
                <p className="text-xs text-yellow-500/60 mt-0.5">Needs reordering</p>
              </div>
            ) : (
              <StatCard
                icon={User} iconBg="bg-gray-700/50" iconColor="text-gray-300"
                label="Account Status" value="Active"
                valueClass="text-green-400"
              />
            )}
          </div>
        </>
      )}

      {/* Goals Summary */}
      {goals.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-200">Goals Progress</h2>
            <a href="/goals" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              Manage goals →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {goals.map(g => <GoalBar key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Account Details */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-5">Account Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-800/40 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-gray-700/60 flex items-center justify-center shrink-0">
              <User size={14} className="text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="text-sm text-gray-200 font-medium">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-800/40 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-gray-700/60 flex items-center justify-center shrink-0">
              <Mail size={14} className="text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email Address</p>
              <p className="text-sm text-gray-200 font-medium">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-800/40 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-gray-700/60 flex items-center justify-center shrink-0">
              <Calendar size={14} className="text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Member Since</p>
              <p className="text-sm text-gray-200 font-medium">{joinedDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-800/40 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-gray-700/60 flex items-center justify-center shrink-0">
              <BarChart2 size={14} className="text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Profit Margin</p>
              <p className={`text-sm font-medium ${Number(profitMargin) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profitMargin}%
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
