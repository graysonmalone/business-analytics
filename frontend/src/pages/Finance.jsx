import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '@/api/transactions'
import { TableSkeleton, CardSkeleton, ChartSkeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const empty = { type: 'income', amount: '', category: '', description: '', date: new Date().toISOString().slice(0, 10) }
const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#9ca3af' },
}

function buildMonthlyTrend(transactions) {
  const map = {}
  transactions.forEach(t => {
    const month = t.date.slice(0, 7)
    if (!map[month]) map[month] = { month, income: 0, expenses: 0 }
    if (t.type === 'income') map[month].income += t.amount
    else map[month].expenses += t.amount
  })
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
}

export default function Finance() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [typeFilter, setTypeFilter] = useState('all')

  const { data: transactions = [], isLoading, isError } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['transactions'] })

  const createMut = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Transaction added') },
    onError: () => toast.error('Failed to add transaction'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateTransaction(id, data),
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Transaction updated') },
    onError: () => toast.error('Failed to update transaction'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => { invalidate(); toast.success('Transaction deleted') },
    onError: () => toast.error('Failed to delete transaction'),
  })

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (t) => {
    setEditing(t)
    setForm({ type: t.type, amount: t.amount, category: t.category, description: t.description, date: t.date })
    setOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...form, amount: Number(form.amount) }
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload)
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const filtered = typeFilter === 'all' ? transactions : transactions.filter(t => t.type === typeFilter)
  const trend = buildMonthlyTrend(transactions)
  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Finance</h1>
          <p className="text-sm text-gray-400 mt-0.5">Income &amp; expense tracker</p>
        </div>
        <Button onClick={openAdd} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus size={16} /> Add Transaction
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Income</p>
            <p className="text-2xl font-bold text-green-400 mt-1.5">{fmt(totalIncome)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Expenses</p>
            <p className="text-2xl font-bold text-red-400 mt-1.5">{fmt(totalExpenses)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Net</p>
            <p className={`text-2xl font-bold mt-1.5 ${totalIncome - totalExpenses >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
              {fmt(totalIncome - totalExpenses)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Income vs Expenses Trend</h2>
        {isLoading ? <ChartSkeleton /> : trend.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">No data yet. Add transactions to see trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
              <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="income" stroke="#a855f7" fill="url(#colorIncome)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-200 flex-1">Transactions</h2>
          <div className="flex gap-1">
            {['all', 'income', 'expense'].map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                  typeFilter === f ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : isError ? (
          <p className="p-6 text-red-400 text-sm">Failed to load transactions.</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-gray-500 text-sm text-center">
            {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match this filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{t.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.type === 'income' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                      }`}>{t.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{t.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{t.description || '—'}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${
                      t.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(t)}
                          className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm('Delete this transaction?')) deleteMut.mutate(t.id) }}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-100">{editing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-type" className="text-gray-300 text-sm">Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger id="t-type" className="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="income" className="text-gray-100">Income</SelectItem>
                  <SelectItem value="expense" className="text-gray-100">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-amount" className="text-gray-300 text-sm">Amount *</Label>
                <Input id="t-amount" type="number" min="0.01" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-date" className="text-gray-300 text-sm">Date *</Label>
                <Input id="t-date" type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-cat" className="text-gray-300 text-sm">Category</Label>
              <Input id="t-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" placeholder="e.g. Sales, Rent, Supplies" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc" className="text-gray-300 text-sm">Description</Label>
              <Input id="t-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" placeholder="Optional notes" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isPending ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
