import { useState } from 'react'

export function useSort(defaultKey = null, defaultDir = 'asc') {
  const [sort, setSort] = useState({ key: defaultKey, dir: defaultDir })

  const toggle = (key) => {
    setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const apply = (data, accessors) => {
    if (!sort.key || !accessors[sort.key]) return data
    return [...data].sort((a, b) => {
      const av = accessors[sort.key](a)
      const bv = accessors[sort.key](b)
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : (av ?? 0) - (bv ?? 0)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }

  return { sort, toggle, apply }
}

export function usePagination(data, pageSize = 25) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = data.slice((safePage - 1) * pageSize, safePage * pageSize)
  const reset = () => setPage(1)
  return { page: safePage, setPage, totalPages, paged, reset, total: data.length }
}
