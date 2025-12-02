import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, signInWithGoogle, signOut as firebaseSignOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import api from '../lib/api';
import { clearPermissionsCache } from '../hooks/usePermissions';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        
        // Get the ID token from Firebase
        try {
          const idToken = await firebaseUser.getIdToken();
          
          // Verify token with backend and get our app user data
          const response = await api.post('/auth/google', {
            token: idToken,
          });
          
          const { access_token, user: userData } = response.data;
          
          // Store token and user data
          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } catch (error) {
          console.error('Error verifying Firebase token with backend:', error);
          // If backend verification fails, sign out from Firebase
          await firebaseSignOut();
          setFirebaseUser(null);
          setUser(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithGoogle();
      // The onAuthStateChanged listener will handle the rest
      return result;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const login = async (token, userData) => {
    // Keep this method for backwards compatibility
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await firebaseSignOut();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
      setFirebaseUser(null);
      // Limpiar cache de permisos
      clearPermissionsCache();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, loginWithGoogle, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};