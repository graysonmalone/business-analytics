import api from '@/lib/axios'
export const getAuditLog = () => api.get('/audit').then(r => r.data)
