"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Users, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  Sparkles,
  BarChart3,
  TrendingUp,
  Calendar,
  User
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAllUsers, getAllTasks, User as UserType, Task } from "@/lib/firestore";
import { RoleGuard } from "@/components/RoleGuard";

interface DesignerWorkload {
  designer: UserType;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  averageCompletionTime: number;
  lastActivity: Date | null;
  workloadStatus: 'LOW' | 'MODERATE' | 'HIGH' | 'OVERLOADED';
}

interface ClientOverview {
  client: UserType;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  assignedDesigner: string | null;
  lastActivity: Date | null;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export default function DesignerWorkloadPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [designers, setDesigners] = useState<UserType[]>([]);
  const [clients, setClients] = useState<UserType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workloads, setWorkloads] = useState<DesignerWorkload[]>([]);
  const [clientOverviews, setClientOverviews] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState<'designers' | 'clients'>('designers');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersData, tasksData] = await Promise.all([
          getAllUsers(),
          getAllTasks()
        ]);

        // Filter for designers and clients
        const designersData = usersData.filter(u => u.role === 'DESIGNER');
        const clientsData = usersData.filter(u => u.role === 'CLIENT');
        setDesigners(designersData);
        setClients(clientsData);
        setTasks(tasksData);

        // Calculate workload for each designer
        const workloadData = designersData.map(designer => {
          const designerTasks = tasksData.filter(task => task.assignedDesigner === designer.id);
          const activeTasks = designerTasks.filter(task => 
            ['SUBMITTED', 'IN_REVIEW', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION_REQUESTED'].includes(task.status)
          ).length;
          const completedTasks = designerTasks.filter(task => task.status === 'COMPLETED').length;
          const overdueTasks = designerTasks.filter(task => {
            if (!task.deadline) return false;
            const deadline = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
            return deadline < new Date() && task.status !== 'COMPLETED';
          }).length;

          // Calculate average completion time (in days)
          const completedWithDates = designerTasks.filter(task => 
            task.status === 'COMPLETED'
          );
          const avgCompletionTime = completedWithDates.length > 0 
            ? completedWithDates.reduce((sum, task) => {
                const created = task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt);
                const completed = task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt);
                return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
              }, 0) / completedWithDates.length
            : 0;

          // Determine workload status
          let workloadStatus: 'LOW' | 'MODERATE' | 'HIGH' | 'OVERLOADED' = 'LOW';
          if (activeTasks >= 5 || overdueTasks > 0) {
            workloadStatus = 'OVERLOADED';
          } else if (activeTasks >= 3) {
            workloadStatus = 'HIGH';
          } else if (activeTasks >= 1) {
            workloadStatus = 'MODERATE';
          }

          // Find last activity
          const lastActivity = designerTasks.length > 0 
            ? new Date(Math.max(...designerTasks.map(task => 
                task.updatedAt instanceof Date ? task.updatedAt.getTime() : new Date(task.updatedAt).getTime()
              )))
            : null;

          return {
            designer,
            totalTasks: designerTasks.length,
            activeTasks,
            completedTasks,
            overdueTasks,
            averageCompletionTime: Math.round(avgCompletionTime * 10) / 10,
            lastActivity,
            workloadStatus
          };
        });

        // Sort designers by active tasks (most active first)
        const sortedWorkloadData = workloadData.sort((a, b) => b.activeTasks - a.activeTasks);
        setWorkloads(sortedWorkloadData);

        // Calculate client overviews
        const clientOverviewData = clientsData.map(client => {
          const clientTasks = tasksData.filter(task => task.userId === client.id);
          
          // Debug logging for the specific client
          if (clientTasks.length > 0) {
            console.log(`Client ${client.name} (${client.email}) has ${clientTasks.length} tasks:`, 
              clientTasks.map(task => ({ id: task.id, title: task.title, status: task.status }))
            );
          }
          
          const activeTasks = clientTasks.filter(task => 
            ['SUBMITTED', 'IN_REVIEW', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION_REQUESTED'].includes(task.status)
          ).length;
          const completedTasks = clientTasks.filter(task => task.status === 'COMPLETED').length;
          const overdueTasks = clientTasks.filter(task => {
            if (!task.deadline) return false;
            const deadline = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
            return deadline < new Date() && task.status !== 'COMPLETED';
          }).length;

          // Find assigned designer for active tasks
          const activeTask = clientTasks.find(task => 
            ['SUBMITTED', 'IN_REVIEW', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'REVISION_REQUESTED'].includes(task.status)
          );
          const assignedDesigner = activeTask?.assignedDesigner || null;

          // Determine priority level based on overdue tasks and active tasks
          let priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'LOW';
          if (overdueTasks > 0) {
            priorityLevel = 'URGENT';
          } else if (activeTasks >= 3) {
            priorityLevel = 'HIGH';
          } else if (activeTasks >= 1) {
            priorityLevel = 'MEDIUM';
          }

          // Find last activity
          const lastActivity = clientTasks.length > 0 
            ? new Date(Math.max(...clientTasks.map(task => 
                task.updatedAt instanceof Date ? task.updatedAt.getTime() : new Date(task.updatedAt).getTime()
              )))
            : null;

          return {
            client,
            totalTasks: clientTasks.length,
            activeTasks,
            completedTasks,
            overdueTasks,
            assignedDesigner,
            lastActivity,
            priorityLevel
          };
        });

        // Sort clients by active tasks (most active first)
        const sortedClientOverviewData = clientOverviewData.sort((a, b) => b.activeTasks - a.activeTasks);
        setClientOverviews(sortedClientOverviewData);
      } catch (error) {
        console.error("Error fetching workload data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  const getWorkloadColor = (status: DesignerWorkload['workloadStatus']) => {
    switch (status) {
      case 'LOW': return 'var(--success)';
      case 'MODERATE': return 'var(--warning)';
      case 'HIGH': return 'var(--accent-color)';
      case 'OVERLOADED': return 'var(--error)';
      default: return 'var(--text-light)';
    }
  };

  const getWorkloadIcon = (status: DesignerWorkload['workloadStatus']) => {
    switch (status) {
      case 'LOW': return <CheckCircle size={16} />;
      case 'MODERATE': return <Clock size={16} />;
      case 'HIGH': return <AlertCircle size={16} />;
      case 'OVERLOADED': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getPriorityColor = (priority: ClientOverview['priorityLevel']) => {
    switch (priority) {
      case 'LOW': return 'var(--success)';
      case 'MEDIUM': return 'var(--warning)';
      case 'HIGH': return 'var(--accent-color)';
      case 'URGENT': return 'var(--error)';
      default: return 'var(--text-light)';
    }
  };

  const getPriorityIcon = (priority: ClientOverview['priorityLevel']) => {
    switch (priority) {
      case 'LOW': return <CheckCircle size={16} />;
      case 'MEDIUM': return <Clock size={16} />;
      case 'HIGH': return <AlertCircle size={16} />;
      case 'URGENT': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const filteredWorkloads = workloads.filter(workload => {
    const matchesSearch = workload.designer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workload.designer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "ALL" || workload.workloadStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredClientOverviews = clientOverviews.filter(overview => {
    const matchesSearch = overview.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         overview.client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "ALL" || overview.priorityLevel === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <nav className="nav-container">
          <div className="nav-content">
            <div className="nav-brand">
              <div className="nav-logo">
                <Sparkles size={20} color="white" />
              </div>
              <span className="nav-brand-text">Designer Workload</span>
            </div>
          </div>
        </nav>
        <div className="container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
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
              <BarChart3 size={28} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>Loading designer workload...</p>
          </div>
        </div>
      </div>
    );
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
              <span className="nav-brand-text">Designer Workload</span>
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
                  Workload & Client Overview
                </h1>
                <p style={{ fontSize: '18px', color: 'var(--text-light)', margin: 0 }}>
                  Track designer workload and client activity
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

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div style={{ 
                background: 'var(--success-light-bg)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--success)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '4px' }}>
                  {workloads.filter(w => w.workloadStatus === 'LOW').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Low Workload</div>
              </div>
              <div style={{ 
                background: 'var(--warning-light-bg)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--warning)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '4px' }}>
                  {workloads.filter(w => w.workloadStatus === 'MODERATE').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Moderate</div>
              </div>
              <div style={{ 
                background: 'var(--accent-light-bg)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--accent-color)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '4px' }}>
                  {workloads.filter(w => w.workloadStatus === 'HIGH').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>High Workload</div>
              </div>
              <div style={{ 
                background: 'var(--error-light-bg)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid var(--error)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--error)', marginBottom: '4px' }}>
                  {workloads.filter(w => w.workloadStatus === 'OVERLOADED').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Overloaded</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <button
                onClick={() => setActiveTab('designers')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'designers' ? 'var(--primary)' : 'var(--surface)',
                  color: activeTab === 'designers' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Users size={16} />
                Designers ({workloads.length})
                <span style={{ fontSize: '12px', opacity: 0.7 }}>• Sorted by active tasks</span>
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'clients' ? 'var(--primary)' : 'var(--surface)',
                  color: activeTab === 'clients' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <User size={16} />
                Clients ({clientOverviews.length})
                <span style={{ fontSize: '12px', opacity: 0.7 }}>• Sorted by active tasks</span>
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="text"
                  placeholder={activeTab === 'designers' ? "Search designers..." : "Search clients..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} color="var(--text-light)" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
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
                  {activeTab === 'designers' ? (
                    <>
                      <option value="ALL">All Workloads</option>
                      <option value="LOW">Low Workload</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="HIGH">High Workload</option>
                      <option value="OVERLOADED">Overloaded</option>
                    </>
                  ) : (
                    <>
                      <option value="ALL">All Priorities</option>
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
              {activeTab === 'designers' 
                ? `Showing ${filteredWorkloads.length} of ${workloads.length} designers`
                : `Showing ${filteredClientOverviews.length} of ${clientOverviews.length} clients`
              }
            </p>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'designers' ? (
            <>
              {/* Designer Workload Cards */}
              {filteredWorkloads.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
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
                <Users size={36} color="var(--text-light)" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                No designers found
              </h3>
              <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '16px' }}>
                {searchTerm || filterStatus !== "ALL" 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No designers are currently registered in the system'
                }
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              {filteredWorkloads.map((workload) => (
                <div key={workload.designer.id} className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: 'var(--primary-light-bg)', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <User size={24} color="var(--primary)" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', margin: 0, marginBottom: '4px' }}>
                          {workload.designer.name}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                          {workload.designer.email}
                        </p>
                      </div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '6px 12px', 
                      borderRadius: '8px', 
                      background: `${getWorkloadColor(workload.workloadStatus)}20`, 
                      color: getWorkloadColor(workload.workloadStatus),
                      fontSize: '12px',
                      fontWeight: '600',
                      border: `1px solid ${getWorkloadColor(workload.workloadStatus)}`
                    }}>
                      {getWorkloadIcon(workload.workloadStatus)}
                      {workload.workloadStatus}
                    </div>
                  </div>

                  {/* Task Statistics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '4px' }}>
                        {workload.totalTasks}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Total Tasks</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                        {workload.activeTasks}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Active</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '4px' }}>
                        {workload.completedTasks}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Completed</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--error)', marginBottom: '4px' }}>
                        {workload.overdueTasks}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Overdue</div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>
                        Avg. Completion Time
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                        {workload.averageCompletionTime} days
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>
                        Last Activity
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                        {workload.lastActivity 
                          ? workload.lastActivity.toLocaleDateString()
                          : 'No activity'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          ) : (
            <>
              {/* Client Overview Cards */}
              {filteredClientOverviews.length === 0 ? (
                <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
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
                    <User size={36} color="var(--text-light)" />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                    No clients found
                  </h3>
                  <p style={{ color: 'var(--text-light)', margin: 0, fontSize: '16px' }}>
                    {searchTerm || filterStatus !== "ALL" 
                      ? 'Try adjusting your search or filter criteria'
                      : 'No clients are currently registered in the system'
                    }
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                  {filteredClientOverviews.map((overview) => (
                    <div key={overview.client.id} className="card" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            background: 'var(--primary-light-bg)', 
                            borderRadius: '12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <User size={24} color="var(--primary)" />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', margin: 0, marginBottom: '4px' }}>
                              {overview.client.name}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
                              {overview.client.email}
                            </p>
                          </div>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          background: `${getPriorityColor(overview.priorityLevel)}20`, 
                          color: getPriorityColor(overview.priorityLevel),
                          fontSize: '12px',
                          fontWeight: '600',
                          border: `1px solid ${getPriorityColor(overview.priorityLevel)}`
                        }}>
                          {getPriorityIcon(overview.priorityLevel)}
                          {overview.priorityLevel}
                        </div>
                      </div>

                      {/* Task Statistics */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '4px' }}>
                            {overview.totalTasks}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Total Tasks</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                            {overview.activeTasks}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Active</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)', marginBottom: '4px' }}>
                            {overview.completedTasks}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Completed</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--error)', marginBottom: '4px' }}>
                            {overview.overdueTasks}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>Overdue</div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>
                            Assigned Designer
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                            {overview.assignedDesigner 
                              ? designers.find(d => d.id === overview.assignedDesigner)?.name || 'Unknown'
                              : 'Not assigned'
                            }
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>
                            Last Activity
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                            {overview.lastActivity 
                              ? overview.lastActivity.toLocaleDateString()
                              : 'No activity'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
