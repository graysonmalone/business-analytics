export default function TablePagination({ page, totalPages, onChange, total, pageSize }) {
  if (total <= pageSize) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-xs text-gray-500">
      <span>{total} records · page {page} of {totalPages}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(1)} disabled={page === 1}
          className="px-2 py-1 rounded hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">«</button>
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-2 py-1 rounded hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹ Prev</button>
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="px-2 py-1 rounded hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next ›</button>
        <button onClick={() => onChange(totalPages)} disabled={page === totalPages}
          className="px-2 py-1 rounded hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">»</button>
      </div>
    </div>
  )
}
