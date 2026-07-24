import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Storage helpers ──────────────────────────────────────────────────────────
const KEYS = { TOKEN: 'sitemind_token', USER: 'sitemind_user' };

const readStorage = () => {
  const token =
    localStorage.getItem(KEYS.TOKEN) || sessionStorage.getItem(KEYS.TOKEN);
  const userRaw =
    localStorage.getItem(KEYS.USER) || sessionStorage.getItem(KEYS.USER);
  return {
    token: token || null,
    user: userRaw ? JSON.parse(userRaw) : null,
  };
};

const writeStorage = (token, user, persistent = true) => {
  const store = persistent ? localStorage : sessionStorage;
  store.setItem(KEYS.TOKEN, token);
  store.setItem(KEYS.USER, JSON.stringify(user));
};

const clearStorage = () => {
  [localStorage, sessionStorage].forEach((s) => {
    s.removeItem(KEYS.TOKEN);
    s.removeItem(KEYS.USER);
  });
};

// ─── Initial state ────────────────────────────────────────────────────────────
const { token, user } = readStorage();

const initialState = {
  token,
  user,
  loading: false,
  error: null,
  forgotPasswordSent: false,
};

// ─── Async thunks ─────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password, rememberMe = true }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Authentication failed');
      writeStorage(data.token, data.user, rememberMe);
      return { ...data, rememberMe };
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async ({ fullName, email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Registration failed');
      writeStorage(data.token, data.user, true);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const forgotPasswordThunk = createAsyncThunk(
  'auth/forgotPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Failed to send reset link');
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      clearStorage();
      state.token = null;
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    clearForgotPasswordSent: (state) => {
      state.forgotPasswordSent = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Signup
      .addCase(signupUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Forgot password
      .addCase(forgotPasswordThunk.pending, (state) => { state.loading = true; state.error = null; state.forgotPasswordSent = false; })
      .addCase(forgotPasswordThunk.fulfilled, (state) => {
        state.loading = false;
        state.forgotPasswordSent = true;
      })
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearAuthError, clearForgotPasswordSent } = authSlice.actions;
export default authSlice.reducer;
