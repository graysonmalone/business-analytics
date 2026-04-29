import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export default function SortTh({ label, sortKey, sort, onSort, align = 'left', className = '' }) {
  const active = sort.key === sortKey
  const Icon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-3 font-medium cursor-pointer select-none transition-colors text-xs uppercase tracking-wide
        ${active ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'}
        ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <Icon size={11} className={active ? 'text-purple-400' : 'text-gray-600'} />
      </div>
    </th>
  )
}
