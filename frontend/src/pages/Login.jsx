import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { BarChart2 } from 'lucide-react'

export default function Login() {
  const { login: authLogin } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      authLogin(data.token, data.user)
      navigate('/')
    },
    onError: (err) => setError(err.response?.data?.error || 'Login failed'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="text-purple-400" size={28} strokeWidth={1.8} />
            <span className="text-2xl font-bold text-gray-100">BizAnalytics</span>
          </div>
          <p className="text-gray-400 text-sm">Sign in to your account</p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-300 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-300 text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-gray-100"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
              <p className="text-center text-sm text-gray-400">
                No account?{' '}
                <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium">
                  Register
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
