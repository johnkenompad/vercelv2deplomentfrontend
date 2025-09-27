import React, { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword
} from 'firebase/auth';
import { db, auth } from '../../firebase';
import axios from 'axios';
import AdminSidebar from '../../components/AdminSidebar';
import { useNotification } from '../../components/Notification';
import Spinner from '../../components/Spinner';

const UserManagement = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: 'student', password: ''
  });
  const { showNotification } = useNotification();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    } catch (error) {
      showNotification('error', '❌ Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification('success', '📩 Reset link sent');
    } catch {
      showNotification('error', '❌ Failed to send reset link');
    }
  };

  const handleStatusToggle = async (id, active) => {
    try {
      await updateDoc(doc(db, 'users', id), { active });
      fetchUsers();
      showNotification('success', active ? '✅ Activated' : '🚫 Deactivated');
    } catch {
      showNotification('error', '❌ Failed to update status');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', id)); // delete Firestore
      await axios.delete(`/api/admin/delete-user/${id}`); // delete Auth
      fetchUsers();
      showNotification('success', '🗑️ User deleted');
    } catch {
      showNotification('error', '❌ Failed to delete user');
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({ ...user, password: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    const { email, password, ...profile } = formData;
    try {
      if (selectedUser) {
        await updateDoc(doc(db, 'users', selectedUser.id), {
          ...profile,
          email,
          updatedAt: serverTimestamp(),
        });

        // Optional password update if current user edits themselves
        if (password && password.length >= 6 && auth.currentUser.email === email) {
          await updatePassword(auth.currentUser, password);
        }

        showNotification('success', '✅ User updated');
      } else {
        if (!email || !password) return showNotification('error', 'Fill in all required fields');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          email, ...profile, createdAt: serverTimestamp(), active: true
        });
        showNotification('success', '✅ User created');
      }

      setShowModal(false);
      fetchUsers();
    } catch {
      showNotification('error', '❌ Failed to save user');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F6EFFC] text-[#5C517B]">
      <AdminSidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />
      <div className={`flex-1 p-6 transition-all duration-300 ${sidebarMinimized ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-[#B76EF1]">User Management</h1>
          <button
            onClick={() => {
              setSelectedUser(null);
              setFormData({ firstName: '', lastName: '', email: '', phone: '', role: 'student', password: '' });
              setShowModal(true);
            }}
            className="px-4 py-2 rounded bg-[#B76EF1] text-white hover:bg-[#974EC3]"
          >
            + Add User
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-[#EBD3FA]">
            <table className="min-w-full divide-y divide-[#EBD3FA]">
              <thead className="bg-[#F6EFFC]">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#EBD3FA]">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-4 py-2">{user.firstName} {user.lastName}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">{user.phone}</td>
                    <td className="px-4 py-2 capitalize">{user.role}</td>
                    <td className="px-4 py-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button onClick={() => handleStatusToggle(user.id, !user.active)} className="text-sm px-3 py-1 rounded bg-[#B76EF1] text-white hover:bg-[#974EC3]">
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleSendResetLink(user.email)} className="text-sm px-3 py-1 rounded bg-yellow-400 text-white hover:bg-yellow-500">
                        Send Reset
                      </button>
                      <button onClick={() => handleEditClick(user)} className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="text-sm px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-6">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-semibold mb-4 text-[#B76EF1]">
                {selectedUser ? 'Edit User' : 'Add New User'}
              </h2>
              <div className="space-y-3">
                {['firstName', 'lastName', 'email', 'phone', 'password'].map(field => (
                  <input
                    key={field}
                    type={field === 'email' ? 'email' : field === 'password' ? 'password' : 'text'}
                    placeholder={field === 'password' && selectedUser ? 'New Password (optional)' : field.charAt(0).toUpperCase() + field.slice(1)}
                    value={formData[field]}
                    onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                    className="w-full px-4 py-2 border border-[#EBD3FA] rounded"
                  />
                ))}
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-[#EBD3FA] rounded"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded bg-[#B76EF1] hover:bg-[#974EC3] text-white text-sm">
                  {selectedUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
