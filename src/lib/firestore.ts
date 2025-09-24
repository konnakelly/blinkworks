import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, storage, auth } from './firebase';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT' | 'DESIGNER' | 'ADMIN';
  companyName?: string;
  companySize?: 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE';
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

export interface BrandAsset {
  id: string;
  name: string;
  type: 'LOGO' | 'FONT' | 'COLOR_PALETTE' | 'GUIDELINES' | 'IMAGE' | 'OTHER';
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string; // user ID
  // colors?: Array<{hex: string, name?: string}>; // For color palettes - temporarily disabled
}

export interface BrandAssets {
  assets: BrandAsset[];
  lastUpdated: Date;
  updatedBy: string; // user ID
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'STATIC_DESIGN' | 'VIDEO_PRODUCTION' | 'ANIMATION' | 'ILLUSTRATION' | 'BRANDING' | 'WEB_DESIGN' | 'OTHER';
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'REVISION_REQUESTED' | 'COMPLETED' | 'CANCELLED' | 'INFO_REQUESTED' | 'APPROVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  budget?: number;
  deadline?: Date;
  brandId: string;
  userId: string;
  assignedDesigner?: string;
  requirements: CreativeRequirements;
  adminNotes?: string;
  designerNotes?: string;
  adminFeedback?: string; // Current feedback from admin to client
  adminFeedbackHistory?: Array<{
    feedback: string;
    requestedAt: Date;
    resolvedAt?: Date;
  }>; // History of all admin feedback requests
  designerDeliveries?: DesignerDeliveries;
  inDesignLink?: string; // Link to design work in progress (visible to designers and admins only)
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
  status?: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  clientFeedback?: string;
  adminFeedback?: string;
  reviewedBy?: string; // user ID of who reviewed it
  reviewedAt?: Date;
  revisionRequestedAt?: Date;
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

// Admin rejection with feedback for client
export const rejectTaskWithFeedback = async (taskId: string, feedback: string) => {
  const taskRef = doc(db, 'tasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    throw new Error('Task not found');
  }
  
  const taskData = taskDoc.data();
  const currentHistory = taskData.adminFeedbackHistory || [];
  
  // Add new feedback to history
  const newFeedbackEntry = {
    feedback: feedback,
    requestedAt: new Date(),
  };
  
  await updateDoc(taskRef, {
    status: 'INFO_REQUESTED',
    adminFeedback: feedback,
    adminFeedbackHistory: [...currentHistory, newFeedbackEntry],
    updatedAt: new Date(),
  });
};

// Client resubmission after admin feedback
export const resubmitTaskAfterFeedback = async (taskId: string) => {
  const taskRef = doc(db, 'tasks', taskId);
  const taskDoc = await getDoc(taskRef);
  
  if (!taskDoc.exists()) {
    throw new Error('Task not found');
  }
  
  const taskData = taskDoc.data();
  const currentHistory = taskData.adminFeedbackHistory || [];
  
  // Mark the latest feedback as resolved
  const updatedHistory = currentHistory.map((entry: any, index: number) => {
    if (index === currentHistory.length - 1) {
      return {
        ...entry,
        resolvedAt: new Date()
      };
    }
    return entry;
  });
  
  await updateDoc(taskRef, {
    status: 'SUBMITTED',
    adminFeedback: '', // Clear current feedback
    adminFeedbackHistory: updatedHistory,
    updatedAt: new Date(),
  });
};

// Assign task directly to a designer
export const assignTaskToDesigner = async (taskId: string, designerId: string) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    status: 'IN_PROGRESS',
    assignedDesigner: designerId,
    claimedAt: new Date(),
    updatedAt: new Date(),
  });
};

// Send task to marketplace
export const sendTaskToMarketplace = async (taskId: string) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    status: 'IN_REVIEW',
    pushedToMarketplace: true,
    pushedAt: new Date(),
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

