"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Users, 
  Shield, 
  UserPlus, 
  Edit, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Sparkles,
  Plus,
  X
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAllUsers, updateUserRole, createUserRecord, User } from "@/lib/firestore";
import { RoleGuard } from "@/components/RoleGuard";

export default function UserManagement() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    name: '',
    role: 'CLIENT' as User['role'],
    companyName: '',
    companySize: 'STARTUP' as 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'
  });
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, authLoading, router]);

  const handleRoleUpdate = async (userId: string, newRole: User['role']) => {
    setIsUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      alert("User role updated successfully!");
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError("");

    try {
      const firestoreUser = await createUserRecord(
        createForm.email,
        createForm.name,
        createForm.role,
        createForm.companyName,
        createForm.companySize
      );

      // Add the new user to the list
      setUsers(prev => [...prev, firestoreUser]);
      
      // Reset form and close modal
      resetCreateForm();
      setShowCreateModal(false);
      
      // Show success message
      alert("User created successfully! The user can now sign in with their email and password.");
      
    } catch (err: any) {
      console.error("Error creating user:", err);
      setCreateError(err.message || "Failed to create user. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      email: '',
      name: '',
      role: 'CLIENT',
      companyName: '',
      companySize: 'STARTUP'
    });
    setCreateError("");
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "ALL" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'var(--error)';
      case 'DESIGNER':
        return 'var(--warning)';
      case 'CLIENT':
        return 'var(--primary)';
      default:
        return 'var(--text-light)';
    }
  };

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'ADMIN':
        return <Shield size={16} color="var(--error)" />;
      case 'DESIGNER':
        return <UserPlus size={16} color="var(--warning)" />;
      case 'CLIENT':
        return <Users size={16} color="var(--primary)" />;
      default:
        return <Users size={16} color="var(--text-light)" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'var(--primary-light-bg)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px',
            animation: 'pulse 2s infinite'
          }}>
            <Sparkles size={24} color="var(--primary)" />
          </div>
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading users...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <RoleGuard requiredRole="ADMIN">
      <div className="min-h-screen gradient-bg">
        {/* Navigation */}
        <nav className="nav-container">
          <div className="nav-content">
            <div className="nav-brand">
              <div className="nav-logo">
                <Sparkles size={20} color="white" />
              </div>
              <span className="nav-brand-text">User Management</span>
            </div>
            <div className="nav-auth-desktop">
              <Link href="/admin" className="btn-ghost">
                <ArrowLeft size={16} />
                Back to Admin
              </Link>
            </div>
          </div>
        </nav>

        <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          {/* Header */}
          <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                  User Management
                </h1>
                <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
                  Manage user roles and permissions
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-dark)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={16} />
                  Create User
                </button>
                <div style={{ 
                  width: '72px', 
                  height: '72px', 
                  background: 'linear-gradient(135deg, #f6823b, #f65c8b)', 
                  borderRadius: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Users size={36} color="white" />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div style={{ 
                background: 'var(--primary-light-bg)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--primary)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                  {users.filter(u => u.role === 'CLIENT').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Clients</div>
              </div>
              <div style={{ 
                background: 'var(--warning-light-bg)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--warning)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>
                  {users.filter(u => u.role === 'DESIGNER').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Designers</div>
              </div>
              <div style={{ 
                background: 'var(--error-light-bg)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--error)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--error)', marginBottom: '4px' }}>
                  {users.filter(u => u.role === 'ADMIN').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Admins</div>
              </div>
              <div style={{ 
                background: 'var(--surface)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '4px' }}>
                  {users.length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Total Users</div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} color="var(--text-light)" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                >
                  <option value="ALL">All Roles</option>
                  <option value="CLIENT">Clients</option>
                  <option value="DESIGNER">Designers</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '300px' }}>
                <Search size={16} color="var(--text-light)" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
              Users ({filteredUsers.length})
            </h2>
            
            {error && (
              <div style={{ 
                background: 'var(--error-light-bg)', 
                border: '1px solid var(--error)', 
                color: 'var(--error)', 
                padding: '16px', 
                borderRadius: '12px', 
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <XCircle size={20} />
                {error}
              </div>
            )}

            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: 'var(--surface)', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px' 
                }}>
                  <Users size={32} color="var(--text-light)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                  No users found
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                  {searchTerm ? 'Try adjusting your search terms' : 'No users match the current filter'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredUsers.map((user) => (
                  <div key={user.id} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'var(--primary-light-bg)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {getRoleIcon(user.role)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                          {user.name}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        background: 'var(--surface)',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: getRoleColor(user.role),
                        border: `1px solid ${getRoleColor(user.role)}`
                      }}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleUpdate(user.id, e.target.value as User['role'])}
                          disabled={isUpdating === user.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '14px',
                            cursor: isUpdating === user.id ? 'not-allowed' : 'pointer',
                            opacity: isUpdating === user.id ? 0.7 : 1
                          }}
                        >
                          <option value="CLIENT">Client</option>
                          <option value="DESIGNER">Designer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        
                        {isUpdating === user.id && (
                          <div style={{ 
                            width: '20px', 
                            height: '20px', 
                            border: '2px solid var(--primary)', 
                            borderTop: '2px solid transparent', 
                            borderRadius: '50%', 
                            animation: 'spin 1s linear infinite' 
                          }}></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'var(--background)',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: 0, marginBottom: '4px' }}>
                    Create New User
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: 0 }}>
                    Creates a user record that can sign in with their email
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-light)',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface)';
                    e.currentTarget.style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = 'var(--text-light)';
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>


                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      Role *
                    </label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="CLIENT">Client</option>
                      <option value="DESIGNER">Designer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  {/* Company Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={createForm.companyName}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, companyName: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>

                  {/* Company Size */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      Company Size
                    </label>
                    <select
                      value={createForm.companySize}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, companySize: e.target.value as any }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="STARTUP">Startup (1-10)</option>
                      <option value="SMALL">Small (11-50)</option>
                      <option value="MEDIUM">Medium (51-200)</option>
                      <option value="LARGE">Large (201-1000)</option>
                      <option value="ENTERPRISE">Enterprise (1000+)</option>
                    </select>
                  </div>

                  {/* Error Message */}
                  {createError && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--error-light-bg)',
                      border: '1px solid var(--error)',
                      borderRadius: '8px',
                      color: 'var(--error)',
                      fontSize: '14px'
                    }}>
                      {createError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetCreateForm();
                      }}
                      style={{
                        padding: '12px 24px',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--background)';
                        e.currentTarget.style.borderColor = 'var(--text-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      style={{
                        padding: '12px 24px',
                        background: isCreating ? 'var(--text-light)' : 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isCreating ? 'not-allowed' : 'pointer',
                        opacity: isCreating ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {isCreating ? (
                        <>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid white',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          Create User
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
