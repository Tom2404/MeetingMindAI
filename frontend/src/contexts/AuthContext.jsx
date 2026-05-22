/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps, react-hooks/rules-of-hooks, react-hooks/set-state-in-effect */
import React, { createContext, useState, useEffect, useContext } from 'react';

import API_BASE_URL from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      fetch(`${API_BASE_URL}/api/v1/auth/me`, { 
        headers: { 'Authorization': `Bearer ${savedToken}` } 
      })
        .then(res => { 
          if (res.ok) return res.json(); 
          throw new Error('Invalid token'); 
        })
        .then(data => { 
          setCurrentUser(data.user); 
          setToken(savedToken); 
        })
        .catch(() => { 
          localStorage.removeItem('token'); 
          localStorage.removeItem('user'); 
        })
        .finally(() => setIsCheckingAuth(false));
    } else { 
      setIsCheckingAuth(false); 
    }
  }, []);

  const login = (user, t) => {
    setCurrentUser(user);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, isCheckingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
