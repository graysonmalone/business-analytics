import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSales, createSale, updateSale, deleteSale } from '@/api/sales'
import { getInventory } from '@/api/inventory'
import { exportCSV } from '@/lib/csv'
import { TableSkeleton, CardSkeleton, ChartSkeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Download } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const empty = { product_id: '', quantity_sold: '', unit_price: '', sale_date: new Date().toISOString().slice(0, 10) }
const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#9ca3af' },
}

function buildProductChart(sales) {
  const map = {}
  sales.forEach(s => {
    const name = s.product_name || 'Unknown'
    if (!map[name]) map[name] = { name, revenue: 0, units: 0 }
    map[name].revenue += s.total_amount
    map[name].units += s.quantity_sold
  })
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
}

function buildDailyChart(sales) {
  const map = {}
  sales.forEach(s => {
    const d = s.sale_date
    if (!map[d]) map[d] = { date: d, revenue: 0 }
    map[d].revenue += s.total_amount
  })
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
}

export default function Sales() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  const { data: sales = [], isLoading, isError } = useQuery({ queryKey: ['sales'], queryFn: getSales })
  const { data: products = [] } = useQuery({ queryKey: ['inventory'], queryFn: getInventory })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['sales'] })

  const createMut = useMutation({
    mutationFn: createSale,
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Sale logged') },
    onError: () => toast.error('Failed to log sale'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateSale(id, data),
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Sale updated') },
    onError: () => toast.error('Failed to update sale'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => { invalidate(); toast.success('Sale deleted') },
    onError: () => toast.error('Failed to delete sale'),
  })

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ product_id: s.product_id ?? '', quantity_sold: s.quantity_sold, unit_price: s.unit_price, sale_date: s.sale_date })
    setOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      product_id: form.product_id ? Number(form.product_id) : null,
      quantity_sold: Number(form.quantity_sold),
      unit_price: Number(form.unit_price),
      sale_date: form.sale_date,
    }
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload)
  }

  const totalRevenue = sales.reduce((s, t) => s + t.total_amount, 0)
  const totalUnits = sales.reduce((s, t) => s + t.quantity_sold, 0)
  const productChart = buildProductChart(sales)
  const dailyChart = buildDailyChart(sales)
  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Sales</h1>
          <p className="text-sm text-gray-400 mt-0.5">Performance tracking &amp; history</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportCSV('sales.csv', sales, [
            { label: 'Date', value: r => r.sale_date },
            { label: 'Product', value: r => r.product_name },
            { label: 'Quantity', value: r => r.quantity_sold },
            { label: 'Unit Price', value: r => r.unit_price },
            { label: 'Total', value: r => r.total_amount },
          ])} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-2">
            <Download size={15} /> Export
          </Button>
          <Button onClick={openAdd} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Plus size={16} /> Log Sale
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-purple-400 mt-1.5">{fmt(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{sales.length} sales</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Units Sold</p>
            <p className="text-2xl font-bold text-gray-100 mt-1.5">{totalUnits.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">across all products</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Revenue by Product</h2>
          {isLoading ? <ChartSkeleton /> : productChart.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No sales yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productChart} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} width={80} />
                <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`]} />
                <Bar dataKey="revenue" fill="#a855f7" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Daily Revenue (Last 30 Days)</h2>
          {isLoading ? <ChartSkeleton /> : dailyChart.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No sales yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#4b5563" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis stroke="#4b5563" tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${v}`} />
                <Tooltip {...tooltipStyle} formatter={v => [`$${Number(v).toFixed(2)}`]} />
                <Line type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Sales History</h2>
        </div>
        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : isError ? (
          <p className="p-6 text-red-400 text-sm">Failed to load sales.</p>
        ) : sales.length === 0 ? (
          <p className="p-8 text-gray-500 text-sm text-center">No sales yet. Log your first sale.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 font-medium">Unit Price</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sales.map(s => (
                  <tr key={s.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.sale_date}</td>
                    <td className="px-4 py-3 text-gray-200">{s.product_name || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300 font-mono">{s.quantity_sold}</td>
                    <td className="px-4 py-3 text-right text-gray-300 font-mono">{fmt(s.unit_price)}</td>
                    <td className="px-4 py-3 text-right text-purple-400 font-mono font-semibold">{fmt(s.total_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm('Delete this sale?')) deleteMut.mutate(s.id) }}
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
            <DialogTitle className="text-gray-100">{editing ? 'Edit Sale' : 'Log Sale'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-product" className="text-gray-300 text-sm">Product</Label>
              <Select value={String(form.product_id)} onValueChange={v => {
                const product = products.find(p => p.id === Number(v))
                setForm(f => ({ ...f, product_id: v, unit_price: product ? product.unit_price : f.unit_price }))
              }}>
                <SelectTrigger id="s-product" className="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {products.map(p => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-gray-100">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-qty" className="text-gray-300 text-sm">Quantity *</Label>
                <Input id="s-qty" type="number" min="1" value={form.quantity_sold}
                  onChange={e => setForm(f => ({ ...f, quantity_sold: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-price" className="text-gray-300 text-sm">Unit Price *</Label>
                <Input id="s-price" type="number" min="0" step="0.01" value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-date" className="text-gray-300 text-sm">Date *</Label>
              <Input id="s-date" type="date" value={form.sale_date}
                onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" required />
            </div>
            {form.quantity_sold && form.unit_price && (
              <p className="text-sm text-gray-400">
                Total: <span className="text-purple-400 font-semibold">{fmt(Number(form.quantity_sold) * Number(form.unit_price))}</span>
              </p>
            )}
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isPending ? 'Saving…' : editing ? 'Save changes' : 'Log sale'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
