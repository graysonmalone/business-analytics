import api from '@/lib/axios'
export const getSales = (params) => api.get('/sales', { params }).then(r => r.data)
export const createSale = (data) => api.post('/sales', data).then(r => r.data)
export const updateSale = (id, data) => api.put(`/sales/${id}`, data).then(r => r.data)
export const deleteSale = (id) => api.delete(`/sales/${id}`).then(r => r.data)
