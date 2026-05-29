import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loadUsers,
  loadUserById,
  saveUser,
  deleteUser,
  resetUserPassword
} from '../api'

const initialForm = {
  id: '',
  username: '',
  password: '',
  full_name: '',
  email: '',
  phone: '',
  role: 'operator',
  is_active: '1',
  notes: ''
}

const initialResetForm = {
  id: '',
  newPassword: '',
  confirmPassword: ''
}

export default function UserManagementPage({ user }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [resetForm, setResetForm] = useState(initialResetForm)
  const [userModalVisible, setUserModalVisible] = useState(false)
  const [resetModalVisible, setResetModalVisible] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    loadData()
  }, [user, navigate])

  async function loadData() {
    setLoading(true)
    const result = await loadUsers()
    if (!result) {
      navigate('/login', { replace: true })
      return
    }
    setUsers(result)
    setLoading(false)
  }

  function showMessage(text, type = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  function openAddUser() {
    setEditingUserId(null)
    setForm(initialForm)
    setUserModalVisible(true)
  }

  function openEditUser(userData) {
    setEditingUserId(userData.id)
    setForm({
      id: userData.id,
      username: userData.username,
      password: '',
      full_name: userData.full_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      role: userData.role || 'operator',
      is_active: userData.is_active ? '1' : '0',
      notes: userData.notes || ''
    })
    setUserModalVisible(true)
  }

  async function handleEditUser(id) {
    const result = await loadUserById(id)
    if (result && !result.error) {
      openEditUser(result)
    }
  }

  async function submitUser(event) {
    event.preventDefault()
    if (!form.username.trim() || !form.full_name.trim()) {
      showMessage('Username dan nama lengkap harus diisi', 'error')
      return
    }
    if (!editingUserId && !form.password) {
      showMessage('Password harus diisi untuk user baru', 'error')
      return
    }
    if (form.password && form.password.length < 6) {
      showMessage('Password minimal 6 karakter', 'error')
      return
    }
    const payload = {
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      is_active: Number(form.is_active),
      notes: form.notes.trim()
    }
    if (form.password) {
      payload.password = form.password
    }
    const response = await saveUser(editingUserId, payload)
    if (response && !response.error) {
      showMessage('User berhasil disimpan')
      setUserModalVisible(false)
      loadData()
    } else {
      showMessage(response?.error || 'Gagal menyimpan user', 'error')
    }
  }

  async function submitResetPassword(event) {
    event.preventDefault()
    if (!resetForm.newPassword) {
      showMessage('Password baru harus diisi', 'error')
      return
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      showMessage('Konfirmasi password tidak cocok', 'error')
      return
    }
    const response = await resetUserPassword(resetForm.id, resetForm.newPassword)
    if (response && !response.error) {
      showMessage('Password berhasil direset')
      setResetModalVisible(false)
    } else {
      showMessage(response?.error || 'Gagal mereset password', 'error')
    }
  }

  async function handleDeleteUser(id, username) {
    if (!window.confirm(`Yakin ingin menghapus user "${username}"?`)) return
    const response = await deleteUser(id)
    if (response && !response.error) {
      showMessage('User berhasil dihapus')
      loadData()
    } else {
      showMessage(response?.error || 'Gagal menghapus user', 'error')
    }
  }

  function openResetModal(id) {
    setResetForm({ id, newPassword: '', confirmPassword: '' })
    setResetModalVisible(true)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Manajemen User</h1>
          <p>Kelola pengguna aplikasi Fiber Manager</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/')}>Kembali ke Aplikasi</button>
          <button className="btn btn-primary" type="button" onClick={openAddUser}>Tambah User</button>
        </div>
      </div>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Nama Lengkap</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Tidak ada user</td></tr>
            ) : users.map(item => (
              <tr key={item.id}>
                <td><strong>{item.username}</strong></td>
                <td>{item.full_name}</td>
                <td><span className={`badge badge-${item.role}`}>{item.role.toUpperCase()}</span></td>
                <td><span className={`badge badge-${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>{item.last_login ? new Date(item.last_login).toLocaleString('id-ID') : 'Never'}</td>
                <td className="action-cell">
                  <button className="btn btn-sm btn-primary" type="button" onClick={() => handleEditUser(item.id)} title="Edit"><i className="fas fa-edit" /></button>
                  <button className="btn btn-sm btn-secondary" type="button" onClick={() => openResetModal(item.id)} title="Reset Password"><i className="fas fa-key" /></button>
                  <button className="btn btn-sm btn-danger" type="button" onClick={() => handleDeleteUser(item.id, item.username)} title="Hapus"><i className="fas fa-trash" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userModalVisible && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingUserId ? 'Edit User' : 'Tambah User'}</h3>
              <span className="close" onClick={() => setUserModalVisible(false)}>&times;</span>
            </div>
            <form onSubmit={submitUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Username *</label>
                  <input value={form.username} onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Password * <small>{editingUserId ? '(kosongkan jika tidak ingin mengubah)' : '(minimal 6 karakter)'}</small></label>
                  <input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} minLength={editingUserId ? 0 : 6} />
                </div>
                <div className="form-group">
                  <label>Nama Lengkap *</label>
                  <input value={form.full_name} onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>No. Telepon</label>
                  <input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))} required>
                    <option value="admin">Admin - Akses Penuh</option>
                    <option value="operator">Operator - Tambah/Edit Data</option>
                    <option value="viewer">Viewer - Hanya Melihat</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.is_active} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value }))}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Catatan</label>
                  <textarea rows="2" value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger" onClick={() => setUserModalVisible(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetModalVisible && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password</h3>
              <span className="close" onClick={() => setResetModalVisible(false)}>&times;</span>
            </div>
            <form onSubmit={submitResetPassword}>
              <div className="modal-body">
                <input type="hidden" value={resetForm.id} />
                <div className="form-group">
                  <label>Password Baru *</label>
                  <input type="password" value={resetForm.newPassword} onChange={e => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))} required minLength={6} />
                </div>
                <div className="form-group">
                  <label>Konfirmasi Password Baru *</label>
                  <input type="password" value={resetForm.confirmPassword} onChange={e => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))} required minLength={6} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger" onClick={() => setResetModalVisible(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
