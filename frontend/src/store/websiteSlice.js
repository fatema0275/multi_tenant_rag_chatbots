import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const getAuthHeaders = (getState) => {
  const token = getState().auth.token;
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const fetchWebsites = createAsyncThunk(
  'websites/fetchWebsites',
  async (_, { getState, rejectWithValue }) => {
    try {
      const response = await fetch('/api/websites', {
        method: 'GET',
        headers: getAuthHeaders(getState),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to fetch websites');
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

export const addWebsite = createAsyncThunk(
  'websites/addWebsite',
  async ({ domain }, { getState, rejectWithValue }) => {
    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: getAuthHeaders(getState),
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to add website');
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

export const updateWebsite = createAsyncThunk(
  'websites/updateWebsite',
  async ({ id, domain }, { getState, rejectWithValue }) => {
    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(getState),
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to update website');
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

export const deleteWebsite = createAsyncThunk(
  'websites/deleteWebsite',
  async (id, { getState, rejectWithValue }) => {
    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(getState),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to delete website');
      }
      return id;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

const websiteSlice = createSlice({
  name: 'websites',
  initialState: {
    websites: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearWebsiteError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchWebsites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWebsites.fulfilled, (state, action) => {
        state.loading = false;
        state.websites = action.payload;
      })
      .addCase(fetchWebsites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Add
      .addCase(addWebsite.pending, (state) => {
        state.error = null;
      })
      .addCase(addWebsite.fulfilled, (state, action) => {
        state.websites.unshift(action.payload);
      })
      .addCase(addWebsite.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Update
      .addCase(updateWebsite.fulfilled, (state, action) => {
        const index = state.websites.findIndex((w) => w.id === action.payload.id);
        if (index !== -1) {
          state.websites[index] = action.payload;
        }
      })
      .addCase(updateWebsite.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Delete
      .addCase(deleteWebsite.fulfilled, (state, action) => {
        state.websites = state.websites.filter((w) => w.id !== action.payload);
      })
      .addCase(deleteWebsite.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearWebsiteError } = websiteSlice.actions;
export default websiteSlice.reducer;
