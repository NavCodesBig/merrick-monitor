const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/verifyToken');
const { supabaseAdmin } = require('../services/supabaseAdmin');

// POST /api/admin/users — create a new user account
router.post(
  '/users',
  verifyToken,
  requireRole('admin'),
  async (req, res) => {
    const { email, password, full_name, role, cabin_id } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'email, password, full_name, and role are required' });
    }

    const validRoles = ['nurse', 'counselor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
    }

    try {
      // Create user in Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          role,
          ...(cabin_id ? { cabin_id } : {}),
        },
      });

      if (error) throw error;

      // The trigger auto-creates the users row from metadata.
      // Optionally ensure cabin_id is set correctly if not handled by trigger.
      if (cabin_id && data.user) {
        await supabaseAdmin
          .from('users')
          .update({ cabin_id })
          .eq('id', data.user.id);
      }

      res.status(201).json({
        id: data.user.id,
        email: data.user.email,
        full_name,
        role,
        cabin_id: cabin_id ?? null,
      });
    } catch (err) {
      console.error('User creation error:', err);
      res.status(500).json({ error: err.message ?? 'Failed to create user' });
    }
  }
);

// DELETE /api/admin/users/:id — delete a user account
router.delete(
  '/users/:id',
  verifyToken,
  requireRole('admin'),
  async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('User deletion error:', err);
      res.status(500).json({ error: err.message ?? 'Failed to delete user' });
    }
  }
);

// GET /api/admin/users — list all users
router.get(
  '/users',
  verifyToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, full_name, role, cabin_id, created_at, cabins(name)')
        .order('full_name');

      if (error) throw error;
      res.json(data ?? []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
