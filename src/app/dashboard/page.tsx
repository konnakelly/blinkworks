"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, Clock, AlertCircle, CheckCircle, BarChart3, Users, Zap, Sparkles, Download, ExternalLink, Image, File, Video, Palette } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTasksByUserId, createBrand, getBrandByUserId, Task } from "@/lib/firestore";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (user && userProfile) {
        setLoadingTasks(true);
        try {
          // Ensure user has a brand
          let brand = await getBrandByUserId(user.uid);
          if (!brand && userProfile.companyName) {
            brand = await createBrand({
              name: userProfile.companyName,
              size: userProfile.companySize || 'STARTUP',
              userId: user.uid,
            });
          }

          const userTasks = await getTasksByUserId(user.uid);
          setTasks(userTasks);
        } catch (error) {
          console.error("Error fetching tasks:", error);
        } finally {
          setLoadingTasks(false);
        }
      }
    };

    fetchTasks();
  }, [user, userProfile]);

  // Early return to prevent rendering when user is not authenticated
  if (!authLoading && !user) {
    return null;
  }

  if (authLoading) {
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
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (userProfile?.role === "ADMIN") {
    router.push("/admin");
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={16} color="var(--success)" />;
      case 'in_progress':
        return <Clock size={16} color="var(--warning)" />;
      case 'pending':
        return <AlertCircle size={16} color="var(--accent-color)" />;
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
      case 'pending':
        return 'var(--accent-color)';
      default:
        return 'var(--text-light)';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'var(--error)';
      case 'medium':
        return 'var(--warning)';
      case 'low':
        return 'var(--success)';
      default:
        return 'var(--text-light)';
    }
  };

  const formatTaskType = (type: string) => {
    switch (type) {
      case 'STATIC_DESIGN':
        return 'Static Design';
      case 'VIDEO_PRODUCTION':
        return 'Video Production';
      case 'ANIMATION':
        return 'Animation';
      case 'ILLUSTRATION':
        return 'Illustration';
      case 'BRANDING':
        return 'Branding';
      case 'WEB_DESIGN':
        return 'Web Design';
      case 'OTHER':
        return 'Other';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    
    try {
      // Handle Firestore Timestamp objects
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      
      // Handle regular Date objects or date strings
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'N/A';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRelativeTime = (date: any, isDeadline: boolean = false) => {
    if (!date) return 'N/A';
    
    try {
      let dateObj;
      
      // Handle Firestore Timestamp objects
      if (date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else {
        dateObj = new Date(date);
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }
      
      const now = new Date();
      const diffTime = dateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.ceil(diffTime / (1000 * 60));
      
      if (isDeadline) {
        // For deadlines, show time remaining
        if (diffDays < 0) {
          return { text: 'Overdue', type: 'overdue' };
        } else if (diffDays === 0) {
          return { text: 'Due today', type: 'urgent' };
        } else if (diffDays === 1) {
          return { text: 'Due tomorrow', type: 'urgent' };
        } else if (diffDays <= 7) {
          return { text: `${diffDays} days`, type: 'warning' };
        } else if (diffDays <= 30) {
          const weeks = Math.floor(diffDays / 7);
          return { text: `${weeks} week${weeks > 1 ? 's' : ''}`, type: 'normal' };
        } else {
          const months = Math.floor(diffDays / 30);
          return { text: `${months} month${months > 1 ? 's' : ''}`, type: 'normal' };
        }
      } else {
        // For created dates, show time since
        if (diffMinutes < 60) {
          if (diffMinutes <= 1) {
            return 'Just now';
          }
          return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
          return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays === 0) {
          return 'Today';
        } else if (diffDays === 1) {
          return 'Yesterday';
        } else if (diffDays <= 7) {
          return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
        } else if (diffDays <= 30) {
          const weeks = Math.floor(Math.abs(diffDays) / 7);
          return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays <= 365) {
          const months = Math.floor(Math.abs(diffDays) / 30);
          return `${months} month${months > 1 ? 's' : ''} ago`;
        } else {
          const years = Math.floor(Math.abs(diffDays) / 365);
          return `${years} year${years > 1 ? 's' : ''} ago`;
        }
      }
    } catch (error) {
      console.error('Time calculation error:', error);
      return 'N/A';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTimeUntilDeadline = (deadline: any) => {
    return getRelativeTime(deadline, true);
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <Navbar variant="dashboard" />

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {/* Welcome Header */}
        <div className="card" style={{ marginBottom: '32px', textAlign: 'center', padding: '32px' }}>
          <div style={{ 
            width: '72px', 
            height: '72px', 
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px' 
          }}>
            <Users size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '12px' }}>
            Welcome back, {userProfile?.name || userProfile?.email}!
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
            Manage your creative projects and track their progress
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              background: 'var(--primary-light-bg)', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px' 
            }}>
              <BarChart3 size={28} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
              {tasks.length}
            </div>
            <div style={{ color: 'var(--text-light)', fontSize: '16px', fontWeight: '500' }}>Total Tasks</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              background: 'var(--success-light-bg)', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px' 
            }}>
              <CheckCircle size={28} color="var(--success)" />
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
              {tasks.filter(task => task.status.toLowerCase() === 'completed').length}
            </div>
            <div style={{ color: 'var(--text-light)', fontSize: '16px', fontWeight: '500' }}>Completed</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              background: 'var(--warning-light-bg)', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px' 
            }}>
              <Clock size={28} color="var(--warning)" />
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
              {tasks.filter(task => task.status.toLowerCase() === 'in_progress').length}
            </div>
            <div style={{ color: 'var(--text-light)', fontSize: '16px', fontWeight: '500' }}>In Progress</div>
          </div>
          
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              background: 'var(--accent-light-bg)', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px' 
            }}>
              <AlertCircle size={28} color="var(--accent-color)" />
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
              {tasks.filter(task => ['IN_REVIEW', 'READY_FOR_REVIEW', 'INFO_REQUESTED'].includes(task.status)).length}
            </div>
            <div style={{ color: 'var(--text-light)', fontSize: '16px', fontWeight: '500' }}>Action Required</div>
          </div>
        </div>

        {/* My Creatives Section - Compact */}
        <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
              My Creatives
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--text-light)', 
                background: 'var(--surface)', 
                padding: '4px 8px', 
                borderRadius: '4px',
                border: '1px solid var(--border)'
              }}>
                {tasks.filter(task => task.status.toLowerCase() === 'completed' && task.designerDeliveries).length} completed
              </div>
              <Link 
                href="/dashboard/creatives" 
                style={{ 
                  fontSize: '12px', 
                  color: 'var(--primary)', 
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View All <ExternalLink size={12} />
              </Link>
            </div>
          </div>

          {(() => {
            const completedTasks = tasks.filter(task => 
              task.status.toLowerCase() === 'completed' && 
              task.designerDeliveries && 
              (task.designerDeliveries.files.length > 0 || task.designerDeliveries.links.length > 0)
            ).slice(0, 3); // Show only first 3

            if (completedTasks.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: 'var(--surface)', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 16px' 
                  }}>
                    <Sparkles size={24} color="var(--text-light)" />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    No completed designs yet
                  </h3>
                  <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '14px' }}>
                    Your approved designs will appear here
                  </p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {completedTasks.map((task) => (
                  <div key={task.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'var(--primary-light-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        background: 'var(--primary-light-bg)', 
                        color: 'var(--primary)',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}>
                        {(() => {
                          switch (task.type) {
                            case 'STATIC_DESIGN': return <Image size={10} />;
                            case 'VIDEO_PRODUCTION': return <Video size={10} />;
                            case 'ANIMATION': return <Sparkles size={10} />;
                            case 'ILLUSTRATION': return <Palette size={10} />;
                            case 'BRANDING': return <Palette size={10} />;
                            case 'WEB_DESIGN': return <File size={10} />;
                            default: return <File size={10} />;
                          }
                        })()}
                        {formatTaskType(task.type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', margin: 0, marginBottom: '2px' }}>
                          {task.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-light)' }}>
                          <span>
                            {task.designerDeliveries?.files && task.designerDeliveries.files.length > 0 && `${task.designerDeliveries.files.length} file${task.designerDeliveries.files.length > 1 ? 's' : ''}`}
                            {task.designerDeliveries?.files && task.designerDeliveries.files.length > 0 && task.designerDeliveries?.links && task.designerDeliveries.links.length > 0 && ' • '}
                            {task.designerDeliveries?.links && task.designerDeliveries.links.length > 0 && `${task.designerDeliveries.links.length} link${task.designerDeliveries.links.length > 1 ? 's' : ''}`}
                          </span>
                          <span>•</span>
                          <span>Completed {formatDate(task.reviewedAt || task.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Delivery Link */}
                      {task.designerDeliveries?.links && task.designerDeliveries.links.length > 0 && (
                        <a
                          href={(() => {
                            const url = task.designerDeliveries.links[0].url;
                            if (!url) return '#';
                            if (url.startsWith('http://') || url.startsWith('https://')) {
                              return url;
                            }
                            return `https://${url}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '11px', 
                            color: 'var(--primary)', 
                            textDecoration: 'none',
                            fontWeight: '500',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'var(--background)',
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary-light-bg)';
                            e.currentTarget.style.borderColor = 'var(--primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--background)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <ExternalLink size={10} />
                          Link
                        </a>
                      )}
                      
                      {/* View Details Link */}
                      <Link 
                        href={`/dashboard/tasks/${task.id}`} 
                        style={{ 
                          fontSize: '11px', 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          fontWeight: '500',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-light-bg)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--background)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
                {tasks.filter(task => task.status.toLowerCase() === 'completed' && task.designerDeliveries).length > 3 && (
                  <div style={{ textAlign: 'center', padding: '12px' }}>
                    <Link 
                      href="/dashboard/creatives" 
                      style={{ 
                        fontSize: '12px', 
                        color: 'var(--primary)', 
                        textDecoration: 'none',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      View all {tasks.filter(task => task.status.toLowerCase() === 'completed' && task.designerDeliveries).length} creatives <ExternalLink size={12} />
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Tasks Section */}
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
              Your Creative Tasks
            </h2>
            <Link href="/dashboard/tasks/new" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
              <PlusCircle size={20} />
              Create New Task
            </Link>
          </div>

          {loadingTasks ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                background: 'var(--primary-light-bg)', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 20px',
                animation: 'pulse 2s infinite'
              }}>
                <Zap size={28} color="var(--primary)" />
              </div>
              <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>Loading your tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ 
                width: '72px', 
                height: '72px', 
                background: 'var(--surface)', 
                borderRadius: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 24px' 
              }}>
                <PlusCircle size={36} color="var(--text-light)" />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                No tasks yet
              </h3>
              <p style={{ color: 'var(--text-light)', marginBottom: '32px', fontSize: '16px' }}>
                Create your first creative brief to get started!
              </p>
              <Link href="/dashboard/tasks/new" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                <PlusCircle size={20} />
                Create Your First Task
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {tasks.map((task) => (
                <div key={task.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', margin: 0, flex: 1 }}>
                      {task.title}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      background: 'var(--surface)',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: getStatusColor(task.status)
                    }}>
                      {getStatusIcon(task.status)}
                      {task.status}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}>
                      <strong>Type:</strong> {formatTaskType(task.type)}
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}>
                      <strong>Priority:</strong> 
                      <span style={{ 
                        color: getPriorityColor(task.priority), 
                        fontWeight: '600',
                        marginLeft: '4px'
                      }}>
                        {task.priority}
                      </span>
                    </p>
                    {task.deadline && (
                      <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '0 0 8px 0' }}>
                        <strong>Deadline:</strong> {(() => {
                          const timeInfo = getTimeUntilDeadline(task.deadline);
                          if (!timeInfo) return formatDate(task.deadline);
                          
                          // Handle both string and object return types
                          if (typeof timeInfo === 'string') {
                            return <span style={{ color: 'var(--text-light)' }}>{timeInfo}</span>;
                          }
                          
                          // Color code based on urgency but keep as regular text
                          let textColor = 'var(--text-light)';
                          if (timeInfo.type === 'overdue') {
                            textColor = 'var(--error)';
                          } else if (timeInfo.type === 'urgent') {
                            textColor = 'var(--warning)';
                          } else if (timeInfo.type === 'warning') {
                            textColor = 'var(--accent-color)';
                          }
                          
                          return (
                            <span style={{ color: textColor }}>
                              {timeInfo.text}
                            </span>
                          );
                        })()}
                      </p>
                    )}
                    <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                      <strong>Created:</strong> {(() => {
                        const timeInfo = getRelativeTime(task.createdAt);
                        return typeof timeInfo === 'string' ? timeInfo : timeInfo.text;
                      })()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <Link 
                      href={`/dashboard/tasks/${task.id}`} 
                      className="btn-outline"
                      style={{ flex: 1, textAlign: 'center', fontSize: '14px', padding: '10px 16px' }}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}