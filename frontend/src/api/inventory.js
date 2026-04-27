import api from '@/lib/axios'
export const getInventory = () => api.get('/inventory').then(r => r.data)
export const createProduct = (data) => api.post('/inventory', data).then(r => r.data)
export const updateProduct = (id, data) => api.put(`/inventory/${id}`, data).then(r => r.data)
export const deleteProduct = (id) => api.delete(`/inventory/${id}`).then(r => r.data)
