import React, { createContext, useState, useContext } from 'react';

// UserContext - kullanıcı bilgilerini saklamak için
const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  // user state'i - kullanıcı detaylarını saklar
  const [user, setUser] = useState(null);

  // Helper fonksiyon - kullanıcı tipini kontrol eder
  const isCargoOwner = () => user?.user_type === 'cargo_owner';
  const isTransporter = () => user?.user_type === 'transporter';

  return (
    <UserContext.Provider value={{ user, setUser, isCargoOwner, isTransporter }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook
export const useUser = () => useContext(UserContext);

// Default export
export default UserProvider;