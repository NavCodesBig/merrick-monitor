import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAllCabins } from '../hooks/useCampers';
import { supabase } from '../lib/supabaseClient';
import NavBar from '../components/NavBar';

const API_URL = import.meta.env.VITE_API_URL ?? '';

function UserRow({ user, cabins, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [cabinId, setCabinId] = useState(user.cabin_id ?? '');
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role, cabin_id: cabinId || null })
        .eq('id', user.id);
      if (error) throw error;
      onUpdate();
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const cabin = cabins.find(c => c.id === user.cabin_id);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{user.full_name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
          {!editing && (
            <div className="flex gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                user.role === 'admin'    ? 'bg-purple-100 text-purple-700' :
                user.role === 'nurse'    ? 'bg-blue-100 text-blue-700' :
                user.role === 'director' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {user.role === 'director' ? 'Camp Director' : user.role}
              </span>
              {cabin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {cabin.name}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white"
            >
              <option value="counselor">Counselor</option>
              <option value="nurse">Nurse</option>
              <option value="director">Camp Director</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Cabin (counselors only)</label>
            <select
              value={cabinId}
              onChange={e => setCabinId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white"
            >
              <option value="">No cabin</option>
              {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { isAdmin, session } = useAuth();
  const { cabins } = useAllCabins();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'counselor', cabin_id: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase.auth.admin?.listUsers?.() ?? {};

    // Fall back to fetching from users table using service role via backend
    const { data: profiles } = await supabase
      .from('users')
      .select('*')
      .order('full_name');

    setUsers(profiles ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const token = session?.access_token;
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
          cabin_id: newUser.cabin_id || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create user');

      setShowNewUserForm(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'counselor', cabin_id: '' });
      await fetchUsers();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Admin access only.</p>
        </div>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={() => setShowNewUserForm(true)}
            className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-800"
          >
            + User
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 px-4 py-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          User Accounts ({users.length})
        </h2>

        {loading ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          users.map(u => (
            <UserRow key={u.id} user={u} cabins={cabins} onUpdate={fetchUsers} />
          ))
        )}
      </main>

      {/* New user modal */}
      {showNewUserForm && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewUserForm(false)} />
          <div className="relative mt-auto bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold">Create Account</h2>
              <button onClick={() => setShowNewUserForm(false)} className="text-gray-400 hover:text-gray-600 p-2">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="px-4 py-4 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Full name *</label>
                <input type="text" required value={newUser.full_name}
                  onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Email *</label>
                <input type="email" required value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Password *</label>
                <input type="password" required minLength={8} value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Role *</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white">
                  <option value="counselor">Counselor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Cabin (for counselors)</label>
                <select value={newUser.cabin_id} onChange={e => setNewUser(p => ({ ...p, cabin_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white">
                  <option value="">No cabin</option>
                  {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewUserForm(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-3 bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                  {creating ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}
