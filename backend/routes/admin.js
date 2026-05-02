const express = require('express');
const { ObjectId } = require('mongodb');
const { authenticate, requireApproval, requireAdmin } = require('../middleware/auth');
const mongo = require('../mongoClient');

const router = express.Router();

// All routes require authentication and approval
router.use(authenticate, requireApproval);

// GET /admin/users - List all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const col = await mongo.getLoginCollection();
    const users = await col.find({}, { projection: { password: 0 } }).toArray();
    
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved ?? false,
      avatar_color: user.avatar_color,
      created_at: user.created_at
    }));
    
    res.json({ users: formattedUsers });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// PATCH /admin/users/:id/approve - Approve a user (admin only)
router.patch('/users/:id/approve', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    const col = await mongo.getLoginCollection();
    const objectId = new ObjectId(userId);
    
    const user = await col.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update isApproved field
    const result = await col.updateOne(
      { _id: objectId },
      { $set: { isApproved: true, updated_at: new Date() } }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'User already approved' });
    }
    
    const updatedUser = await col.findOne({ _id: objectId }, { projection: { password: 0 } });
    
    res.json({
      message: 'User approved successfully',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isApproved: updatedUser.isApproved,
        avatar_color: updatedUser.avatar_color,
        created_at: updatedUser.created_at
      }
    });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// PATCH /admin/users/:id/reject - Reject/unapprove a user (admin only)
router.patch('/users/:id/reject', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate ObjectId format
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    const col = await mongo.getLoginCollection();
    const objectId = new ObjectId(userId);
    
    const user = await col.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent removing approval from self
    if (user._id.toString() === req.user.id) {
      return res.status(403).json({ error: 'Cannot remove your own approval' });
    }
    
    // Prevent removing approval from other admins
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot remove approval from admin users' });
    }
    
    // Update isApproved field
    const result = await col.updateOne(
      { _id: objectId },
      { $set: { isApproved: false, updated_at: new Date() } }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: 'User already rejected' });
    }
    
    const updatedUser = await col.findOne({ _id: objectId }, { projection: { password: 0 } });
    
    res.json({
      message: 'User rejected successfully',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isApproved: updatedUser.isApproved,
        avatar_color: updatedUser.avatar_color,
        created_at: updatedUser.created_at
      }
    });
  } catch (err) {
    console.error('Reject user error:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// DELETE /admin/users/:id - Remove a user from the system (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    if (userId === req.user.id) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }

    const objectId = new ObjectId(userId);
    const now = new Date();

    const usersCol = await mongo.getLoginCollection();
    const projectsCol = await mongo.getProjectsCollection();
    const tasksCol = await mongo.getTasksCollection();

    const user = await usersCol.findOne({ _id: objectId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If the user owns projects, transfer ownership to the deleting admin.
    await projectsCol.updateMany(
      { owner_id: objectId },
      {
        $set: {
          owner_id: new ObjectId(req.user.id),
          updated_at: now
        },
        $addToSet: {
          members: new ObjectId(req.user.id)
        },
        $pull: {
          members: objectId
        }
      }
    );

    // Remove the user from all other project member lists.
    await projectsCol.updateMany(
      { members: objectId },
      {
        $pull: { members: objectId },
        $set: { updated_at: now }
      }
    );

    // Keep tasks as history, but unassign any tasks currently assigned to the user.
    const taskUpdate = await tasksCol.updateMany(
      { assignee_id: objectId },
      {
        $set: {
          assignee_id: null,
          updated_at: now
        }
      }
    );

    await usersCol.deleteOne({ _id: objectId });

    res.json({
      message: 'User deleted successfully',
      userId,
      tasksUnassigned: taskUpdate.modifiedCount
    });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
