import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userRole: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  register: (email: string, password: string, nome: string, cognome: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  userFullName: string | null;
  checkEmailExists: (email: string) => Promise<boolean>;
  updateUserName: (nome: string, cognome: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userFullName, setUserFullName] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider initialized'); // Debug log
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed in context:', user?.uid); // Debug log
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data from Firestore:', userData); // Debug log
            
            if (!userData.active) {
              await logout();
              toast.error('Il tuo account è stato disattivato. Contatta l\'amministrazione.');
              return;
            }
            
            setUserRole(userData.role || 'user');
            setIsAdmin(userData.role === 'admin');
            setUserFullName(`${userData.nome} ${userData.cognome}`);
          } else {
            await createFirestoreUser(user);
            setUserRole('user');
            setIsAdmin(false);
            setUserFullName('nome cognome');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserRole('user');
          setIsAdmin(false);
          setUserFullName(null);
        }
      } else {
        setUserRole('user');
        setIsAdmin(false);
        setUserFullName(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createFirestoreUser = async (user: FirebaseUser, nome?: string, cognome?: string) => {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      nome: nome || 'nome',
      cognome: cognome || 'cognome',
      role: 'user',
      active: true,
      createdAt: new Date().toISOString()
    });
    toast.success('Profilo creato con successo. Controlla la tua email per verificare l\'account!');
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods.length > 0;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const updateUserName = async (nome: string, cognome: string) => {
    if (!currentUser) throw new Error('No user logged in');

    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { nome, cognome });
    setUserFullName(`${nome} ${cognome}`);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const login = async (email: string, password: string) => {
    console.log('Login attempt for:', email); // Debug log
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Login successful:', userCredential.user.uid); // Debug log
    
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      await createFirestoreUser(userCredential.user);
    } else if (!userDoc.data().active) {
      await logout();
      throw new Error('Il tuo account è stato disattivato. Contatta l\'amministrazione.');
    }
    
    return userCredential.user;
  };

  const register = async (email: string, password: string, nome: string, cognome: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await updateProfile(userCredential.user, {
      displayName: `${nome} ${cognome}`
    });

    await sendEmailVerification(userCredential.user, {
      url: 'https://arredissimafood.netlify.app'
    });
    
    await createFirestoreUser(userCredential.user, nome, cognome);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    register,
    logout,
    isAdmin,
    userFullName,
    checkEmailExists,
    updateUserName,
    sendPasswordReset
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};