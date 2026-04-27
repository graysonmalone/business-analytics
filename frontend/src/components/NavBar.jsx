import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LayoutDashboard, Package, DollarSign, TrendingUp, User, LogOut, BarChart2 } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/finance', icon: DollarSign, label: 'Finance' },
  { to: '/sales', icon: TrendingUp, label: 'Sales' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="text-purple-400" size={20} strokeWidth={1.8} />
          <span className="text-gray-100 font-semibold text-sm tracking-tight">BizAnalytics</span>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/60'
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
    </nav>
  )
}
