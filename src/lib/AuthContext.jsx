import React, { createContext, useState, useReducer, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { ADMIN_UNLIMITED_COINS } from '@/lib/gameConstants';

const AuthContext = createContext();

// Single reducer for all auth-related state so a logical transition (e.g. user
// loaded, app settings fetched) is one dispatch + one render instead of several
// sequential setState calls each triggering a re-render.
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  isLoadingPublicSettings: true,
  authError: null,
  authChecked: false,
  appPublicSettings: null // Contains only { id, public_settings }
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOADING':
      return { ...state, isLoadingAuth: true };
    case 'AUTH_SUCCESS':
      return { ...state, user: action.user, isAuthenticated: true, isLoadingAuth: false, authChecked: true, authError: null };
    case 'AUTH_FAILURE':
      return { ...state, isLoadingAuth: false, isAuthenticated: false, authChecked: true, authError: action.authError };
    case 'APP_LOADING':
      return { ...state, isLoadingPublicSettings: true, authError: null };
    case 'APP_SETTINGS_SUCCESS':
      return { ...state, appPublicSettings: action.appPublicSettings, isLoadingPublicSettings: false };
    case 'APP_NO_TOKEN':
      return { ...state, appPublicSettings: action.appPublicSettings, isLoadingPublicSettings: false, isLoadingAuth: false, isAuthenticated: false, authChecked: true };
    case 'APP_ERROR':
      return { ...state, authError: action.authError, isLoadingPublicSettings: false, isLoadingAuth: false };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Guard against concurrent/repeated auth + startup calls so multiple mounts
  // (e.g. StrictMode double-invoke or remounts) only trigger one network round-trip.
  const authCheckRef = useRef(false);
  const appStateCheckRef = useRef(false);

  const checkUserAuth = useCallback(async () => {
    if (authCheckRef.current) return;
    authCheckRef.current = true;
    try {
      dispatch({ type: 'AUTH_LOADING' });
      let currentUser = await base44.auth.me();
      if (currentUser.role === 'admin' && (currentUser.coins || 0) < ADMIN_UNLIMITED_COINS) {
        currentUser = await base44.auth.updateMe({ coins: ADMIN_UNLIMITED_COINS });
      }
      dispatch({ type: 'AUTH_SUCCESS', user: currentUser });
    } catch (error) {
      console.error('User auth check failed:', error);
      // If user auth fails, it might be an expired token
      const authError =
        error.status === 401 || error.status === 403
          ? { type: 'auth_required', message: 'Authentication required' }
          : null;
      dispatch({ type: 'AUTH_FAILURE', authError });
    } finally {
      authCheckRef.current = false;
    }
  }, []);

  const checkAppState = useCallback(async () => {
    if (appStateCheckRef.current) return;
    appStateCheckRef.current = true;
    try {
      dispatch({ type: 'APP_LOADING' });

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        const appPublicSettings = { id: publicSettings.data?.id, public_settings: publicSettings.data?.public_settings };

        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          dispatch({ type: 'APP_SETTINGS_SUCCESS', appPublicSettings });
          await checkUserAuth();
        } else {
          dispatch({ type: 'APP_NO_TOKEN', appPublicSettings });
        }
      } catch (appError) {
        console.error('App state check failed:', appError);

        let authError;
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            authError = { type: 'auth_required', message: 'Authentication required' };
          } else if (reason === 'user_not_registered') {
            authError = { type: 'user_not_registered', message: 'User not registered for this app' };
          } else {
            authError = { type: reason, message: appError.message };
          }
        } else {
          authError = { type: 'unknown', message: appError.message || 'Failed to load app' };
        }
        dispatch({ type: 'APP_ERROR', authError });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      dispatch({ type: 'APP_ERROR', authError: { type: 'unknown', message: error.message || 'An unexpected error occurred' } });
    } finally {
      appStateCheckRef.current = false;
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const updateUser = useCallback((updatedUser) => {
    dispatch({ type: 'SET_USER', user: updatedUser });
  }, []);

  const logout = useCallback((shouldRedirect = true) => {
    dispatch({ type: 'LOGOUT' });

    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  }, []);

  const value = useMemo(() => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoadingAuth: state.isLoadingAuth,
    isLoadingPublicSettings: state.isLoadingPublicSettings,
    authError: state.authError,
    appPublicSettings: state.appPublicSettings,
    authChecked: state.authChecked,
    logout,
    updateUser,
    navigateToLogin,
    checkUserAuth,
    checkAppState
  }), [state, logout, updateUser, navigateToLogin, checkUserAuth, checkAppState]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};