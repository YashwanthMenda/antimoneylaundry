'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Copy, Check, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface DemoCredential {
  role: string;
  email: string;
  password: string;
  description: string;
}

const demoCredentials: DemoCredential[] = [
  {
    role: 'AML Analyst',
    email: 'analyst.sharma@aml-bank.in',
    password: 'Analyst@AML2026',
    description: 'Read-only · Alert triage',
  },
  {
    role: 'Senior Officer',
    email: 'priya.mehta@aml-bank.in',
    password: 'Sr0fficer@AML26',
    description: 'Full access · SAR filing',
  },
  {
    role: 'Compliance Admin',
    email: 'admin.iyer@aml-bank.in',
    password: 'Admin#Comply2026',
    description: 'System config · User mgmt',
  },
];

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUseCredential = (cred: DemoCredential) => {
    setValue('email', cred.email);
    setValue('password', cred.password);
    setLoginError(null);
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      await signIn(data.email, data.password);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setLoginError(
        err?.message?.includes('Invalid login credentials')
          ? 'Invalid credentials — use the demo accounts below to sign in' : err?.message ||'Sign in failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-md">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <LogIn size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">AntiMoneyLaundry</span>
        </div>

        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
          {isSignUp ? 'Request Access' : 'Sign in to your account'}
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          {isSignUp
            ? 'Submit your details — access is approved by your institution admin.' :'Enter your institutional credentials to access the compliance platform.'}
        </p>

        {/* Error alert */}
        {loginError && (
          <div className="mb-5 p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-foreground mb-1.5">
              Institutional Email
            </label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Use your bank or compliance department email address
            </p>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="officer@yourbank.in"
              {...register('email', {
                required: 'Email address is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
              className={`w-full bg-input border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-150 focus:ring-1 focus:ring-ring ${
                errors.email ? 'border-primary' : 'border-border focus:border-ring'
              }`}
            />
            {errors.email && (
              <p className="mt-1.5 text-[11px] text-primary">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-foreground">
                Password
              </label>
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
                className={`w-full bg-input border rounded-md px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-150 focus:ring-1 focus:ring-ring ${
                  errors.password ? 'border-primary' : 'border-border focus:border-ring'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-[11px] text-primary">{errors.password.message}</p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2.5">
            <input
              id="rememberMe"
              type="checkbox"
              {...register('rememberMe')}
              className="w-3.5 h-3.5 rounded border-border bg-input accent-primary cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer">
              Keep me signed in for 8 hours
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-2.5 rounded-md hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ minHeight: '42px' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <span>{isSignUp ? 'Request Access' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* MFA note */}
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          MFA required for accounts with SAR filing permissions
        </p>

        {/* Toggle sign-up/login */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {isSignUp ? (
            <>
              Already have access?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Need institutional access?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-primary hover:underline font-medium"
              >
                Request access
              </button>
            </>
          )}
        </p>

        {/* Demo credentials */}
        {!isSignUp && (
          <div className="mt-8 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Demo Credentials
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {demoCredentials.map((cred) => (
                <div
                  key={`demo-${cred.role}`}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-foreground">{cred.role}</span>
                      <span className="text-[9px] text-muted-foreground">{cred.description}</span>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      {cred.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(cred.password, `${cred.role}-pwd`)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Copy password"
                    >
                      {copiedField === `${cred.role}-pwd` ? (
                        <Check size={11} className="text-green-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseCredential(cred)}
                      className="text-[10px] font-semibold text-primary hover:text-primary/80 px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}