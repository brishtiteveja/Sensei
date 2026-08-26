import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiErrorMessage } from '@/api';
import { clearTokens } from '@/lib/token-storage';
import type { User } from '@/types';
import { clearGuestAiSessionId } from '@/lib/guest-ai-session';
import { adoptAccount, learnerId, releaseAccount } from '@/lib/learner';
import { mergeLearner } from '@/api/sensei-work';

const ONBOARDING_KEY = 'has_completed_onboarding';

/**
 * Sensei has no auth backend — the app runs entirely as a local/guest session.
 * This provider keeps the original context surface (so every screen compiles and
 * behaves identically) but the social-login entry points are stubs.
 *
 * STUB: loginWithGoogle / loginWithFacebook — no auth backend in Sensei.
 */

type AuthStep = 'unauthenticated' | 'authenticated';

interface AuthState {
  step: AuthStep;
  user: User | null;
  isLoading: boolean; // true while hydrating local flags on boot
  hasCompletedOnboarding: boolean;
}

interface AuthContextValue {
  state: AuthState;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  resetAuth: () => void;
  completeOnboarding: () => void;
}

const initialState: AuthState = {
  step: 'unauthenticated',
  user: null,
  isLoading: true,
  hasCompletedOnboarding: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const isAuthenticated = state.step === 'authenticated' && state.user !== null;

  /*
   * Tie the tutor's memory to the person, not the handset.
   *
   * A student can work for weeks before signing in -- the tutor deliberately
   * does not ask first -- so their mastery accrues under a device id. At
   * sign-in that history is merged into the account, or they would meet a
   * tutor that had forgotten them, which is worse than one that never
   * remembered. Failure here is silent and non-blocking: losing the merge
   * costs history, but blocking the sign-in costs the session.
   */
  useEffect(() => {
    const accountId = state.user?.id;
    if (!isAuthenticated || !accountId) {
      void releaseAccount();
      return;
    }
    void (async () => {
      const orphan = await adoptAccount(String(accountId));
      if (!orphan) return;
      try {
        const { moved } = await mergeLearner(learnerId(), orphan);
        if (moved) console.info(`[learner] carried ${moved} observations into the account`);
      } catch {
        /* the account simply starts from what the server already had */
      }
    })();
  }, [isAuthenticated, state.user?.id]);

  // ─── Hydrate local session flags on boot ──────────────────
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const onboardingFlag = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            hasCompletedOnboarding: onboardingFlag === 'true',
          }));
        }
      } catch {
        // Local storage unavailable — start fresh
      } finally {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const setUser = useCallback((user: User | null) => {
    setState((prev) => ({
      ...prev,
      user,
      step: user ? 'authenticated' : 'unauthenticated',
    }));
  }, []);

  // ─── Social login (stubbed — no auth backend) ─────────────

  const loginWithGoogle = useCallback(async () => {
    throw new Error('Sign-in is not available in Sensei');
  }, []);

  const loginWithFacebook = useCallback(async () => {
    throw new Error('Sign-in is not available in Sensei');
  }, []);

  // ─── Logout ───────────────────────────────────────────────

  const logout = useCallback(async () => {
    await clearTokens();
    await clearGuestAiSessionId();
    setState({ ...initialState, isLoading: false });
  }, []);

  const resetAuth = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: 'unauthenticated',
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, hasCompletedOnboarding: true }));
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        isAuthenticated,
        setUser,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        resetAuth,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { getApiErrorMessage };
