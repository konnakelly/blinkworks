"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, AlertCircle, CheckCircle, Sparkles, FileText, Settings, Eye, Image, Video, File, X, Edit, Trash2, MessageSquare } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getTaskById, Task, deleteTask, reviewDesignerDelivery } from "@/lib/firestore";

export default function TaskDetailPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

  const handleReviewDelivery = async (status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED') => {
    if (!task || !user) return;
    
    // Require feedback for rejection and revision requests
    if ((status === 'REJECTED' || status === 'REVISION_REQUESTED') && !reviewFeedback.trim()) {
      alert('Please provide feedback when rejecting or requesting revisions.');
      return;
    }
    
    setIsSubmittingReview(true);
    try {
      await reviewDesignerDelivery(task.id, status, reviewFeedback, user.uid, true);
      
      // Refresh task data
      const updatedTask = await getTaskById(task.id);
      if (updatedTask) {
        setTask(updatedTask);
      }
      
      setReviewFeedback("");
      alert(`Delivery ${status.toLowerCase()} successfully!`);
    } catch (err) {
      console.error("Error reviewing delivery:", err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
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
      case 'info_requested':
        return <MessageSquare size={20} color="var(--warning)" />;
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
      case 'info_requested':
        return 'var(--warning)';
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
            gap: '4px', 
            marginBottom: '16px', 
            flexWrap: 'nowrap',
            overflowX: 'auto',
            padding: '0 16px'
          }}>
            {(() => {
              // Check if there are designer deliverables waiting for client review
              const hasDeliverablesForReview = task.designerDeliveries && 
                (task.designerDeliveries.files.length > 0 || task.designerDeliveries.links.length > 0) &&
                task.designerDeliveries.status === 'SUBMITTED';
              
              
              // Determine current display status based on task status and deliverables
              let currentDisplayStatus: string = task.status;
              if (hasDeliverablesForReview) {
                currentDisplayStatus = 'YOUR_REVIEW';
              }
              
              return ['SUBMITTED', 'IN_REVIEW', 'IN_PROGRESS', 'YOUR_REVIEW', 'COMPLETED'].map((displayStatus, index) => {
              
              const isActive = currentDisplayStatus === displayStatus;
              // When at YOUR_REVIEW, the first three steps (SUBMITTED, IN_REVIEW, IN_PROGRESS) should be completed
              const isCompleted = hasDeliverablesForReview 
                ? index < 3  // First three steps are completed when at YOUR_REVIEW
                : ['SUBMITTED', 'IN_REVIEW', 'IN_PROGRESS', 'YOUR_REVIEW', 'COMPLETED'].indexOf(currentDisplayStatus) > index;
              const isCurrent = currentDisplayStatus === displayStatus;
              
              
              return (
                <div key={displayStatus} style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCompleted || isCurrent ? 'var(--primary)' : 'var(--surface)',
                    color: isCompleted || isCurrent ? 'white' : 'var(--text-light)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: isCurrent ? '2px solid var(--primary-light-bg)' : 'none',
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    {isCompleted ? <CheckCircle size={16} /> : index + 1}
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--text)' : 'var(--text-light)',
                      marginBottom: '2px',
                      lineHeight: '1.2'
                    }}>
                      {displayStatus.replace('_', ' ')}
                    </div>
                    <div style={{ 
                      fontSize: '9px', 
                      color: 'var(--text-light)',
                      textTransform: 'capitalize',
                      lineHeight: '1.2'
                    }}>
                      {displayStatus === 'SUBMITTED' && 'Submitted'}
                      {displayStatus === 'IN_REVIEW' && 'Reviewing'}
                      {displayStatus === 'IN_PROGRESS' && 'Designing'}
                      {displayStatus === 'YOUR_REVIEW' && 'Your turn'}
                      {displayStatus === 'COMPLETED' && 'Done'}
                    </div>
                  </div>
                  {index < 4 && (
                    <div style={{
                      width: '40px',
                      height: '2px',
                      background: isCompleted ? 'var(--primary)' : 'var(--border)',
                      margin: '0 4px',
                      flexShrink: 0
                    }}></div>
                  )}
                </div>
              );
            });
            })()}
          </div>
          <div style={{ 
            textAlign: 'center', 
            fontSize: '14px', 
            color: 'var(--text-light)',
            fontStyle: 'italic'
          }}>
            {(() => {
              // Check if there are designer deliverables waiting for client review
              const hasDeliverablesForReview = task.designerDeliveries && 
                (task.designerDeliveries.files.length > 0 || task.designerDeliveries.links.length > 0) &&
                task.designerDeliveries.status === 'SUBMITTED';
              
              if (hasDeliverablesForReview) {
                return 'Your design is ready for review - please review the deliverables below';
              }
              
              if (task.status === 'SUBMITTED') return 'Your task has been submitted and is waiting for review';
              if (task.status === 'IN_REVIEW') return 'Our team is reviewing your requirements';
              if (task.status === 'IN_PROGRESS') return 'Our creative team is working on your project';
              if (task.status === 'READY_FOR_REVIEW') return 'Your task is ready for your review';
              if (task.status === 'INFO_REQUESTED') return 'Request for further information - Please edit and resubmit your task';
              if (task.status === 'COMPLETED') return 'Your task has been completed';
              return 'Task in progress';
            })()}
          </div>
        </div>

        {/* Admin Feedback Section - show current feedback for INFO_REQUESTED status */}
        {task.status === 'INFO_REQUESTED' && task.adminFeedback && (
          <div style={{
            background: 'var(--warning-light-bg)',
            border: '2px solid var(--warning)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <MessageSquare size={20} color="var(--warning)" />
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: 'var(--warning)', 
                margin: 0 
              }}>
                Request for Further Information
              </h3>
            </div>
            <p style={{ 
              fontSize: '15px', 
              color: 'var(--text)', 
              margin: 0,
              lineHeight: '1.5',
              background: 'var(--background)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              {task.adminFeedback}
            </p>
            
            {/* Action Required Notice */}
            <div style={{
              background: 'var(--background)',
              border: '1px solid var(--warning)',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                background: 'var(--warning)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <Edit size={14} color="white" />
              </div>
              <div>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: 'var(--warning)', 
                  margin: '0 0 8px 0' 
                }}>
                  Action Required
                </h4>
                <p style={{ 
                  fontSize: '13px', 
                  color: 'var(--text)', 
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  Please edit your task using the button below to address the feedback above and resubmit for review. 
                  Your task will not progress until you make the requested changes and resubmit.
                </p>
              </div>
            </div>
          </div>
        )}

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
              
              {/* Edit and Delete buttons - show for SUBMITTED and INFO_REQUESTED tasks */}
              {(task.status === 'SUBMITTED' || task.status === 'INFO_REQUESTED') && (
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

        {/* Designer Deliverables Section */}
        {task.designerDeliveries && (task.designerDeliveries.files.length > 0 || task.designerDeliveries.links.length > 0) && (
          <div className="card" style={{ padding: '32px', marginTop: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '24px' }}>
              Your Design
            </h2>
            
            {/* Deliverable Status */}
            {task.designerDeliveries.status && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: task.designerDeliveries.status === 'APPROVED' ? 'var(--success-light-bg)' : 
                             task.designerDeliveries.status === 'REJECTED' ? 'var(--error-light-bg)' :
                             task.designerDeliveries.status === 'REVISION_REQUESTED' ? 'var(--warning-light-bg)' : 'var(--surface)',
                  color: task.designerDeliveries.status === 'APPROVED' ? 'var(--success)' :
                         task.designerDeliveries.status === 'REJECTED' ? 'var(--error)' :
                         task.designerDeliveries.status === 'REVISION_REQUESTED' ? 'var(--warning)' : 'var(--text)',
                  border: `1px solid ${task.designerDeliveries.status === 'APPROVED' ? 'var(--success)' : 
                           task.designerDeliveries.status === 'REJECTED' ? 'var(--error)' :
                           task.designerDeliveries.status === 'REVISION_REQUESTED' ? 'var(--warning)' : 'var(--border)'}`
                }}>
                  {task.designerDeliveries.status === 'APPROVED' && <CheckCircle size={16} />}
                  {task.designerDeliveries.status === 'REJECTED' && <X size={16} />}
                  {task.designerDeliveries.status === 'REVISION_REQUESTED' && <AlertCircle size={16} />}
                  {task.designerDeliveries.status === 'SUBMITTED' && <Clock size={16} />}
                  {task.designerDeliveries.status.replace('_', ' ')}
                </div>
              </div>
            )}

            {/* Designer Notes */}
            {task.designerDeliveries.notes && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                  Designer Notes
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: '1.5' }}>
                  {task.designerDeliveries.notes}
                </p>
              </div>
            )}

            {/* Files */}
            {task.designerDeliveries.files.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                  Files
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {task.designerDeliveries.files.map((file, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      background: 'var(--surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      textAlign: 'center'
                    }}>
                      <File size={24} color="var(--text-light)" style={{ marginBottom: '8px' }} />
                      <p style={{ fontSize: '12px', color: 'var(--text)', margin: '0 0 8px 0', wordBreak: 'break-word' }}>
                        {file.name}
                      </p>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12px',
                          color: 'var(--primary)',
                          textDecoration: 'none'
                        }}
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {task.designerDeliveries.links.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                  Links
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {task.designerDeliveries.links.map((link, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      background: 'var(--surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '14px',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          display: 'block'
                        }}
                      >
                        {link.name}
                      </a>
                      {link.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '4px 0 0 0' }}>
                          {link.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Section - Only show if not already approved */}
            {task.designerDeliveries.status !== 'APPROVED' && (
              <div style={{ marginTop: '24px', padding: '20px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                  Review Deliverables
                </h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>
                    Feedback <span style={{ color: 'var(--text-light)', fontWeight: '400' }}>(Required for rejection/revision)</span>
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Provide feedback on the deliverables..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleReviewDelivery('APPROVED')}
                    disabled={isSubmittingReview}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--success)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                      opacity: isSubmittingReview ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  
                  <button
                    onClick={() => handleReviewDelivery('REVISION_REQUESTED')}
                    disabled={isSubmittingReview || !reviewFeedback.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: !reviewFeedback.trim() ? 'var(--text-light)' : 'var(--warning)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: (isSubmittingReview || !reviewFeedback.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (isSubmittingReview || !reviewFeedback.trim()) ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertCircle size={16} />
                    Request Revision
                  </button>
                  
                  <button
                    onClick={() => handleReviewDelivery('REJECTED')}
                    disabled={isSubmittingReview || !reviewFeedback.trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: !reviewFeedback.trim() ? 'var(--text-light)' : 'var(--error)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: (isSubmittingReview || !reviewFeedback.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (isSubmittingReview || !reviewFeedback.trim()) ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Show existing feedback */}
            {(task.designerDeliveries.clientFeedback || task.designerDeliveries.adminFeedback) && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                  Feedback
                </h3>
                {task.designerDeliveries.clientFeedback && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-light)', marginBottom: '4px' }}>
                      Your Feedback:
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text)', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                      {task.designerDeliveries.clientFeedback}
                    </p>
                  </div>
                )}
                {task.designerDeliveries.adminFeedback && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-light)', marginBottom: '4px' }}>
                      Admin Feedback:
                    </p>
                    <p style={{ fontSize: '14px', color: 'var(--text)', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                      {task.designerDeliveries.adminFeedback}
                    </p>
                  </div>
                )}
              </div>
            )}
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
