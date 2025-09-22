"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, AlertCircle, CheckCircle, Sparkles, FileText, Settings, Eye, Image, Video, File, X, Edit, Trash2 } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTaskById, Task, deleteTask } from "@/lib/firestore";

export default function TaskDetailPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchTask = async () => {
      if (user && params.id) {
        setLoading(true);
        try {
          const taskData = await getTaskById(params.id as string);
          if (taskData) {
            setTask(taskData);
          } else {
            setError("Task not found");
          }
        } catch (error) {
          console.error("Error fetching task:", error);
          setError("Failed to load task");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTask();
  }, [user, params.id]);

  const handleDeleteTask = async () => {
    if (!task) return;
    
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEditTask = () => {
    if (!task) return;
    router.push(`/dashboard/tasks/${task.id}/edit`);
  };

  const formatTaskType = (type: string) => {
    switch (type) {
      case 'STATIC_DESIGN':
        return 'Static Design';
      case 'VIDEO_EDITING':
        return 'Video Editing';
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
        return type;
    }
  };

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

  const getRelativeTime = (date: any) => {
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
    } catch (error) {
      console.error('Time calculation error:', error);
      return 'N/A';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle size={20} color="var(--success)" />;
      case 'in_progress':
        return <Clock size={20} color="var(--warning)" />;
      case 'pending':
        return <AlertCircle size={20} color="var(--accent-color)" />;
      default:
        return <Clock size={20} color="var(--text-light)" />;
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
          <p style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>Loading task...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !task) {
    return (
      <div className="min-h-screen gradient-bg">
        <nav className="nav-container">
          <div className="nav-content">
            <div className="nav-brand">
              <div className="nav-logo">
                <Sparkles size={20} color="white" />
              </div>
              <span className="nav-brand-text">BlinkWorks</span>
            </div>
            <div className="nav-auth-desktop">
              <Link href="/dashboard" className="btn-ghost">Back to Dashboard</Link>
            </div>
          </div>
        </nav>

        <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ 
              width: '72px', 
              height: '72px', 
              background: 'var(--error-light-bg)', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 24px' 
            }}>
              <X size={36} color="var(--error)" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '12px' }}>
              {error || 'Task Not Found'}
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--text-light)', marginBottom: '32px' }}>
              {error || 'The task you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
            </p>
            <Link href="/dashboard" className="btn-primary">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="nav-container">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="nav-logo">
              <Sparkles size={20} color="white" />
            </div>
            <span className="nav-brand-text">BlinkWorks</span>
          </div>
          <div className="nav-auth-desktop">
            <Link href="/dashboard" className="btn-ghost">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
        {/* Progress Bar */}
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px', textAlign: 'center' }}>
            Task Progress
          </h2>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            marginBottom: '16px', 
            flexWrap: 'wrap'
          }}>
            {['SUBMITTED', 'UNDER_REVIEW', 'DESIGNING', 'COMPLETED'].map((status, index) => {
              const isActive = task.status === status;
              const isCompleted = ['SUBMITTED', 'UNDER_REVIEW', 'DESIGNING', 'COMPLETED'].indexOf(task.status) > index;
              const isCurrent = task.status === status;
              
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCompleted || isCurrent ? 'var(--primary)' : 'var(--surface)',
                    color: isCompleted || isCurrent ? 'white' : 'var(--text-light)',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: isCurrent ? '3px solid var(--primary-light-bg)' : 'none',
                    position: 'relative'
                  }}>
                    {isCompleted ? <CheckCircle size={20} /> : index + 1}
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '100px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--text)' : 'var(--text-light)',
                      marginBottom: '4px'
                    }}>
                      {status.replace('_', ' ')}
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: 'var(--text-light)',
                      textTransform: 'capitalize'
                    }}>
                      {status === 'SUBMITTED' && 'Task submitted'}
                      {status === 'UNDER_REVIEW' && 'Being reviewed'}
                      {status === 'DESIGNING' && 'In progress'}
                      {status === 'COMPLETED' && 'Finished'}
                    </div>
                  </div>
                  {index < 3 && (
                    <div style={{
                      width: '60px',
                      height: '2px',
                      background: isCompleted ? 'var(--primary)' : 'var(--border)',
                      margin: '0 8px'
                    }}></div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ 
            textAlign: 'center', 
            fontSize: '14px', 
            color: 'var(--text-light)',
            fontStyle: 'italic'
          }}>
            {task.status === 'SUBMITTED' && 'Your task has been submitted and is waiting for review'}
            {task.status === 'IN_REVIEW' && 'Our team is reviewing your requirements'}
            {task.status === 'IN_PROGRESS' && 'Our creative team is working on your project'}
            {task.status === 'READY_FOR_REVIEW' && 'Your task is ready for your review'}
            {task.status === 'COMPLETED' && 'Your task has been completed'}
          </div>
        </div>

        {/* Task Header */}
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
                {task.title}
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--text-light)', margin: 0 }}>
                {task.description}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                borderRadius: '12px', 
                background: 'var(--surface)',
                fontSize: '14px',
                fontWeight: '600',
                color: getStatusColor(task.status)
              }}>
                {getStatusIcon(task.status)}
                {task.status}
              </div>
              
              {/* Edit and Delete buttons - only show for SUBMITTED tasks */}
              {task.status === 'SUBMITTED' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleEditTask}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--primary-dark)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--primary)';
                    }}
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--error-dark)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--error)';
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Type
              </div>
              <div style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '500' }}>
                {formatTaskType(task.type)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Priority
              </div>
              <div style={{ fontSize: '16px', color: getPriorityColor(task.priority), fontWeight: '500' }}>
                {task.priority}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Created
              </div>
              <div style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '500' }}>
                {getRelativeTime(task.createdAt)}
              </div>
            </div>
            {task.deadline && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Deadline
                </div>
                <div style={{ fontSize: '16px', color: 'var(--text)', fontWeight: '500' }}>
                  {formatDate(task.deadline)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Requirements Section */}
        {task.requirements && (
          <div className="card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
              Creative Requirements
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {task.requirements.contentType && task.requirements.contentType.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Content Type
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {task.requirements.contentType.map((type, index) => (
                      <span key={index} style={{
                        padding: '4px 12px',
                        background: 'var(--primary-light-bg)',
                        color: 'var(--primary)',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {task.requirements.brandGuidelines && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Brand Guidelines
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: '1.6' }}>
                    {task.requirements.brandGuidelines}
                  </p>
                </div>
              )}

              {task.requirements.mustInclude && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Must Include
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: '1.6' }}>
                    {task.requirements.mustInclude}
                  </p>
                </div>
              )}

              {task.requirements.doNotUse && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    Do Not Use
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: '1.6' }}>
                    {task.requirements.doNotUse}
                  </p>
                </div>
              )}

                  {task.requirements.uploadedFiles && task.requirements.uploadedFiles.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        Reference Files
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {task.requirements.uploadedFiles.map((file, index) => (
                          <div key={index} style={{
                            padding: '12px',
                            background: 'var(--surface)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px'
                          }}>
                            <div style={{ color: 'var(--primary)', marginTop: '2px' }}>
                              {file.type.startsWith('image/') ? <Image size={20} /> : 
                               file.type.startsWith('video/') ? <Video size={20} /> : 
                               <File size={20} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <a
                                href={file.downloadURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  color: 'var(--primary)',
                                  textDecoration: 'none',
                                  display: 'block',
                                  marginBottom: '8px'
                                }}
                              >
                                {file.name}
                              </a>
                              <div style={{
                                fontSize: '12px',
                                color: 'var(--text-light)',
                                marginBottom: '8px'
                              }}>
                                {Math.round(file.size / 1024)} KB • {file.type}
                              </div>
                              
                              {/* Image Preview */}
                              {file.type.startsWith('image/') && (
                                <div style={{
                                  marginTop: '8px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  maxWidth: '300px'
                                }}>
                                  <img
                                    src={file.downloadURL}
                                    alt={file.name}
                                    style={{
                                      width: '100%',
                                      height: 'auto',
                                      maxHeight: '200px',
                                      objectFit: 'cover',
                                      display: 'block',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(file.downloadURL, '_blank')}
                                    onError={(e) => {
                                      // Hide image if it fails to load
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                              
                              {/* Video Preview */}
                              {file.type.startsWith('video/') && (
                                <div style={{
                                  marginTop: '8px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface)',
                                  maxWidth: '300px'
                                }}>
                                  <video
                                    src={file.downloadURL}
                                    controls
                                    style={{
                                      width: '100%',
                                      height: 'auto',
                                      maxHeight: '200px',
                                      objectFit: 'cover',
                                      display: 'block'
                                    }}
                                    onError={(e) => {
                                      // Hide video if it fails to load
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.requirements.references && task.requirements.references.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        Reference Links
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {task.requirements.references.map((ref, index) => (
                          <div key={index} style={{
                            padding: '12px',
                            background: 'var(--surface)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                          }}>
                            <a
                              href={ref.startsWith('http') ? ref : `https://${ref}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '14px',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                display: 'block'
                              }}
                            >
                              {ref}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'var(--error-light-bg)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash2 size={24} color="var(--error)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px' }}>
              Delete Task
            </h3>
            <p style={{ fontSize: '16px', color: 'var(--text-light)', marginBottom: '24px' }}>
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '12px 24px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={isDeleting}
                style={{
                  padding: '12px 24px',
                  background: 'var(--error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
