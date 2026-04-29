import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, Package, DollarSign, TrendingUp, User, LogOut,
  BarChart2, Target, Menu, X, Search, Clock, Activity,
} from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/finance', icon: DollarSign, label: 'Finance' },
  { to: '/sales', icon: TrendingUp, label: 'Sales' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/audit', icon: Activity, label: 'Activity' },
  { to: '/profile', icon: User, label: 'Profile' },
]

function useGlobalSearch(query) {
  const qc = useQueryClient()
  if (!query || query.length < 2) return []

  const q = query.toLowerCase()
  const results = []

  const products = qc.getQueryData(['inventory']) ?? []
  products.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
    .slice(0, 3).forEach(p => results.push({ type: 'product', label: p.name, sub: p.category || 'Inventory', to: '/inventory' }))

  const transactions = qc.getQueryData(['transactions']) ?? []
  transactions.filter(t => (t.category || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
    .slice(0, 3).forEach(t => results.push({ type: 'transaction', label: t.category || 'Transaction', sub: `${t.type} · $${Number(t.amount).toFixed(2)}`, to: '/finance' }))

  const sales = qc.getQueryData(['sales']) ?? []
  sales.filter(s => (s.product_name || '').toLowerCase().includes(q) || (s.customer_name || '').toLowerCase().includes(q))
    .slice(0, 3).forEach(s => results.push({ type: 'sale', label: s.product_name || 'Sale', sub: s.customer_name ? `Customer: ${s.customer_name}` : `$${Number(s.total_amount).toFixed(2)}`, to: '/sales' }))

  return results.slice(0, 8)
}

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef()
  const results = useGlobalSearch(searchQuery)

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [navigate])

  const NavContent = () => (
    <>
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="text-purple-400" size={20} strokeWidth={1.8} />
          <span className="text-gray-100 font-semibold text-sm tracking-tight">BizAnalytics</span>
        </div>
      </div>

      <div className="p-3 border-b border-gray-800">
        <button
          onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50) }}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 rounded-lg text-xs text-gray-500 transition-colors"
        >
          <Search size={13} />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-gray-600 font-mono">⌘K</kbd>
        </button>
      </div>

      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/60'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="p-3 border-t border-gray-800">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-500">Signed in as</p>
            <p className="text-sm text-gray-300 font-medium truncate">{user.name}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 w-full transition-all"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <BarChart2 className="text-purple-400" size={18} strokeWidth={1.8} />
          <span className="text-gray-100 font-semibold text-sm">BizAnalytics</span>
        </div>
        <button onClick={() => setMobileOpen(v => !v)} className="p-2 text-gray-400 hover:text-gray-100 transition-colors">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <nav className={`lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavContent />
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden lg:flex w-56 bg-gray-900 border-r border-gray-800 flex-col h-screen sticky top-0 shrink-0">
        <NavContent />
      </nav>

      {/* Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products, transactions, sales…"
                className="flex-1 bg-transparent text-gray-100 text-sm outline-none placeholder:text-gray-500"
              />
              <kbd className="text-xs text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">Esc</kbd>
            </div>
            {searchQuery.length >= 2 && (
              <div className="max-h-80 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500 text-center">No results for "{searchQuery}"</p>
                ) : (
                  <div className="py-2">
                    {results.map((r, i) => (
                      <button key={i} onClick={() => { navigate(r.to); setSearchOpen(false); setSearchQuery('') }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left">
                        <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center shrink-0">
                          {r.type === 'product' && <Package size={12} className="text-purple-400" />}
                          {r.type === 'transaction' && <DollarSign size={12} className="text-green-400" />}
                          {r.type === 'sale' && <TrendingUp size={12} className="text-blue-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 truncate">{r.label}</p>
                          <p className="text-xs text-gray-500 truncate">{r.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {searchQuery.length < 2 && (
              <div className="px-4 py-4 flex items-center gap-2 text-xs text-gray-600">
                <Clock size={11} /> Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
