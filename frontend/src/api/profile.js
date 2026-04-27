import api from '@/lib/axios'
export const getProfile = () => api.get('/profile').then(r => r.data)