// Create user with email/password authentication (admin function - preserves admin session)
export const createUserWithAuth = async (
  email: string, 
  password: string, 
  name: string, 
  role: User['role'],
  companyName?: string,
  companySize?: string
): Promise<{ authUser: any; firestoreUser: User }> => {
  try {
    // Store the current admin user's credentials for restoration
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No admin user is currently signed in');
    }

    // Store admin's email for verification
    const adminEmail = currentUser.email;

    // Create Firebase Auth user (this will temporarily sign in the new user)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const authUser = userCredential.user;

    // Update the auth user's display name
    await updateProfile(authUser, {
      displayName: name
    });

    // Create Firestore user document
    const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      email: email.toLowerCase(),
      name,
      role,
      companyName: companyName || '',
      companySize: (companySize as 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE') || 'STARTUP',
      isActive: true
    };

    const userRef = await addDoc(collection(db, 'users'), {
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const firestoreUser: User = {
      id: userRef.id,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Sign out the newly created user
    await auth.signOut();

    // The admin will need to sign in again, but the user creation is complete
    console.log('User created successfully. Admin needs to sign in again.');

    return { authUser, firestoreUser };
  } catch (error) {
    console.error('Error creating user with auth:', error);
    throw error;
  }
};

// Alternative: Create user without Firebase Auth (just Firestore record)
export const createUserRecord = async (
  email: string, 
  name: string, 
  role: User['role'],
  companyName?: string,
  companySize?: string
): Promise<User> => {
  try {
    // Create Firestore user document only
    const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      email: email.toLowerCase(),
      name,
      role,
      companyName: companyName || '',
      companySize: (companySize as 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE') || 'STARTUP',
      isActive: true
    };

    const userRef = await addDoc(collection(db, 'users'), {
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const firestoreUser: User = {
      id: userRef.id,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return firestoreUser;
  } catch (error) {
    console.error('Error creating user record:', error);
    throw error;
  }
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

// Deliverable review functions
export const reviewDesignerDelivery = async (
  taskId: string,
  status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
  feedback: string,
  reviewedBy: string,
  isClient: boolean = false
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
    status,
    reviewedBy,
    reviewedAt: new Date(),
    ...(isClient ? { clientFeedback: feedback } : { adminFeedback: feedback }),
    ...(status === 'REVISION_REQUESTED' ? { revisionRequestedAt: new Date() } : {})
  };
  
  // Update task status based on delivery review
  let newTaskStatus = taskData.status;
  if (status === 'APPROVED') {
    newTaskStatus = 'COMPLETED';
  } else if (status === 'REVISION_REQUESTED') {
    newTaskStatus = 'REVISION_REQUESTED';
  }
  
  await updateDoc(taskRef, {
    designerDeliveries: updatedDeliveries,
    status: newTaskStatus,
    updatedAt: Timestamp.now()
  });
};

// Brand Assets Functions
export const uploadBrandAsset = async (
  userId: string,
  asset: Omit<BrandAsset, 'id' | 'uploadedAt' | 'uploadedBy'>
): Promise<void> => {
  const brandAssetsRef = doc(db, 'brandAssets', userId);
  const brandAssetsDoc = await getDoc(brandAssetsRef);
  
  // Filter out undefined values to avoid Firestore errors
  const cleanAsset = Object.fromEntries(
    Object.entries(asset).filter(([_, value]) => value !== undefined)
  );
  
  const newAsset: BrandAsset = {
    ...cleanAsset,
    id: Date.now().toString(),
    uploadedAt: new Date(),
    uploadedBy: userId
  } as BrandAsset;
  
  console.log('Uploading asset:', newAsset);
  
  if (brandAssetsDoc.exists()) {
    const currentData = brandAssetsDoc.data();
    const currentAssets = currentData.assets || [];
    
    // Clean existing assets to remove any undefined values
    const cleanExistingAssets = currentAssets.map((asset: any) => {
      const cleanAsset = Object.fromEntries(
        Object.entries(asset).filter(([_, value]) => value !== undefined)
      );
      return cleanAsset;
    });
    
    const updatedAssets = [...cleanExistingAssets, newAsset];
    
    // Final check - remove any undefined values from the entire array
    const finalAssets = updatedAssets.map((asset: any) => {
      return Object.fromEntries(
        Object.entries(asset).filter(([_, value]) => value !== undefined)
      );
    });
    
    console.log('Updating existing document with assets:', finalAssets);
    const hasUndefinedValues = finalAssets.some(asset => 
      Object.values(asset).some(value => value === undefined)
    );
    console.log('Checking for undefined values:', hasUndefinedValues);
    
    if (hasUndefinedValues) {
      console.log('Found undefined values, using setDoc instead of updateDoc');
      await setDoc(brandAssetsRef, {
        assets: finalAssets,
        lastUpdated: Timestamp.now(),
        updatedBy: userId
      });
    } else {
      await updateDoc(brandAssetsRef, {
        assets: finalAssets,
        lastUpdated: Timestamp.now(),
        updatedBy: userId
      });
    }
  } else {
    const brandAssets: BrandAssets = {
      assets: [newAsset],
      lastUpdated: new Date(),
      updatedBy: userId
    };
    
    console.log('Creating new document with assets:', brandAssets.assets);
    
    await setDoc(brandAssetsRef, {
      assets: brandAssets.assets,
      lastUpdated: Timestamp.now(),
      updatedBy: brandAssets.updatedBy
    });
  }
};

export const getBrandAssets = async (userId: string): Promise<BrandAssets | null> => {
  const brandAssetsRef = doc(db, 'brandAssets', userId);
  const brandAssetsDoc = await getDoc(brandAssetsRef);
  
  if (!brandAssetsDoc.exists()) {
    return null;
  }
  
  const data = brandAssetsDoc.data();
  
  // Convert Timestamps to Dates for each asset
  const assets = (data.assets || []).map((asset: any) => ({
    ...asset,
    uploadedAt: asset.uploadedAt?.toDate() || new Date()
  }));
  
  return {
    ...data,
    assets,
    lastUpdated: data.lastUpdated?.toDate() || new Date()
  } as BrandAssets;
};

export const deleteBrandAsset = async (userId: string, assetId: string): Promise<void> => {
  const brandAssetsRef = doc(db, 'brandAssets', userId);
  const brandAssetsDoc = await getDoc(brandAssetsRef);
  
  if (!brandAssetsDoc.exists()) {
    throw new Error('Brand assets not found');
  }
  
  const currentData = brandAssetsDoc.data();
  const currentAssets = currentData.assets || [];
  const updatedAssets = currentAssets.filter((asset: BrandAsset) => asset.id !== assetId);
  
  await updateDoc(brandAssetsRef, {
    assets: updatedAssets,
    lastUpdated: Timestamp.now(),
    updatedBy: userId
  });
};

export const updateBrandAsset = async (
  userId: string,
  assetId: string,
  updates: Partial<Pick<BrandAsset, 'name' | 'description' | 'type'>>
): Promise<void> => {
  const brandAssetsRef = doc(db, 'brandAssets', userId);
  const brandAssetsDoc = await getDoc(brandAssetsRef);
  
  if (!brandAssetsDoc.exists()) {
    throw new Error('Brand assets not found');
  }
  
  // Filter out undefined values from updates
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );
  
  const currentData = brandAssetsDoc.data();
  const currentAssets = currentData.assets || [];
  const updatedAssets = currentAssets.map((asset: BrandAsset) => 
    asset.id === assetId ? { ...asset, ...cleanUpdates } : asset
  );
  
  await updateDoc(brandAssetsRef, {
    assets: updatedAssets,
    lastUpdated: Timestamp.now(),
    updatedBy: userId
  });
};

