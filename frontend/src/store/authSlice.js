import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// ─── Storage helpers ──────────────────────────────────────────────────────────
const KEYS = { TOKEN: 'sitemind_token', USER: 'sitemind_user' };

const readStorage = () => {
  // Clean up legacy persistent localStorage entries so old sessions do not leak across site re-opens
  try {
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.USER);
  } catch (e) {
    // Ignore storage access errors
  }

  const token = sessionStorage.getItem(KEYS.TOKEN);
  const userRaw = sessionStorage.getItem(KEYS.USER);
  return {
    token: token || null,
    user: userRaw ? JSON.parse(userRaw) : null,
  };
};

const writeStorage = (token, user) => {
  // Store session in sessionStorage for active tab session duration
  sessionStorage.setItem(KEYS.TOKEN, token);
  sessionStorage.setItem(KEYS.USER, JSON.stringify(user));
  try {
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.USER);
  } catch (e) {
    // Ignore storage access errors
  }
};

const clearStorage = () => {
  [localStorage, sessionStorage].forEach((s) => {
    try {
      s.removeItem(KEYS.TOKEN);
      s.removeItem(KEYS.USER);
    } catch (e) {
      // Ignore storage access errors
    }
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
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Authentication failed');
      writeStorage(data.token, data.user);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const requestSignupOtp = createAsyncThunk(
  'auth/requestSignupOtp',
  async ({ fullName, email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/signup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Failed to request verification code');
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const signupUser = requestSignupOtp;


export const verifySignupOtp = createAsyncThunk(
  'auth/verifySignupOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/signup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Verification failed');
      writeStorage(data.token, data.user);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const resendSignupOtp = createAsyncThunk(
  'auth/resendSignupOtp',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/signup/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Failed to resend verification code');
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error occurred');
    }
  }
);

export const googleLoginUser = createAsyncThunk(
  'auth/googleLoginUser',
  async ({ idToken }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();
      if (!response.ok) return rejectWithValue(data.error || 'Google authentication failed');
      writeStorage(data.token, data.user);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error during Google authentication');
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
  initialState: {
    ...initialState,
    otpStep: false,
    pendingEmail: '',
    devOtp: null,
  },
  reducers: {
    logout: (state) => {
      clearStorage();
      state.token = null;
      state.user = null;
      state.loading = false;
      state.error = null;
      state.otpStep = false;
      state.pendingEmail = '';
      state.devOtp = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    clearForgotPasswordSent: (state) => {
      state.forgotPasswordSent = false;
    },
    cancelOtpStep: (state) => {
      state.otpStep = false;
      state.pendingEmail = '';
      state.devOtp = null;
      state.error = null;
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
      // Request OTP
      .addCase(requestSignupOtp.pending, (state) => { state.loading = true; state.error = null; })

      .addCase(requestSignupOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.otpStep = true;
        state.pendingEmail = action.payload.email;
        state.devOtp = action.payload.devOtp || null;
      })
      .addCase(requestSignupOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Verify OTP
      .addCase(verifySignupOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifySignupOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.otpStep = false;
        state.pendingEmail = '';
        state.devOtp = null;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(verifySignupOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Resend OTP
      .addCase(resendSignupOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(resendSignupOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.devOtp = action.payload.devOtp || null;
      })
      .addCase(resendSignupOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Google Login
      .addCase(googleLoginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(googleLoginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(googleLoginUser.rejected, (state, action) => {
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

export const { logout, clearAuthError, clearForgotPasswordSent, cancelOtpStep } = authSlice.actions;
export default authSlice.reducer;


