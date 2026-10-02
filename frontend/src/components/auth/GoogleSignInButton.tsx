import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { googleLoginUser } from '../../services/api';
import { signInWithGoogleFirebase } from '../../services/firebase';
import { getRoleDashboardPath, markSessionActive } from '../../utils/sessionUtils';

interface GoogleSignInButtonProps {
  text?: string;
  className?: string;
  onSuccess?: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  text = 'Sign in with Google',
  className = '',
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFirebaseGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate with official Google OAuth / Firebase Popup Window
      const firebaseUser = await signInWithGoogleFirebase();

      // 2. Pass credential details & ID token to Backend auth service
      const res = await googleLoginUser({
        google_token: firebaseUser.idToken,
        email: firebaseUser.email,
        full_name: firebaseUser.displayName,
      });

      if (res?.access_token) {
        markSessionActive();
        localStorage.setItem('access_token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('storage'));
      }

      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');

      if (onSuccess) {
        onSuccess();
      } else if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl);
      } else {
        const targetPath = getRoleDashboardPath(res?.user);
        navigate(targetPath);
      }
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err);
      let msg = 'Google Sign-In failed. Please try again.';
      const rawMsg = err?.message || '';
      const code = err?.code || '';

      if (code === 'auth/popup-closed-by-user' || rawMsg.includes('popup-closed') || rawMsg.includes('cancelled')) {
        msg = 'Google Sign-In was cancelled.';
      } else if (code === 'auth/popup-blocked' || rawMsg.includes('popup-blocked')) {
        msg = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
        msg = 'This domain is not authorized for Google Sign-In. Please add it to Firebase Console Authorized Domains.';
      } else if (
        code === 'auth/api-key-not-valid' ||
        code === 'auth/invalid-api-key' ||
        rawMsg.includes('api-key-not-valid') ||
        rawMsg.includes('invalid-api-key')
      ) {
        msg = 'Google Sign-In is temporarily unavailable. Please ensure Firebase environment variables are configured.';
      } else if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
        msg = 'Google Sign-In is disabled. Please enable Google provider in the Firebase Console.';
      } else if (code === 'auth/network-request-failed' || rawMsg.includes('network-request-failed')) {
        msg = 'Network error during Google Sign-In. Please check your internet connection.';
      } else if (rawMsg) {
        msg = rawMsg;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleFirebaseGoogleSignIn}
        disabled={isLoading}
        className={`w-full py-3 px-4 flex items-center justify-center gap-3 rounded-2xl bg-white/45 hover:bg-white/65 backdrop-blur-md border border-white/75 text-[#4A3E32] font-extrabold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#38A132]/30 active:scale-[0.99] disabled:opacity-60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.03)] cursor-pointer ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#38A132]" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{text}</span>
          </>
        )}
      </button>

      {errorMessage && (
        <p className="text-[11px] text-rose-700 font-bold text-center animate-fadeIn">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
