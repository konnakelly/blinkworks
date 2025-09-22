"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  Users, 
  FileText, 
  Sparkles,
  BarChart3,
  Zap,
  Filter,
  Search
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAllTasks, Task } from "@/lib/firestore";
import { RoleGuard } from "@/components/RoleGuard";
import Navbar from "@/components/Navbar";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    const fetchTasks = async () => {
      if (user) {
        setLoading(true);
        try {
          const allTasks = await getAllTasks();
          setTasks(allTasks);
        } catch (err) {
          console.error("Error fetching tasks:", err);
          setError("Failed to load tasks.");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTasks();
  }, [user, authLoading, router]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={16} color="var(--success)" />;
      case 'designing':
        return <Zap size={16} color="var(--warning)" />;
      case 'under_review':
        return <Clock size={16} color="var(--accent-color)" />;
      case 'submitted':
        return <AlertCircle size={16} color="var(--primary)" />;
      default:
        return <Clock size={16} color="var(--text-light)" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'var(--success)';
      case 'designing':
        return 'var(--warning)';
      case 'under_review':
        return 'var(--accent-color)';
      case 'submitted':
        return 'var(--primary)';
      default:
        return 'var(--text-light)';
    }
  };

  const formatTaskType = (type: string) => {
    switch (type) {
      case 'STATIC_DESIGN':
        return 'Static Design';
      case 'VIDEO':
        return 'Video';
      case 'ANIMATION':
        return 'Animation';
      case 'ILLUSTRATION':
        return 'Illustration';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return formatDate(date);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === "all" || task.status.toLowerCase() === filter.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const taskStats = {
    total: tasks.length,
    submitted: tasks.filter(t => t.status === 'SUBMITTED').length,
    inReview: tasks.filter(t => t.status === 'IN_REVIEW').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    readyForReview: tasks.filter(t => t.status === 'READY_FOR_REVIEW').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length
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
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading admin dashboard...</p>
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
      <Navbar variant="admin" />

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                Admin Dashboard
              </h1>
              <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
                Manage client submissions and designer assignments
              </p>
            </div>
            <div style={{ 
              width: '72px', 
              height: '72px', 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <BarChart3 size={36} color="white" />
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ 
              background: 'var(--surface)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '4px' }}>
                {taskStats.total}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Total Tasks</div>
            </div>
            <div style={{ 
              background: 'var(--primary-light-bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--primary)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                {taskStats.submitted}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Submitted</div>
            </div>
            <div style={{ 
              background: 'var(--accent-light-bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--accent-color)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '4px' }}>
                {taskStats.inReview}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>In Review</div>
            </div>
            <div style={{ 
              background: 'var(--warning-light-bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--warning)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>
                {taskStats.inProgress}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>In Progress</div>
            </div>
            <div style={{ 
              background: 'var(--primary-light-bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--primary)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                {taskStats.readyForReview}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Ready for Review</div>
            </div>
            <div style={{ 
              background: 'var(--success-light-bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--success)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '4px' }}>
                {taskStats.completed}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Completed</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card" style={{ marginBottom: '32px', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="var(--text-light)" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Tasks</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="designing">Designing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '300px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Search tasks..."
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

        {/* Tasks List */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
            Tasks ({filteredTasks.length})
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
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {filteredTasks.length === 0 ? (
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
                <FileText size={32} color="var(--text-light)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                No tasks found
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                {searchTerm ? 'Try adjusting your search terms' : 'No tasks match the current filter'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredTasks.map((task) => (
                <div key={task.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                        {task.title}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px', lineHeight: '1.5' }}>
                        {task.description.length > 150 ? `${task.description.substring(0, 150)}...` : task.description}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-light)' }}>
                        <span><strong>Type:</strong> {formatTaskType(task.type)}</span>
                        <span><strong>Priority:</strong> {task.priority}</span>
                        <span><strong>Created:</strong> {getRelativeTime(task.createdAt)}</span>
                        {task.deadline && (
                          <span><strong>Deadline:</strong> {formatDate(task.deadline)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '6px 12px', 
                        borderRadius: '16px', 
                        background: 'var(--surface)',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: getStatusColor(task.status)
                      }}>
                        {getStatusIcon(task.status)}
                        {task.status.replace('_', ' ')}
                      </div>
                      <Link 
                        href={`/admin/tasks/${task.id}`}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '14px' }}
                      >
                        <Eye size={16} />
                        Review
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
