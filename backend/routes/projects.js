const express = require('express');
const { ObjectId } = require('mongodb');
const { authenticate, requireApproval, requireAdmin, requireProjectMembership, requireCanManageMembers } = require('../middleware/auth');
const mongo = require('../mongoClient');
const { validateProject } = require('../helpers/validation');

const router = express.Router();
router.use(authenticate, requireApproval);

// Get all projects for current user
router.get('/', async (req, res) => {
  try {
    const col = await mongo.getProjectsCollection();
    const userId = new ObjectId(req.user.id);
    let projects;
    if (req.user.role === 'admin') {
      projects = await col.find({}).toArray();
    } else {
      projects = await col.find({
        $or: [{ owner_id: userId }, { members: userId }]
      }).toArray();
    }
    const formattedProjects = (projects || []).map(p => ({
      ...p,
      id: p._id.toString()
    }));
    res.json({ projects: formattedProjects });
  } catch (err) {
    console.error('Get projects error:', err);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// Create project - ADMIN ONLY
router.post('/', requireAdmin, async (req, res) => {
  // Validate request data
  const validation = validateProject(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
  }

  const { name, description, color } = validation.data;

  try {
    const col = await mongo.getProjectsCollection();
    const result = await col.insertOne({
      name,
      description,
      color,
      owner_id: new ObjectId(req.user.id),
      members: [new ObjectId(req.user.id)],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });
    res.status(201).json({
      project: {
        id: result.insertedId.toString(),
        name,
        description,
        color,
        owner_id: req.user.id,
        status: 'active',
        created_at: new Date()
      }
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get single project - MUST BE MEMBER
router.get('/:projectId', requireProjectMembership, async (req, res) => {
  try {
    const loginCol = await mongo.getLoginCollection();
    const memberIds = req.project.members || [];
    const members = await loginCol.find({ _id: { $in: memberIds } }, { projection: { name: 1, email: 1, avatar_color: 1, role: 1 } }).toArray();

    const formattedProject = {
      ...req.project,
      id: req.project._id.toString()
    };

    res.json({ 
      project: formattedProject,
      members: members.map(m => ({ ...m, id: m._id.toString() }))
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

// Update project - OWNER OR ADMIN ONLY
router.put('/:projectId', requireProjectMembership, async (req, res) => {
  const { name, description, color, status } = req.body;
  
  // Only admin or project owner can update
  if (!req.isProjectOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only project owner can update project' });
  }

  try {
    const col = await mongo.getProjectsCollection();
    await col.updateOne(
      { _id: req.project._id },
      { $set: { ...(name && { name }), ...(description !== undefined && { description }), ...(color && { color }), ...(status && { status }), updated_at: new Date() } }
    );
    const updated = await col.findOne({ _id: req.project._id });
    res.json({ project: { ...updated, id: updated._id.toString() } });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project - OWNER OR ADMIN ONLY
router.delete('/:projectId', requireProjectMembership, async (req, res) => {
  // Only admin or project owner can delete
  if (!req.isProjectOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only project owner can delete project' });
  }

  try {
    const projectsCol = await mongo.getProjectsCollection();
    const tasksCol = await mongo.getTasksCollection();
    
    // Cascading delete: remove all tasks associated with this project
    await tasksCol.deleteMany({ project_id: req.project._id });
    
    await projectsCol.deleteOne({ _id: req.project._id });
    res.json({ message: 'Project and associated tasks deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add member - ADMIN ONLY
router.post('/:projectId/members', requireAdmin, requireProjectMembership, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  try {
    const col = await mongo.getProjectsCollection();
    const loginCol = await mongo.getLoginCollection();
    const user = await loginCol.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found with that email' });
    
    const userId = user._id;
    if (req.project.members.some(m => m.toString() === userId.toString())) {
      return res.status(409).json({ error: 'User is already a member' });
    }
    
    await col.updateOne({ _id: req.project._id }, { $push: { members: userId } });
    res.json({ message: 'Member added', user: { id: userId, name: user.name, email: user.email, avatar_color: user.avatar_color } });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member - ADMIN ONLY
router.delete('/:projectId/members/:userId', requireAdmin, requireProjectMembership, async (req, res) => {
  try {
    const projectsCol = await mongo.getProjectsCollection();
    const userId = new ObjectId(req.params.userId);

    // Cannot remove the owner of the project
    if (req.project.owner_id.toString() === userId.toString()) {
      return res.status(403).json({ error: 'Cannot remove the project owner' });
    }
    
    await projectsCol.updateOne({ _id: req.project._id }, { $pull: { members: userId } });
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
