import React from 'react';
import LoginForm from './components/LoginForm';
import AuthBrandPanel from './components/AuthBrandPanel';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-background flex">
      <AuthBrandPanel />
      <LoginForm />
    </div>
  );
}