export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

// Initial users data
export const INITIAL_USERS = [
  {
    id: "1",
    email: "ssk@gmail.com",
    password: "SSKR_001",
    name: "SSK User",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2", 
    email: "umair@gmail.com",
    password: "Umair_001",
    name: "Umair User",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "3",
    email: "huzaifa@gmail.com", 
    password: "Huzaifa_001",
    name: "Huzaifa User",
    createdAt: new Date("2024-01-01"),
  },
];

// Local storage keys
const AUTH_STORAGE_KEY = "sarmayaghar_auth";
const USERS_STORAGE_KEY = "sarmayaghar_users";

// Initialize users in localStorage if not exists
export const initializeUsers = () => {
  const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
  if (!existingUsers) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  }
};

// Get users from localStorage
export const getUsers = (): (User & { password: string })[] => {
  const users = localStorage.getItem(USERS_STORAGE_KEY);
  return users ? JSON.parse(users) : [];
};

// Add new user to localStorage
export const addUser = (user: User & { password: string }) => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

// Authenticate user
export const authenticateUser = (credentials: LoginCredentials): User | null => {
  const users = getUsers();
  const user = users.find(
    (u) => u.email === credentials.email && u.password === credentials.password
  );
  
  if (user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  return null;
};

// Register new user
export const registerUser = (credentials: RegisterCredentials): User | null => {
  const users = getUsers();
  
  // Check if user already exists
  if (users.find((u) => u.email === credentials.email)) {
    return null;
  }
  
  const newUser = {
    id: Date.now().toString(),
    email: credentials.email,
    password: credentials.password,
    name: credentials.name,
    createdAt: new Date(),
  };
  
  addUser(newUser);
  
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

// Save auth state to localStorage
export const saveAuthState = (user: User) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

// Get auth state from localStorage
export const getAuthState = (): User | null => {
  const auth = localStorage.getItem(AUTH_STORAGE_KEY);
  return auth ? JSON.parse(auth) : null;
};

// Clear auth state
export const clearAuthState = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
