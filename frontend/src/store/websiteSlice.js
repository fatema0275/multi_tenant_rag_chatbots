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

/**
 * triggerCrawl — POST /api/websites/:id/crawl
 * Starts an async crawl job for a verified website.
 * Returns { jobId, status, message } on success.
 */
export const triggerCrawl = createAsyncThunk(
  'websites/triggerCrawl',
  async (websiteId, { getState, rejectWithValue }) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/crawl`, {
        method: 'POST',
        headers: getAuthHeaders(getState),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || 'Failed to start crawl');
      }
      return { websiteId, ...data };
    } catch (err) {
      // Surface network-level errors (e.g. Python bridge unreachable)
      return rejectWithValue(err.message || 'Network error — crawler may be unreachable');
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
    /**
     * Optimistically update a single website's crawl_status in the list.
     * Dispatched by StartCrawlCard after a successful triggerCrawl call.
     */
    patchCrawlStatus: (state, action) => {
      const { websiteId, crawl_status } = action.payload;
      const site = state.websites.find((w) => w.id === websiteId);
      if (site) site.crawl_status = crawl_status;
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
      })
      // Crawl — update crawl_status on the matching website row
      .addCase(triggerCrawl.fulfilled, (state, action) => {
        const site = state.websites.find((w) => w.id === action.payload.websiteId);
        if (site) site.crawl_status = action.payload.status ?? 'crawling';
      });
  },
});

export const { clearWebsiteError, patchCrawlStatus } = websiteSlice.actions;
export default websiteSlice.reducer;
