"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  FileText, 
  Sparkles,
  BarChart3,
  Zap,
  Filter,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  ThumbsDown,
  MessageSquare,
  X,
  Play
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAllTasks, Task, getUserById, User as FirestoreUser, getAllUsers, rejectTaskWithFeedback, assignTaskToDesigner, sendTaskToMarketplace, updateTaskStatus } from "@/lib/firestore";
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
  const [clientInfo, setClientInfo] = useState<Record<string, FirestoreUser>>({});
  const [showCarousel, setShowCarousel] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [designers, setDesigners] = useState<FirestoreUser[]>([]);
  const [designerWorkloads, setDesignerWorkloads] = useState<Record<string, number>>({});
  const [showDesignerAssignment, setShowDesignerAssignment] = useState(false);
  const [selectedStatFilter, setSelectedStatFilter] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: 'reject' | 'assign' | 'marketplace' | 'approve';
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showConfirmationModal = (type: 'reject' | 'assign' | 'marketplace' | 'approve', message: string, onConfirm: () => void) => {
    setConfirmationAction({ type, message, onConfirm });
    setShowConfirmation(true);
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 5000);
  };

  const getQuickReviewActions = (task: Task) => {
    const actions = [];

    switch (task.status) {
      case 'SUBMITTED':
        actions.push(
          {
            type: 'primary',
            label: 'Approve & Send to Marketplace',
            icon: <CheckCircle size={16} />,
            onClick: () => handleSendToMarketplace(task.id)
          },
          {
            type: 'warning',
            label: 'Assign to Designer',
            icon: <User size={16} />,
            onClick: () => setShowDesignerAssignment(true)
          },
          {
            type: 'error',
            label: 'Reject',
            icon: <ThumbsDown size={16} />,
            onClick: () => {
              if (!feedbackText.trim()) {
                showErrorMessage('Please provide feedback for rejection');
                return;
              }
              showConfirmationModal(
                'reject',
                'Are you sure you want to reject this task and request more information from the client?',
                () => handleRejectTask(task.id, feedbackText)
              );
            }
          }
        );
        break;

      case 'READY_FOR_REVIEW':
        actions.push(
          {
            type: 'primary',
            label: 'Approve & Send to Client',
            icon: <CheckCircle size={16} />,
            onClick: () => {
              showConfirmationModal(
                'approve',
                'Are you sure you want to approve this design and send it to the client for review?',
                async () => {
                  try {
                    await updateTaskStatus(task.id, 'APPROVED');
                    showSuccessMessage('Design approved and sent to client!');
                    // Refresh tasks to remove from admin actions
                    const updatedTasks = await getAllTasks();
                    setTasks(updatedTasks);
                    // Reset carousel index if current task is no longer in the list
                    const newPendingTasks = updatedTasks.filter(task => 
                      task.status === 'SUBMITTED' || task.status === 'READY_FOR_REVIEW' || (task.status === 'IN_REVIEW' && !task.pushedToMarketplace)
                    );
                    if (currentCarouselIndex >= newPendingTasks.length) {
                      if (newPendingTasks.length === 0) {
                        setShowCarousel(false);
                      } else {
                        setCurrentCarouselIndex(0);
                      }
                    }
                  } catch (error) {
                    console.error('Error updating task status:', error);
                    showErrorMessage('Failed to approve design. Please try again.');
                  }
                }
              );
            }
          },
          {
            type: 'warning',
            label: 'Request Changes',
            icon: <MessageSquare size={16} />,
            onClick: () => {
              if (!feedbackText.trim()) {
                showErrorMessage('Please provide feedback for requested changes');
                return;
              }
              showConfirmationModal(
                'reject',
                'Are you sure you want to request changes from the designer?',
                async () => {
                  try {
                    await updateTaskStatus(task.id, 'REVISION_REQUESTED');
                    showSuccessMessage('Changes requested from designer!');
                    // Refresh tasks to update the list
                    const updatedTasks = await getAllTasks();
                    setTasks(updatedTasks);
                    // Reset carousel index if current task is no longer in the list
                    const newPendingTasks = updatedTasks.filter(task => 
                      task.status === 'SUBMITTED' || task.status === 'READY_FOR_REVIEW' || (task.status === 'IN_REVIEW' && !task.pushedToMarketplace)
                    );
                    if (currentCarouselIndex >= newPendingTasks.length) {
                      if (newPendingTasks.length === 0) {
                        setShowCarousel(false);
                      } else {
                        setCurrentCarouselIndex(0);
                      }
                    }
                  } catch (error) {
                    console.error('Error updating task status:', error);
                    showErrorMessage('Failed to request changes. Please try again.');
                  }
                }
              );
            }
          }
        );
        break;

      case 'IN_REVIEW':
        if (task.pushedToMarketplace) {
          actions.push(
            {
              type: 'info',
              label: 'Message Client',
              icon: <MessageSquare size={16} />,
              onClick: () => showSuccessMessage('Messaging feature coming soon!')
            }
          );
        } else {
          actions.push(
            {
              type: 'primary',
              label: 'Send to Marketplace',
              icon: <Sparkles size={16} />,
              onClick: () => handleSendToMarketplace(task.id)
            }
          );
        }
        break;

      default:
        break;
    }

    return actions;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }

  const fetchTasks = async () => {
    if (user) {
      setLoading(true);
      try {
        const [allTasks, allUsers] = await Promise.all([
          getAllTasks(),
          getAllUsers()
        ]);
        setTasks(allTasks);
        
        // Filter designers and calculate workloads
        const designersData = allUsers.filter(u => u.role === 'DESIGNER');
        setDesigners(designersData);
        
        // Calculate designer workloads
        const workloads: Record<string, number> = {};
        designersData.forEach(designer => {
          const activeTasks = allTasks.filter(task => 
            task.assignedDesigner === designer.id && 
            ['SUBMITTED', 'IN_REVIEW', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION_REQUESTED'].includes(task.status)
          ).length;
          workloads[designer.id] = activeTasks;
        });
        setDesignerWorkloads(workloads);
        
        // Fetch client information for each task
        const clientInfoMap: Record<string, FirestoreUser> = {};
        const uniqueUserIds = [...new Set(allTasks.map(task => task.userId))];
        
        for (const userId of uniqueUserIds) {
          try {
            const user = await getUserById(userId);
            if (user) {
              clientInfoMap[userId] = user;
            }
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
          }
        }
        
        setClientInfo(clientInfoMap);
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
      case 'in_progress':
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
      case 'in_progress':
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
    // Handle stat-based filtering
    if (selectedStatFilter) {
      switch (selectedStatFilter) {
        case 'admin-new-submissions':
          return task.status === 'SUBMITTED';
        case 'admin-design-review':
          return task.status === 'READY_FOR_REVIEW';
        case 'designer-in-progress':
          return task.status === 'IN_PROGRESS';
        case 'designer-revisions':
          return task.status === 'REVISION_REQUESTED';
        case 'designer-available':
          return task.status === 'IN_REVIEW' && task.pushedToMarketplace;
        case 'client-design-approval':
          return task.status === 'READY_FOR_REVIEW' || task.status === 'APPROVED';
        case 'client-info-requested':
          return task.status === 'INFO_REQUESTED';
        default:
          break;
      }
    }
    
    // Handle regular filter
    const matchesFilter = filter === "all" || 
      (filter === "submitted" && task.status === "SUBMITTED") ||
      (filter === "under_review" && task.status === "IN_REVIEW") ||
      (filter === "in_progress" && task.status === "IN_PROGRESS") ||
      (filter === "completed" && task.status === "COMPLETED");
    const matchesSearch = searchTerm === "" || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Role-specific stats showing actions required
  const taskStats = {
    // Admin actions required
    admin: {
      newSubmissions: tasks.filter(t => t.status === 'SUBMITTED').length,
      designReview: tasks.filter(t => t.status === 'READY_FOR_REVIEW').length,
      total: tasks.filter(t => ['SUBMITTED', 'READY_FOR_REVIEW'].includes(t.status)).length
    },
    // Designer actions required
    designer: {
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      availableForClaim: tasks.filter(t => t.status === 'IN_REVIEW' && t.pushedToMarketplace).length,
      revisionRequested: tasks.filter(t => t.status === 'REVISION_REQUESTED').length,
      total: tasks.filter(t => ['IN_PROGRESS', 'IN_REVIEW', 'REVISION_REQUESTED'].includes(t.status)).length
    },
          // Client actions required
          client: {
            designApproval: tasks.filter(t => t.status === 'READY_FOR_REVIEW' || t.status === 'APPROVED').length,
            infoRequested: tasks.filter(t => t.status === 'INFO_REQUESTED').length,
            total: tasks.filter(t => ['READY_FOR_REVIEW', 'APPROVED', 'INFO_REQUESTED'].includes(t.status)).length
          },
  };

  // Carousel functions - tasks requiring admin action
  const pendingReviewTasks = tasks.filter(task => 
    task.status === 'SUBMITTED' || task.status === 'READY_FOR_REVIEW' || (task.status === 'IN_REVIEW' && !task.pushedToMarketplace)
  );

  const handleCarouselNext = () => {
    setCurrentCarouselIndex((prev) => 
      prev < pendingReviewTasks.length - 1 ? prev + 1 : 0
    );
  };

  const handleCarouselPrev = () => {
    setCurrentCarouselIndex((prev) => 
      prev > 0 ? prev - 1 : pendingReviewTasks.length - 1
    );
  };


  const handleRejectTask = async (taskId: string, feedback: string) => {
    if (!feedback.trim()) {
      showErrorMessage('Please provide feedback for rejection');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Update task status to info requested with feedback
      console.log('Rejecting task:', taskId, 'with feedback:', feedback);
      await rejectTaskWithFeedback(taskId, feedback);
      showSuccessMessage('Task rejected with feedback sent to client');
      setFeedbackText('');
      // Refresh tasks
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
      if (currentCarouselIndex >= updatedTasks.length) {
        setCurrentCarouselIndex(0);
      }
    } catch (error) {
      console.error('Error rejecting task:', error);
      showErrorMessage('Failed to reject task');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignToDesigner = async (taskId: string, designerId: string) => {
    setIsProcessing(true);
    try {
      await assignTaskToDesigner(taskId, designerId);
      showSuccessMessage('Task assigned to designer and moved to design phase');
      setShowDesignerAssignment(false);
      // Refresh tasks
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
      if (currentCarouselIndex >= updatedTasks.length) {
        setCurrentCarouselIndex(0);
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      showErrorMessage('Failed to assign task to designer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToMarketplace = async (taskId: string) => {
    setIsProcessing(true);
    try {
      await sendTaskToMarketplace(taskId);
      showSuccessMessage('Task sent to marketplace for designers to claim');
      // Refresh tasks
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
      if (currentCarouselIndex >= updatedTasks.length) {
        setCurrentCarouselIndex(0);
      }
    } catch (error) {
      console.error('Error sending task to marketplace:', error);
      showErrorMessage('Failed to send task to marketplace');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatClick = (statType: string) => {
    setSelectedStatFilter(statType);
    setFilter('all'); // Reset regular filter
    setSearchTerm(''); // Reset search
  };

  const clearStatFilter = () => {
    setSelectedStatFilter(null);
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

          {/* Role-Based Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Admin Actions Required */}
            <div style={{ 
              background: 'var(--surface)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '2px solid var(--primary)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => handleStatClick('admin-total')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'var(--primary)', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <BarChart3 size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
                    Admin Actions
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>
                    Tasks requiring admin review
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    background: 'var(--primary-light-bg)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatClick('admin-new-submissions');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    // Update child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'white';
                    if (labelElement) labelElement.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light-bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'transparent';
                    // Reset child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'var(--primary)';
                    if (labelElement) labelElement.style.color = 'var(--text-light)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                    {taskStats.admin.newSubmissions}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>New Submissions</div>
                </div>
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    background: 'var(--primary-light-bg)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatClick('admin-design-review');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    // Update child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'white';
                    if (labelElement) labelElement.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light-bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'transparent';
                    // Reset child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'var(--primary)';
                    if (labelElement) labelElement.style.color = 'var(--text-light)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                    {taskStats.admin.designReview}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Design Review</div>
                </div>
              </div>
              <div style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                background: 'var(--primary)', 
                color: 'white', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: 'bold' 
              }}>
                {taskStats.admin.total}
              </div>
            </div>

            {/* Designer Actions Required */}
            <div style={{ 
              background: 'var(--surface)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '2px solid var(--warning)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => handleStatClick('designer-total')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'var(--warning)', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Zap size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
                    Designer Actions
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>
                    Tasks requiring designer work
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    background: 'var(--warning-light-bg)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatClick('designer-in-progress');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--warning)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--warning)';
                    // Update child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'white';
                    if (labelElement) labelElement.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--warning-light-bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'transparent';
                    // Reset child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'var(--warning)';
                    if (labelElement) labelElement.style.color = 'var(--text-light)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>
                    {taskStats.designer.inProgress}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>In Progress</div>
                </div>
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    background: 'var(--error-light-bg)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatClick('designer-revisions');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--error)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--error)';
                    // Update child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'white';
                    if (labelElement) labelElement.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--error-light-bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'transparent';
                    // Reset child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'var(--error)';
                    if (labelElement) labelElement.style.color = 'var(--text-light)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--error)', marginBottom: '4px' }}>
                    {taskStats.designer.revisionRequested}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Revisions</div>
                </div>
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    background: 'var(--primary-light-bg)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatClick('designer-available');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    // Update child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'white';
                    if (labelElement) labelElement.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light-bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'transparent';
                    // Reset child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'var(--primary)';
                    if (labelElement) labelElement.style.color = 'var(--text-light)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                    {taskStats.designer.availableForClaim}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Marketplace</div>
                </div>
              </div>
              <div style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                background: 'var(--warning)', 
                color: 'white', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: 'bold' 
              }}>
                {taskStats.designer.total}
              </div>
            </div>

            {/* Client Actions Required */}
            <div style={{ 
              background: 'var(--surface)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '2px solid var(--success)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => handleStatClick('client-total')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'var(--success)', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <User size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
                    Client Actions
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '2px 0 0 0' }}>
                    Tasks awaiting client response
                  </p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    background: 'var(--success-light-bg)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatClick('client-design-approval');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--success)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--success)';
                    // Update child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'white';
                    if (labelElement) labelElement.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--success-light-bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'transparent';
                    // Reset child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'var(--success)';
                    if (labelElement) labelElement.style.color = 'var(--text-light)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '4px' }}>
                    {taskStats.client.designApproval}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Design Approval</div>
                </div>
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '12px', 
                    background: 'var(--warning-light-bg)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatClick('client-info-requested');
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--warning)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--warning)';
                    // Update child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'white';
                    if (labelElement) labelElement.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--warning-light-bg)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.borderColor = 'transparent';
                    // Reset child text colors
                    const numberElement = e.currentTarget.querySelector('div:first-child') as HTMLElement;
                    const labelElement = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                    if (numberElement) numberElement.style.color = 'var(--warning)';
                    if (labelElement) labelElement.style.color = 'var(--text-light)';
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>
                    {taskStats.client.infoRequested}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Info Requested</div>
                </div>
              </div>
              <div style={{ 
                position: 'absolute', 
                top: '12px', 
                right: '12px', 
                background: 'var(--success)', 
                color: 'white', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: 'bold' 
              }}>
                {taskStats.client.total}
              </div>
            </div>
          </div>


          {/* Active Filter Indicator */}
          {selectedStatFilter && (
            <div style={{ 
              marginTop: '20px', 
              padding: '16px', 
              background: 'var(--primary-light-bg)', 
              borderRadius: '12px', 
              border: '1px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'var(--primary)', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Filter size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                    Filtered by: {(() => {
                      switch (selectedStatFilter) {
                        case 'admin-new-submissions': return 'New Submissions';
                        case 'admin-design-review': return 'Design Review';
                        case 'designer-in-progress': return 'Designer In Progress';
                        case 'designer-revisions': return 'Designer Revisions';
                        case 'designer-available': return 'Designer Available';
                        case 'client-design-approval': return 'Client Design Approval';
                        case 'client-info-requested': return 'Client Info Requested';
                        case 'admin-total': return 'All Admin Actions';
                        case 'designer-total': return 'All Designer Actions';
                        case 'client-total': return 'All Client Actions';
                        default: return 'Unknown Filter';
                      }
                    })()}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                    Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={clearStatFilter}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary-dark)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--primary)';
                }}
              >
                <X size={16} />
                Clear Filter
              </button>
            </div>
          )}

          {/* Quick Review Button */}
          {pendingReviewTasks.length > 0 && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                onClick={() => setShowCarousel(true)}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '0 auto',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                <Play size={20} />
                Quick Review ({pendingReviewTasks.length} admin actions)
              </button>
            </div>
          )}
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
                <option value="in_progress">In Progress</option>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <User size={14} color="var(--text-light)" />
                        <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: '500' }}>
                          Client: {clientInfo[task.userId]?.name || 'Unknown'}
                        </span>
                      </div>
                      {task.assignedDesigner && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <User size={14} color="var(--primary)" />
                          <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '500' }}>
                            Designer: {designers.find(d => d.id === task.assignedDesigner)?.name || 'Unknown Designer'}
                          </span>
                        </div>
                      )}
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
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Review Carousel Modal */}
      {showCarousel && pendingReviewTasks.length > 0 && pendingReviewTasks[currentCarouselIndex] && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--background)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
                  Quick Review
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '4px 0 0 0' }}>
                  {currentCarouselIndex + 1} of {pendingReviewTasks.length} admin actions
                </p>
              </div>
              <button
                onClick={() => setShowCarousel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
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
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {(() => {
                const currentTask = pendingReviewTasks[currentCarouselIndex];
                if (!currentTask) {
                  return <div>No tasks available for review.</div>;
                }
                const client = clientInfo[currentTask.userId];
                
                return (
                  <div>
                    {/* Task Info */}
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        {currentTask.title}
                      </h3>
                      <p style={{ fontSize: '16px', color: 'var(--text-light)', marginBottom: '16px', lineHeight: '1.5' }}>
                        {currentTask.description}
                      </p>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--text-light)' }}>
                        <span><strong>Client:</strong> {client?.name || 'Unknown'}</span>
                        <span><strong>Type:</strong> {formatTaskType(currentTask.type)}</span>
                        <span><strong>Priority:</strong> {currentTask.priority}</span>
                      </div>
                    </div>

                    {/* Deliverables Preview */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                        Designer Deliverables
                      </h4>
                      {currentTask.designerDeliveries?.links && currentTask.designerDeliveries.links.length > 0 ? (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {currentTask.designerDeliveries.links.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '12px 16px',
                                background: 'var(--primary-light-bg)',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                border: '1px solid var(--primary)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--primary)';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--primary-light-bg)';
                                e.currentTarget.style.color = 'var(--primary)';
                              }}
                            >
                              View Deliverable {index + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>
                          No deliverables uploaded yet
                        </p>
                      )}
                    </div>

                    {/* Feedback Input */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                        Feedback (required for rejection)
                      </label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Add feedback for the designer..."
                        style={{
                          width: '100%',
                          minHeight: '100px',
                          padding: '12px',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                          resize: 'vertical',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer Actions */}
            <div style={{
              padding: '24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={handleCarouselPrev}
                  disabled={pendingReviewTasks.length <= 1}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: pendingReviewTasks.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: pendingReviewTasks.length <= 1 ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                  {currentCarouselIndex + 1} / {pendingReviewTasks.length}
                </span>
                <button
                  onClick={handleCarouselNext}
                  disabled={pendingReviewTasks.length <= 1}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: pendingReviewTasks.length <= 1 ? 'not-allowed' : 'pointer',
                    opacity: pendingReviewTasks.length <= 1 ? 0.5 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Contextual Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {getQuickReviewActions(pendingReviewTasks[currentCarouselIndex]).map((action, index) => {
                  const getButtonStyle = (type: string) => {
                    const baseStyle = {
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    };

                    switch (type) {
                      case 'primary':
                        return {
                          ...baseStyle,
                          border: 'none',
                          background: 'var(--primary)',
                          color: 'white'
                        };
                      case 'warning':
                        return {
                          ...baseStyle,
                          border: 'none',
                          background: 'var(--warning)',
                          color: 'white'
                        };
                      case 'error':
                        return {
                          ...baseStyle,
                          border: 'none',
                          background: 'var(--error)',
                          color: 'white'
                        };
                      case 'info':
                        return {
                          ...baseStyle,
                          border: '1px solid var(--primary)',
                          background: 'var(--primary-light-bg)',
                          color: 'var(--primary)'
                        };
                      default:
                        return baseStyle;
                    }
                  };

                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      disabled={isProcessing}
                      style={getButtonStyle(action.type)}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Designer Assignment Modal */}
      {showDesignerAssignment && pendingReviewTasks.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--background)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
                  Assign to Designer
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: '4px 0 0 0' }}>
                  Select a designer and move task to design phase
                </p>
              </div>
              <button
                onClick={() => setShowDesignerAssignment(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
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
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                  {pendingReviewTasks[currentCarouselIndex]?.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                  Client: {clientInfo[pendingReviewTasks[currentCarouselIndex]?.userId]?.name || 'Unknown'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {designers.map(designer => {
                  const workload = designerWorkloads[designer.id] || 0;
                  const getWorkloadColor = (workload: number) => {
                    if (workload === 0) return 'var(--success)';
                    if (workload <= 2) return 'var(--primary)';
                    if (workload <= 4) return 'var(--warning)';
                    return 'var(--error)';
                  };
                  
                  const getWorkloadLabel = (workload: number) => {
                    if (workload === 0) return 'Available';
                    if (workload <= 2) return 'Light';
                    if (workload <= 4) return 'Moderate';
                    return 'Heavy';
                  };

                  return (
                    <button
                      key={designer.id}
                      onClick={() => {
                        showConfirmationModal(
                          'assign',
                          `Are you sure you want to assign this task to ${designer.name}?`,
                          () => handleAssignToDesigner(pendingReviewTasks[currentCarouselIndex].id, designer.id)
                        );
                      }}
                      disabled={isProcessing}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        opacity: isProcessing ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        if (!isProcessing) {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.background = 'var(--primary-light-bg)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isProcessing) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--surface)';
                        }
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                          {designer.name}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                          {designer.email}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          background: `${getWorkloadColor(workload)}20`,
                          color: getWorkloadColor(workload),
                          fontSize: '12px',
                          fontWeight: '600',
                          border: `1px solid ${getWorkloadColor(workload)}`
                        }}>
                          {getWorkloadLabel(workload)} ({workload} tasks)
                        </div>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getWorkloadColor(workload)
                        }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {designers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
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
                    <User size={24} color="var(--text-light)" />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                    No designers available
                  </h3>
                  <p style={{ color: 'var(--text-light)', margin: 0 }}>
                    No designers are currently registered in the system.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && confirmationAction && (
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
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'var(--text)',
                marginBottom: '12px'
              }}>
                Confirm Action
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-light)',
                lineHeight: '1.5'
              }}>
                {confirmationAction.message}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmation(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'white',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmationAction.onConfirm();
                  setShowConfirmation(false);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: confirmationAction.type === 'reject' ? 'var(--error)' : 
                             confirmationAction.type === 'assign' ? 'var(--primary)' : 'var(--primary)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {confirmationAction.type === 'reject' ? 'Reject' : 
                 confirmationAction.type === 'assign' ? 'Assign' : 
                 confirmationAction.type === 'approve' ? 'Send to Client' : 'Send to Marketplace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'var(--success)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={16} />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'var(--error)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <X size={16} />
          {errorMessage}
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
