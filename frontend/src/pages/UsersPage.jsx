import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, User, Check, Loader } from 'lucide-react'
import { usersApi } from '../utils/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function UsersPage() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name:'', email:'', password:'', role:'standard' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    usersApi.list()
      .then(res => setUsers(res.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  async function addUser() {
    if (!form.name || !form.email || !form.password) { toast.error('Name, email and password required'); return }
    setSaving(true)
    try {
      const res = await usersApi.create(form)
      setUsers(prev => [res.data, ...prev])
      setForm({ name:'', email:'', password:'', role:'standard' })
      setShowAdd(false)
      toast.success('User invited')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    } finally { setSaving(false) }
  }

  async function toggleRole(u) {
    const newRole = u.role === 'admin' ? 'standard' : 'admin'
    try {
      await usersApi.update(u.id, { role: newRole })
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, role:newRole} : x))
    } catch { toast.error('Failed to update role') }
  }

  async function toggleActive(u) {
    try {
      await usersApi.update(u.id, { active: !u.active })
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, active:!x.active} : x))
    } catch { toast.error('Failed to update status') }
  }

  async function deleteUser(id) {
    try {
      await usersApi.delete(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('User removed')
    } catch { toast.error('Failed to delete user') }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? 'Loading…' : `${users.length} users · ${users.filter(u=>u.active).length} active`}
          </p>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition">
          <Plus size={14} /> Invite user
        </button>
      </div>

      <div className="p-6 max-w-3xl">
        {/* Add user form */}
        {showAdd && (
          <div className="bg-white border border-brand-200 rounded-xl p-4 mb-5 animate-fade-up">
            <h3 className="text-[13px] font-semibold text-gray-800 mb-3">Invite new user</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="Full name"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
              <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                placeholder="Email" type="email"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
              <input value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                placeholder="Temp password" type="password"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white">
                <option value="standard">Standard</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={addUser} disabled={saving}
                className="px-4 py-2 bg-brand-600 text-white text-[12px] rounded-lg hover:bg-brand-800 transition flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader size={12} className="animate-spin"/> : <Check size={13}/>} Send invite
              </button>
              <button onClick={()=>setShowAdd(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-[12px] rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader size={16} className="animate-spin"/> Loading users…
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['User','Role','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-[11px] font-semibold text-brand-600">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-gray-900">{u.name}</div>
                          <div className="text-[11px] text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleRole(u)}
                        className={clsx('flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition',
                          u.role==='admin' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                        {u.role==='admin' ? <Shield size={11}/> : <User size={11}/>}
                        {u.role}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(u)}
                        className={clsx('text-[11px] px-2.5 py-1 rounded-full font-medium transition',
                          u.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                        {u.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteUser(u.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
