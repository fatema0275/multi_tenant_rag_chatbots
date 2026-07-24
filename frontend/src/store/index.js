import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import websiteReducer from './websiteSlice';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    websites: websiteReducer,
    theme: themeReducer,
  },
});

export default store;
