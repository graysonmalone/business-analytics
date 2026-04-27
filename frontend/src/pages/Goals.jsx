import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getGoals, createGoal, updateGoal, deleteGoal } from '@/api/goals'
import { CardSkeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Target } from 'lucide-react'

const empty = { name: '', metric: 'revenue', target_amount: '', period: 'monthly' }

const metricLabels = { revenue: 'Revenue', expenses: 'Expenses', profit: 'Net Profit', sales: 'Sales' }
const metricColors = {
  revenue: 'text-green-400',
  expenses: 'text-red-400',
  profit: 'text-purple-400',
  sales: 'text-blue-400',
}
const metricBg = {
  revenue: 'bg-green-500',
  expenses: 'bg-red-500',
  profit: 'bg-purple-500',
  sales: 'bg-blue-500',
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function progressColor(metric, pct) {
  if (metric === 'expenses') {
    if (pct >= 100) return 'bg-red-500'
    if (pct >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 60) return 'bg-purple-500'
  return 'bg-gray-600'
}

function progressLabel(metric, pct) {
  if (metric === 'expenses') {
    if (pct >= 100) return { text: 'Over budget', color: 'text-red-400' }
    if (pct >= 80) return { text: 'Near limit', color: 'text-yellow-400' }
    return { text: 'Under budget', color: 'text-green-400' }
  }
  if (pct >= 100) return { text: 'Goal reached!', color: 'text-green-400' }
  if (pct >= 60) return { text: 'On track', color: 'text-purple-400' }
  return { text: 'In progress', color: 'text-gray-400' }
}

export default function Goals() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: goals = [], isLoading, isError } = useQuery({ queryKey: ['goals'], queryFn: getGoals })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['goals'] })

  const createMut = useMutation({
    mutationFn: createGoal,
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Goal created') },
    onError: () => toast.error('Failed to create goal'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateGoal(id, data),
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Goal updated') },
    onError: () => toast.error('Failed to update goal'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => { invalidate(); toast.success('Goal deleted') },
    onError: () => toast.error('Failed to delete goal'),
  })

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (g) => {
    setEditing(g)
    setForm({ name: g.name, metric: g.metric, target_amount: g.target_amount, period: g.period })
    setOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...form, target_amount: Number(form.target_amount) }
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload)
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Goals & Targets</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track progress toward your business targets</p>
        </div>
        <Button onClick={openAdd} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus size={16} /> Add Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <p className="text-red-400 text-sm">Failed to load goals.</p>
      ) : goals.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Target size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 font-medium">No goals yet</p>
          <p className="text-gray-500 text-sm mt-1">Set a revenue, expense, or profit target to track your progress</p>
          <Button onClick={openAdd} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Plus size={15} /> Create your first goal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(g => {
            const pct = Math.min(g.progress, 100)
            const barColor = progressColor(g.metric, g.progress)
            const label = progressLabel(g.metric, g.progress)
            return (
              <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 font-semibold truncate">{g.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium ${metricColors[g.metric]}`}>
                        {metricLabels[g.metric]}
                      </span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-xs text-gray-500 capitalize">{g.period}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(g)}
                      className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => { if (confirm('Delete this goal?')) deleteMut.mutate(g.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={label.color + ' text-xs font-medium'}>{label.text}</span>
                    <span className="text-gray-400 text-xs">{g.progress.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Current: <span className="text-gray-200 font-medium">{fmt(g.current_amount)}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      Target: <span className="text-gray-200 font-medium">{fmt(g.target_amount)}</span>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-100">{editing ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-name" className="text-gray-300 text-sm">Goal name *</Label>
              <Input id="g-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" placeholder="e.g. Hit $10k revenue this month" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-metric" className="text-gray-300 text-sm">Metric *</Label>
                <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v }))}>
                  <SelectTrigger id="g-metric" className="bg-gray-800 border-gray-700 text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="revenue" className="text-gray-100">Revenue</SelectItem>
                    <SelectItem value="expenses" className="text-gray-100">Expenses</SelectItem>
                    <SelectItem value="profit" className="text-gray-100">Net Profit</SelectItem>
                    <SelectItem value="sales" className="text-gray-100">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-period" className="text-gray-300 text-sm">Period *</Label>
                <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                  <SelectTrigger id="g-period" className="bg-gray-800 border-gray-700 text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="monthly" className="text-gray-100">Monthly</SelectItem>
                    <SelectItem value="yearly" className="text-gray-100">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-target" className="text-gray-300 text-sm">Target amount ($) *</Label>
              <Input id="g-target" type="number" min="1" step="0.01" value={form.target_amount}
                onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" placeholder="5000" required />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isPending ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
