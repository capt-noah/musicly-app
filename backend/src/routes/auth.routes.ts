import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  updateUserProfilePhoto,
  updateUserEmail,
  changeUserPassword,
} from '../services/auth.service';
import { createSession, destroySession } from '../services/session.service';
import { authenticateSession } from '../middleware/auth.middleware';

const router = Router();

// ==========================================
// 1. Registration (Username & Password Only)
// ==========================================
router.post('/register', async (req: Request, res: Response) => {
  const { username, password, email, telegramId, firstName, lastName } = req.body;

  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await registerUser(username, password, {
      email: email || null,
      firstName: firstName || null,
      lastName: lastName || null,
      telegramId: telegramId || null,
    });

    const sessionId = await createSession(user.id);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.status(201).json({
      message: 'Registration Successful',
      sessionId,
      user,
    });
  } catch (error: any) {
    console.error('[Auth] Registration Error:', error.message || error);
    if (error.code === '23505') {
      const field = error.detail?.includes('email') ? 'Email' : 'Username';
      return res.status(400).json({ error: `${field} already exists` });
    }
    const clientMessage = error.message || 'Registration failed';
    return res.status(400).json({ error: clientMessage });
  }
});

// ==========================================
// 2. Authentication (Timing-Safe Login)
// ==========================================
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await loginUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const sessionId = await createSession(user.id);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      message: 'Login Successful',
      sessionId,
      user,
    });
  } catch (error: any) {
    console.error('[Auth] Login Error:', error.message || error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 3. Session Teardown (Logout)
// ==========================================
router.post('/logout', authenticateSession as any, async (req: any, res: Response) => {
  try {
    await destroySession(req.sessionId);
    res.clearCookie('session_id');
    return res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Auth] Logout Error:', error.message || error);
    return res.status(500).json({ error: 'Could not log out' });
  }
});

// ==========================================
// 4. Current User Profile
// ==========================================
router.get('/me', authenticateSession as any, (req: any, res: Response) => {
  const { hashedPassword, ...safeUser } = req.user;
  return res.json(safeUser);
});

// ==========================================
// 5. Update Email (Managed via Profile)
// ==========================================
router.patch('/me/email', authenticateSession as any, async (req: any, res: Response) => {
  const { email } = req.body;

  try {
    const updatedUser = await updateUserEmail(req.user.id, email ?? null);
    return res.json({
      message: 'Email updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[Auth] Update Email Error:', error.message || error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This email is already in use by another account' });
    }
    return res.status(400).json({ error: error.message || 'Failed to update email' });
  }
});

// ==========================================
// 6. Change Password
// ==========================================
router.patch('/me/password', authenticateSession as any, async (req: any, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    await changeUserPassword(req.user.id, currentPassword, newPassword);

    // Issue a fresh session so the current client stays authenticated
    const newSessionId = await createSession(req.user.id);

    res.cookie('session_id', newSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      message: 'Password changed successfully',
      sessionId: newSessionId,
    });
  } catch (error: any) {
    console.error('[Auth] Password Change Error:', error.message || error);
    return res.status(400).json({ error: error.message || 'Failed to change password' });
  }
});

// ==========================================
// 7. Profile Photo Update
// ==========================================
router.patch('/me/profile-photo', authenticateSession as any, async (req: any, res: Response) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'No image data provided' });

  try {
    const updatedUser = await updateUserProfilePhoto(req.user.id, base64);
    return res.json({
      message: 'Profile photo updated',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[Auth] Profile photo update failed:', error.message || error);
    return res.status(500).json({ error: 'Failed to save profile photo' });
  }
});

export default router;
