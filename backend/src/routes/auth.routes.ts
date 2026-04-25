import { Router } from 'express';
import { registerUser, loginUser, updateUserProfilePhoto } from '../services/auth.service';
import { createSession, destroySession } from '../services/session.service';
import { authenticateSession } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';

const router = Router();

router.post('/register', async (req: any, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  
  if (!username || !password || !firstName) {
    return res.status(400).json({ error: 'Username, password and first name are required' });
  }

  try {
    const user = await registerUser(
      null, 
      firstName,
      lastName || '',
      username,
      email || null,
      password,
      null 
    );

    const sessionId = await createSession(user.id);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.json({
      message: 'Registration Successful',
      sessionId,
      user
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    if (error.code === '23505') { 
      const field = error.detail?.includes('email') ? 'Email' : 'Username';
      return res.status(400).json({ error: `${field} already exists` });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: any, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  try {
    const user = await loginUser(username, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const sessionId = await createSession(user.id);

    res.cookie('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.json({
      message: 'Login Successful',
      sessionId,
      user: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePhoto: user.profilePhoto,
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticateSession as any, async (req: any, res) => {
  try {
    await destroySession(req.sessionId);
    res.clearCookie('session_id');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Could not log out' });
  }
});

router.get('/me', authenticateSession as any, (req: any, res) => {
  res.json(req.user);
});

router.patch('/me/profile-photo', authenticateSession as any, async (req: any, res) => {
  const { base64 } = req.body;
  if (!base64) return res.status(400).json({ error: 'No image data provided' });

  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // 1. Delete old local file if it exists to prevent server bloat
    if (req.user.profilePhoto && req.user.profilePhoto.includes('/uploads/')) {
      try {
        const oldFileName = req.user.profilePhoto.split('/uploads/')[1];
        const oldFilePath = path.join(uploadDir, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('Cleaned up old profile photo:', oldFileName);
        }
      } catch (err) {
        console.warn('Failed to delete old profile photo:', err);
      }
    }

    const fileName = `avatar_${req.user.id}_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, fileName);
    
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
    const updatedUser = await updateUserProfilePhoto(req.user.id, photoUrl);

    res.json({ 
      message: 'Profile photo updated', 
      user: {
        ...req.user,
        profilePhoto: updatedUser.profilePhoto
      }
    });
  } catch (error) {
    console.error('Profile photo update failed:', error);
    res.status(500).json({ error: 'Failed to save profile photo' });
  }
});

export default router;
