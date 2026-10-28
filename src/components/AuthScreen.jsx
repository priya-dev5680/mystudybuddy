import { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

export function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  }

  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage({ type: 'error', text: 'Enter a valid email address to continue.' });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Your password must be at least 8 characters.' });
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Those passwords do not match yet.' });
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage({
            type: 'success',
            text: 'Your account is almost ready. Check your inbox for the confirmation link, then come back here to sign in.',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
    } catch (error) {
      const text = error?.message || 'We could not complete that request. Please try again.';
      setMessage({ type: 'error', text });
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-screen">
    <section className="auth-story" aria-label="Welcome to Study Club">
      <a className="auth-brand" href="#" onClick={event => event.preventDefault()} aria-label="Study Club home">
        <span className="auth-brand-mark"><BookOpen size={20}/></span><span><b>study club</b><small>your little corner to learn</small></span>
      </a>
      <div className="auth-story-copy">
        <span className="eyebrow"><Sparkles size={14}/> A CALMER WAY TO LEARN</span>
        <h1>Make a little room for your <em>next big idea.</em></h1>
        <p>Keep your subjects close, your progress in sight, and your study buddy by your side.</p>
      </div>
      <div className="auth-illustration" aria-hidden="true">
        <div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/>
        <div className="auth-sun"/><div className="auth-books"><i/><i/><i/></div>
        <div className="auth-character"><svg viewBox="0 0 40 40"><path d="M9 17 8 7l9 6m6 0 9-6-1 11"/><path d="M8 20c0-8 5-12 12-12s12 4 12 12-5 13-12 13S8 28 8 20Z"/><ellipse cx="15" cy="20" rx="1.6" ry="2"/><ellipse cx="25" cy="20" rx="1.6" ry="2"/><path d="M17 25q3 3 6 0"/></svg></div>
        <span className="auth-sticker">ONE PAGE<br/>AT A TIME</span><span className="auth-spark auth-spark-a">✳</span><span className="auth-spark auth-spark-b">✦</span>
      </div>
      <div className="auth-story-foot"><span>✦ &nbsp; LITTLE STEPS ADD UP</span><span>Made for your learning journey</span></div>
    </section>

    <section className="auth-form-side">
      <div className="auth-card">
        <div className="auth-card-top"><span className="auth-card-icon"><LockKeyhole size={17}/></span><span>YOUR STUDY SPACE</span></div>
        <h2>{mode === 'signin' ? 'Welcome back' : 'Start your journey'}</h2>
        <p className="auth-intro">{mode === 'signin' ? 'Pick up right where you left off.' : 'A cozy space for all the things you’re learning.'}</p>
        <div className="auth-tabs" role="group" aria-label="Account access">
          <button type="button" aria-pressed={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => changeMode('signin')} disabled={busy}>Log in</button>
          <button type="button" aria-pressed={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => changeMode('signup')} disabled={busy}>Create account</button>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === 'signup' && <label className="auth-field">YOUR NAME<input autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="How should we call you?" maxLength={80}/></label>}
          <label className="auth-field">EMAIL ADDRESS<span className="auth-input-wrap"><Mail size={16}/><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required/></span></label>
          <label className="auth-field">PASSWORD<span className="auth-input-wrap"><LockKeyhole size={16}/><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required/><button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>
          {mode === 'signup' && <label className="auth-field">CONFIRM PASSWORD<span className="auth-input-wrap"><LockKeyhole size={16}/><input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Enter your password again" minLength={8} required/></span></label>}
          {message && <div className={`auth-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.type === 'success' && <CheckCircle2 size={17}/>}<span>{message.text}</span></div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner"/> {mode === 'signup' ? 'Creating your space…' : 'Opening your space…'}</> : <>{mode === 'signup' ? 'Create my account' : 'Log in to Study Club'} <ArrowRight size={17}/></>}</button>
        </form>
        <p className="auth-privacy"><LockKeyhole size={13}/> Your study space is private to your account.</p>
      </div>
      <div className="auth-mobile-brand"><BookOpen size={15}/> study club <span>✦</span></div>
    </section>
  </main>;
}
