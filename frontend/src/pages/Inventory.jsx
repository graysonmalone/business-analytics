import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getInventory, createProduct, updateProduct, deleteProduct } from '@/api/inventory'
import { TableSkeleton } from '@/components/Skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'

const empty = { name: '', category: '', quantity: 0, unit_price: 0, reorder_level: 10 }
const fmt = (n) => '$' + Number(n || 0).toFixed(2)

export default function Inventory() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [search, setSearch] = useState('')

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventory,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory'] })

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Product added') },
    onError: () => toast.error('Failed to add product'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => { invalidate(); setOpen(false); toast.success('Product updated') },
    onError: () => toast.error('Failed to update product'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { invalidate(); toast.success('Product deleted') },
    onError: () => toast.error('Failed to delete product'),
  })

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ name: p.name, category: p.category, quantity: p.quantity, unit_price: p.unit_price, reorder_level: p.reorder_level })
    setOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...form, quantity: Number(form.quantity), unit_price: Number(form.unit_price), reorder_level: Number(form.reorder_level) }
    editing ? updateMut.mutate({ id: editing.id, data: payload }) : createMut.mutate(payload)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = products.filter(p => p.quantity <= p.reorder_level)
  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Inventory</h1>
          <p className="text-sm text-gray-400 mt-0.5">{products.length} products</p>
        </div>
        <Button onClick={openAdd} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <Plus size={16} /> Add Product
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-sm">
            <strong>{lowStock.length}</strong> product{lowStock.length > 1 ? 's are' : ' is'} at or below reorder level:{' '}
            {lowStock.map(p => p.name).join(', ')}
          </p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <Input
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : isError ? (
          <p className="p-6 text-red-400 text-sm">Failed to load inventory.</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-gray-500 text-sm text-center">
            {products.length === 0 ? 'No products yet. Add your first product.' : 'No products match your search.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Quantity</th>
                  <th className="text-right px-4 py-3 font-medium">Unit Price</th>
                  <th className="text-right px-4 py-3 font-medium">Value</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(p => {
                  const isLow = p.quantity <= p.reorder_level
                  return (
                    <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-gray-200 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-400">{p.category || '—'}</td>
                      <td className={`px-4 py-3 text-right font-mono ${isLow ? 'text-yellow-400' : 'text-gray-200'}`}>
                        {p.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-200 font-mono">{fmt(p.unit_price)}</td>
                      <td className="px-4 py-3 text-right text-gray-300 font-mono">{fmt(p.quantity * p.unit_price)}</td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">Low Stock</Badge>
                        ) : (
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">In Stock</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMut.mutate(p.id) }}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-100">{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name" className="text-gray-300 text-sm">Name *</Label>
              <Input id="p-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cat" className="text-gray-300 text-sm">Category</Label>
              <Input id="p-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" placeholder="e.g. Electronics" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-qty" className="text-gray-300 text-sm">Quantity *</Label>
                <Input id="p-qty" type="number" min="0" value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price" className="text-gray-300 text-sm">Unit Price *</Label>
                <Input id="p-price" type="number" min="0" step="0.01" value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-reorder" className="text-gray-300 text-sm">Reorder Level</Label>
              <Input id="p-reorder" type="number" min="0" value={form.reorder_level}
                onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-gray-100" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isPending ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
