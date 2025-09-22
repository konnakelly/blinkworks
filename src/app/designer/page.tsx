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
  Search,
  Star,
  DollarSign,
  Calendar,
  Image,
  Video,
  File,
  MapPin,
  Briefcase
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAllTasks, Task, claimTask } from "@/lib/firestore";
import { RoleGuard } from "@/components/RoleGuard";
import Navbar from "@/components/Navbar";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function DesignerMarketplace() {
  const { user, loading: authLoading } = useAuthContext();
  const { userRole } = useRoleAccess();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("available");
  const [searchTerm, setSearchTerm] = useState("");
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

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

  const handleClaimTask = async (taskId: string) => {
    if (!user) return;
    
    setIsClaiming(taskId);
    try {
      await claimTask(taskId, user.uid);
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'IN_PROGRESS', assignedDesigner: user.uid }
          : task
      ));
      alert("Task claimed successfully! You can now start working on it.");
    } catch (error) {
      console.error("Error claiming task:", error);
      alert("Failed to claim task. Please try again.");
    } finally {
      setIsClaiming(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={16} color="var(--success)" />;
      case 'in_progress':
        return <Zap size={16} color="var(--warning)" />;
      case 'ready_for_review':
        return <AlertCircle size={16} color="var(--accent-color)" />;
      case 'in_review':
        return <Clock size={16} color="var(--primary)" />;
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
      case 'in_progress':
        return 'var(--warning)';
      case 'ready_for_review':
        return 'var(--accent-color)';
      case 'in_review':
        return 'var(--primary)';
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
    // Only show tasks that have been pushed to marketplace
    const isPushedToMarketplace = task.pushedToMarketplace === true;
    // Only show tasks that are not assigned to a specific designer
    const isNotAssigned = !task.assignedDesigner;
    // Available tasks are those pushed to marketplace and not assigned
    const isAvailable = isPushedToMarketplace && isNotAssigned;
    // My tasks are those assigned to me
    const isMyTask = task.assignedDesigner === user?.uid;
    // My completed tasks
    const isMyCompleted = task.status === 'COMPLETED' && task.assignedDesigner === user?.uid;
    
    // Check if user is admin
    const isAdmin = userRole?.role === 'ADMIN';
    
    // Admins can see all tasks, designers can only see available + their own tasks
    const shouldShow = isAdmin ? true : (isAvailable || isMyTask || isMyCompleted);
    
    const matchesFilter = filter === "available" ? isAvailable : 
                         filter === "myTasks" ? isMyTask :
                         filter === "completed" ? isMyCompleted :
                         shouldShow; // "all" filter shows available + my tasks + my completed
    
    const matchesSearch = searchTerm === "" || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatTaskType(task.type).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const taskStats = {
    available: tasks.filter(t => t.pushedToMarketplace === true && !t.assignedDesigner).length,
    myTasks: tasks.filter(t => t.assignedDesigner === user?.uid && t.status !== 'COMPLETED').length,
    completed: tasks.filter(t => t.status === 'COMPLETED' && t.assignedDesigner === user?.uid).length,
    total: tasks.filter(t => {
      const isAvailable = t.pushedToMarketplace === true && !t.assignedDesigner;
      const isMyTask = t.assignedDesigner === user?.uid;
      return isAvailable || isMyTask;
    }).length
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
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <RoleGuard requiredRoles={["DESIGNER", "ADMIN"]} fallbackPath="/admin">
      <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <Navbar variant="designer" />

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                {userRole?.role === 'ADMIN' ? 'Designer Marketplace (Admin View)' : 'Designer Marketplace'}
              </h1>
              <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
                {userRole?.role === 'ADMIN' 
                  ? 'Monitor and manage all creative projects and designer assignments'
                  : 'Find and claim creative projects to work on'
                }
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
              <Briefcase size={36} color="white" />
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ 
              background: 'var(--primary-light-bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--primary)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                {taskStats.available}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Available Projects</div>
            </div>
            <div style={{ 
              background: 'var(--warning-light-bg)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: '1px solid var(--warning)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>
                {taskStats.myTasks}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>My Active Tasks</div>
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
              <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Total Projects</div>
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
                <option value="available">Available Projects</option>
                <option value="myTasks">My Active Tasks</option>
                <option value="completed">Completed</option>
                <option value="all">My Projects & Available</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '300px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Search projects..."
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

        {/* Projects Grid */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
            {filter === 'available' ? 'Available Projects' : 
             filter === 'myTasks' ? 'My Active Tasks' :
             filter === 'completed' ? 'My Completed Projects' : 'My Projects & Available'} ({filteredTasks.length})
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
                <Briefcase size={32} color="var(--text-light)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                No projects found
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                {searchTerm ? 'Try adjusting your search terms' : 'No projects match the current filter'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
              {filteredTasks.map((task) => {
                const isMyTask = task.assignedDesigner === user?.uid;
                const isAvailable = task.pushedToMarketplace === true && !task.assignedDesigner;
                const canClaim = isAvailable && !isMyTask;
                
                return (
                  <div key={task.id} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '24px',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: 'var(--surface)',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: getStatusColor(task.status),
                      border: `1px solid ${getStatusColor(task.status)}`
                    }}>
                      {getStatusIcon(task.status)}
                      {task.status.replace('_', ' ')}
                    </div>

                    {/* Task Type Icon */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'var(--primary-light-bg)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      {task.type === 'STATIC_DESIGN' && <Image size={24} color="var(--primary)" />}
                      {task.type === 'VIDEO_PRODUCTION' && <Video size={24} color="var(--primary)" />}
                      {task.type === 'ANIMATION' && <Zap size={24} color="var(--primary)" />}
                      {task.type === 'ILLUSTRATION' && <FileText size={24} color="var(--primary)" />}
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px', lineHeight: '1.3' }}>
                      {task.title}
                    </h3>
                    
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '16px', lineHeight: '1.5' }}>
                      {task.description.length > 120 ? `${task.description.substring(0, 120)}...` : task.description}
                    </p>

                    {/* Task Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-light)' }}>
                        <Briefcase size={14} />
                        <span>{formatTaskType(task.type)}</span>
                        <span>•</span>
                        <span>{task.priority} Priority</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-light)' }}>
                        <Calendar size={14} />
                        <span>Posted {getRelativeTime(task.createdAt)}</span>
                        {task.deadline && (
                          <>
                            <span>•</span>
                            <span>Due {formatDate(task.deadline)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reference Files Count */}
                    {task.requirements.uploadedFiles && task.requirements.uploadedFiles.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '12px', 
                        color: 'var(--primary)',
                        marginBottom: '16px'
                      }}>
                        <File size={14} />
                        <span>{task.requirements.uploadedFiles.length} reference file{task.requirements.uploadedFiles.length > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Link 
                        href={`/designer/tasks/${task.id}`}
                        className="btn-outline"
                        style={{ flex: 1, padding: '10px 16px', fontSize: '14px', textAlign: 'center' }}
                      >
                        <Eye size={16} />
                        View Details
                      </Link>
                      
                      {canClaim && (
                        <button
                          onClick={() => handleClaimTask(task.id)}
                          disabled={isClaiming === task.id}
                          className="btn-primary"
                          style={{ 
                            padding: '10px 16px', 
                            fontSize: '14px',
                            opacity: isClaiming === task.id ? 0.7 : 1,
                            cursor: isClaiming === task.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isClaiming === task.id ? (
                            <>
                              <div style={{ 
                                width: '14px', 
                                height: '14px', 
                                border: '2px solid white', 
                                borderTop: '2px solid transparent', 
                                borderRadius: '50%', 
                                animation: 'spin 1s linear infinite' 
                              }}></div>
                              Claiming...
                            </>
                          ) : (
                            <>
                              <Briefcase size={16} />
                              Claim
                            </>
                          )}
                        </button>
                      )}
                      
                      {isMyTask && (
                        <div style={{
                          padding: '10px 16px',
                          background: 'var(--warning-light-bg)',
                          color: 'var(--warning)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <CheckCircle size={16} />
                          My Task
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
