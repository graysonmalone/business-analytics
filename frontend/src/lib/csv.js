export function exportCSV(filename, rows, columns) {
  const header = columns.map(c => c.label).join(',')
  const body = rows.map(row =>
    columns.map(c => {
      const val = c.value(row)
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')
  ).join('\n')

  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
