import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDashboard } from '@/api/dashboard'
import api from '@/lib/axios'
import { CardSkeleton, ChartSkeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const fmt = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function StatCard({ title, value, sub, valueClass = 'text-gray-100' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-1.5 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#9ca3af' },
}

export default function Dashboard() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const seedMut = useMutation({
    mutationFn: () => api.post('/seed').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries()
      toast.success('Demo data loaded!')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Could not load demo data'),
  })

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <div className="h-7 w-32 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-800 rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">Failed to load dashboard. Please refresh.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Business overview at a glance</p>
        </div>
        {data && data.total_products === 0 && (
          <Button
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
            variant="outline"
            className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 gap-2 shrink-0"
          >
            <Sparkles size={15} />
            {seedMut.isPending ? 'Loading…' : 'Load demo data'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={fmt(data.total_revenue)} valueClass="text-green-400" />
        <StatCard title="Total Expenses" value={fmt(data.total_expenses)} valueClass="text-red-400" />
        <StatCard
          title="Net Profit"
          value={fmt(data.net_profit)}
          valueClass={data.net_profit >= 0 ? 'text-purple-400' : 'text-red-400'}
        />
        <StatCard
          title="Inventory Value"
          value={fmt(data.inventory_value)}
          sub={`${data.total_products} products · ${data.low_stock_count} low stock`}
        />
      </div>

      {data.low_stock_count > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-300 text-sm flex items-center gap-2">
          <span>⚠</span>
          <span>
            {data.low_stock_count} product{data.low_stock_count > 1 ? 's are' : ' is'} at or below reorder level.{' '}
            <a href="/inventory" className="underline underline-offset-2">Check inventory →</a>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Revenue vs Expenses — Last 6 Months</h2>
          {data.monthly_revenue.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No data yet. Add transactions to see trends.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.monthly_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Top Products by Revenue</h2>
          {data.top_products.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No sales yet. Log sales to see top products.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_products} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="product_name" stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} width={80} />
                <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`]} />
                <Bar dataKey="total_amount" fill="#a855f7" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Recent Transactions</h2>
        {data.recent_transactions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {data.recent_transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.type === 'income' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {t.type}
                  </span>
                  <div>
                    <p className="text-sm text-gray-200">{t.category || 'Uncategorized'}</p>
                    {t.description && <p className="text-xs text-gray-500 truncate max-w-xs">{t.description}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{t.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
