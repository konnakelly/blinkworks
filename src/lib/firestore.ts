import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT' | 'DESIGNER' | 'ADMIN';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Brand {
  id: string;
  name: string;
  size: 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'STATIC_DESIGN' | 'VIDEO_PRODUCTION' | 'ANIMATION' | 'ILLUSTRATION' | 'BRANDING' | 'WEB_DESIGN' | 'OTHER';
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'REVISION_REQUESTED' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  budget?: number;
  deadline?: Date;
  brandId: string;
  userId: string;
  assignedDesigner?: string;
  requirements: CreativeRequirements;
  adminNotes?: string;
  designerNotes?: string;
  designerDeliveries?: DesignerDeliveries;
  pushedToMarketplace?: boolean;
  pushedAt?: Date;
  claimedAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreativeRequirements {
  contentType: string[];
  dimensions?: string;
  format: string[];
  style?: string;
  colorPalette: string[];
  mood?: string;
  brandGuidelines?: string;
  doNotUse?: string;
  mustInclude?: string;
  fileSize?: string;
  resolution?: string;
  references: string[];
  uploadedFiles?: Array<{ name: string; size: number; type: string; downloadURL: string }>;
  inspiration?: string;
}

export interface DesignerDelivery {
  id: string;
  type: 'FILE' | 'LINK';
  name: string;
  url: string;
  description?: string;
  uploadedAt: Date;
  uploadedBy: string; // designer's user ID
}

export interface DesignerDeliveries {
  files: DesignerDelivery[];
  links: DesignerDelivery[];
  notes?: string;
  submittedAt?: Date;
}

export interface Deliverable {
  id: string;
  taskId: string;
  type: 'STATIC' | 'VIDEO' | 'ANIMATION' | 'ILLUSTRATION' | 'OTHER';
  status: 'DRAFT' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  title: string;
  description?: string;
  fileUrl?: string;
  figmaUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Brand operations
export const createBrand = async (brandData: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date();
  const brand = {
    ...brandData,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await addDoc(collection(db, 'brands'), brand);
  return { id: docRef.id, ...brand };
};

export const getBrandByUserId = async (userId: string): Promise<Brand | null> => {
  const q = query(collection(db, 'brands'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Brand;
};

// Task operations
export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date();
  const task = {
    ...taskData,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await addDoc(collection(db, 'tasks'), task);
  return { id: docRef.id, ...task };
};

export const getTasksByUserId = async (userId: string): Promise<Task[]> => {
  const q = query(
    collection(db, 'tasks'), 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

export const getAllTasks = async (): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deadline: data.deadline?.toDate() || undefined,
    } as Task;
  });
};

export const updateTaskStatus = async (taskId: string, status: Task['status']) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    status,
    updatedAt: new Date(),
  });
};

// Deliverable operations
export const createDeliverable = async (deliverableData: Omit<Deliverable, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date();
  const deliverable = {
    ...deliverableData,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await addDoc(collection(db, 'deliverables'), deliverable);
  return { id: docRef.id, ...deliverable };
};

export const getDeliverablesByTaskId = async (taskId: string): Promise<Deliverable[]> => {
  const q = query(
    collection(db, 'deliverables'), 
    where('taskId', '==', taskId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deliverable));
};

// Get a single task by ID
export const getTaskById = async (taskId: string): Promise<Task | null> => {
  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  
  if (taskSnap.exists()) {
    const data = taskSnap.data();
    return {
      id: taskSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deadline: data.deadline?.toDate() || undefined,
    } as Task;
  }
  
  return null;
};

// Upload file to Firebase Storage
export const uploadFile = async (file: File, taskId: string): Promise<string> => {
  const fileName = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `tasks/${taskId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

// Delete a task
export const deleteTask = async (taskId: string): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  await deleteDoc(taskRef);
};

// Update a task
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateTask = async (taskId: string, taskData: any): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...taskData,
    updatedAt: Timestamp.now()
  });
};

// Push a task to the designer marketplace (for admins)
export const pushTaskToMarketplace = async (taskId: string): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    pushedToMarketplace: true,
    pushedAt: Timestamp.now(),
    status: 'IN_REVIEW', // Change status to indicate it's ready for designers
    updatedAt: Timestamp.now()
  });
};

// Claim a task (for designers)
export const claimTask = async (taskId: string, designerId: string): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    status: 'IN_PROGRESS',
    assignedDesigner: designerId,
    claimedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
};

// User management functions
export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const userRef = await addDoc(collection(db, 'users'), {
    ...userData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return userRef.id;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
  } as User;
};

export const getUserById = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  
  if (!userDoc.exists()) {
    return null;
  }
  
  const data = userDoc.data();
  return {
    id: userDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
  } as User;
};

export const updateUserRole = async (userId: string, role: User['role']): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role,
    isActive: true, // Ensure user is active when role is updated
    updatedAt: Timestamp.now()
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
    } as User;
  });
};

// Designer Delivery Functions
export const addDesignerDelivery = async (
  taskId: string, 
  delivery: Omit<DesignerDelivery, 'id' | 'uploadedAt' | 'uploadedBy'>,
  designerId: string
): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    throw new Error('Task not found');
  }
  
  const taskData = taskDoc.data();
  const currentDeliveries = taskData.designerDeliveries || { files: [], links: [], notes: '' };
  
  const newDelivery: DesignerDelivery = {
    ...delivery,
    id: Date.now().toString(),
    uploadedAt: new Date(),
    uploadedBy: designerId
  };
  
  const updatedDeliveries = {
    ...currentDeliveries,
    [delivery.type === 'FILE' ? 'files' : 'links']: [
      ...(currentDeliveries[delivery.type === 'FILE' ? 'files' : 'links'] || []),
      newDelivery
    ]
  };
  
  await updateDoc(taskRef, {
    designerDeliveries: updatedDeliveries,
    updatedAt: Timestamp.now()
  });
};

export const removeDesignerDelivery = async (
  taskId: string,
  deliveryId: string,
  deliveryType: 'FILE' | 'LINK'
): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    throw new Error('Task not found');
  }
  
  const taskData = taskDoc.data();
  const currentDeliveries = taskData.designerDeliveries || { files: [], links: [], notes: '' };
  
  const updatedDeliveries = {
    ...currentDeliveries,
    [deliveryType === 'FILE' ? 'files' : 'links']: (currentDeliveries[deliveryType === 'FILE' ? 'files' : 'links'] || [])
      .filter((delivery: DesignerDelivery) => delivery.id !== deliveryId)
  };
  
  await updateDoc(taskRef, {
    designerDeliveries: updatedDeliveries,
    updatedAt: Timestamp.now()
  });
};

export const updateDesignerDeliveryNotes = async (
  taskId: string,
  notes: string
): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    throw new Error('Task not found');
  }
  
  const taskData = taskDoc.data();
  const currentDeliveries = taskData.designerDeliveries || { files: [], links: [], notes: '' };
  
  const updatedDeliveries = {
    ...currentDeliveries,
    notes,
    submittedAt: new Date()
  };
  
  await updateDoc(taskRef, {
    designerDeliveries: updatedDeliveries,
    updatedAt: Timestamp.now()
  });
};

