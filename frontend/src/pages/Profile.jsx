import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/api/profile'
import { getDashboard } from '@/api/dashboard'
import { CardSkeleton } from '@/components/Skeleton'
import { User, Mail, Calendar, Package, DollarSign, TrendingUp } from 'lucide-react'

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  const isLoading = profileLoading || statsLoading

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Profile</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your account information</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-xl font-bold text-purple-400">
                  {profile?.name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">{profile?.name}</h2>
                <p className="text-sm text-gray-400">{profile?.email}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-gray-800 pt-5">
              <div className="flex items-center gap-3 text-sm">
                <User size={15} className="text-gray-500 shrink-0" />
                <span className="text-gray-400 w-24">Name</span>
                <span className="text-gray-200">{profile?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail size={15} className="text-gray-500 shrink-0" />
                <span className="text-gray-400 w-24">Email</span>
                <span className="text-gray-200">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={15} className="text-gray-500 shrink-0" />
                <span className="text-gray-400 w-24">Member since</span>
                <span className="text-gray-200">{joinedDate}</span>
              </div>
            </div>
          </div>

          {stats && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Account Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Package size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Products</p>
                    <p className="text-lg font-bold text-gray-100">{stats.total_products}</p>
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-600/20 flex items-center justify-center">
                    <DollarSign size={16} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Net Profit</p>
                    <p className={`text-lg font-bold ${stats.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmt(stats.net_profit)}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <TrendingUp size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Sales</p>
                    <p className="text-lg font-bold text-gray-100">{fmt(stats.total_sales)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
