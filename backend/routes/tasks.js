const express = require('express');
const { ObjectId } = require('mongodb');
const { authenticate, requireApproval, requireAdmin, requireProjectMembership, requireTaskAccess } = require('../middleware/auth');
const mongo = require('../mongoClient');
const { validateTask } = require('../helpers/validation');

const router = express.Router();
router.use(authenticate, requireApproval);

// Get tasks for a project - MUST BE PROJECT MEMBER
router.get('/project/:projectId', requireProjectMembership, async (req, res) => {
  try {
    const { status, priority, assignee } = req.query;
    const col = await mongo.getTasksCollection();
    
    let filter = { project_id: req.project._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee_id = new ObjectId(assignee);
    
    const tasks = await col.find(filter).toArray();
    const formattedTasks = (tasks || []).map(t => ({
      ...t,
      id: t._id.toString()
    }));
    res.json({ tasks: formattedTasks });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Get all tasks for current user (dashboard)
router.get('/my', async (req, res) => {
  try {
    const col = await mongo.getTasksCollection();
    const userId = new ObjectId(req.user.id);
    const tasks = await col.find({
      $or: [{ assignee_id: userId }, { creator_id: userId }]
    }).sort({ due_date: 1, created_at: -1 }).limit(50).toArray();
    const formattedTasks = (tasks || []).map(t => ({
      ...t,
      id: t._id.toString()
    }));
    res.json({ tasks: formattedTasks });
  } catch (err) {
    console.error('Get my tasks error:', err);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Create task - ADMIN ONLY (for assigning to team members)
router.post('/', requireAdmin, async (req, res) => {
  // Validate request data
  const validation = validateTask(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors[0], errors: validation.errors });
  }

  const { title, description, priority, status, project_id, assignee_id, due_date } = validation.data;

  try {
    const projectsCol = await mongo.getProjectsCollection();
    const projectId = new ObjectId(project_id);
    const project = await projectsCol.findOne({ _id: projectId });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    // Verify assignee is a member of the project if assigning
    if (assignee_id) {
      const assigneeId = new ObjectId(assignee_id);
      if (!project.members.some(m => m.toString() === assigneeId.toString())) {
        return res.status(403).json({ error: 'Assignee must be a project member' });
      }
    }

    const tasksCol = await mongo.getTasksCollection();
    const result = await tasksCol.insertOne({
      title,
      description,
      status,
      priority,
      project_id: projectId,
      creator_id: new ObjectId(req.user.id),
      assignee_id: assignee_id ? new ObjectId(assignee_id) : null,
      due_date: due_date ? new Date(due_date) : null,
      created_at: new Date(),
      updated_at: new Date()
    });

    const task = await tasksCol.findOne({ _id: result.insertedId });
    res.status(201).json({ task: { ...task, id: task._id.toString() } });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task - ONLY CREATOR/ASSIGNEE CAN MODIFY
router.put('/:id', requireTaskAccess, async (req, res) => {
  try {
    const col = await mongo.getTasksCollection();
    const isAdmin = req.user.role === 'admin';
    const isMember = req.user.role === 'member';
    const task = req.task;
    const { title, description, status, priority, due_date, assignee_id, project_id } = req.body;

    // Restriction for members: ONLY their assigned tasks
    if (isMember && task.assignee_id?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Members can only update their assigned tasks' });
    }

    // Members can only update status
    if (isMember) {
      if (priority || title || description || due_date || assignee_id || project_id) {
        return res.status(403).json({ error: 'Members can only update task status' });
      }
    }

    // Status flow validation (Members only)
    if (isMember && status && status !== task.status) {
      const allowedTransitions = {
        'assigned': ['in_progress'],
        'in_progress': ['completed'],
        'completed': []
      };
      
      const currentStatus = task.status || 'assigned';
      const nextStatuses = allowedTransitions[currentStatus] || [];
      
      if (!nextStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status transition from ${currentStatus} to ${status}` });
      }
    }

    // If changing assignee or project, verify membership (Admin only)
    let newProjectId = task.project_id;
    if (isAdmin && project_id) {
      newProjectId = new ObjectId(project_id);
      const projectsCol = await mongo.getProjectsCollection();
      const project = await projectsCol.findOne({ _id: newProjectId });
      if (!project) return res.status(404).json({ error: 'Target project not found' });
    }

    let newAssigneeId = task.assignee_id;
    if (isAdmin && assignee_id !== undefined) {
      if (assignee_id === null) {
        newAssigneeId = null;
      } else {
        newAssigneeId = new ObjectId(assignee_id);
        const projectsCol = await mongo.getProjectsCollection();
        const project = await projectsCol.findOne({ _id: newProjectId });
        if (!project.members.some(m => m.toString() === newAssigneeId.toString())) {
          return res.status(403).json({ error: 'Assignee must be a project member' });
        }
      }
    }

    await col.updateOne({ _id: task._id }, { $set: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(due_date !== undefined && { due_date: due_date ? new Date(due_date) : null }),
      ...(isAdmin && project_id && { project_id: newProjectId }),
      ...(isAdmin && assignee_id !== undefined && { assignee_id: newAssigneeId }),
      updated_at: new Date()
    }});

    const updated = await col.findOne({ _id: req.task._id });
    res.json({ task: { ...updated, id: updated._id.toString() } });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task - CREATOR OR ADMIN ONLY
router.delete('/:id', requireTaskAccess, async (req, res) => {
  try {
    const col = await mongo.getTasksCollection();
    
    // Only creator or admin can delete
    if (!req.isTaskCreator && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only creator or admin can delete tasks' });
    }
    
    await col.deleteOne({ _id: req.task._id });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get comments - MUST HAVE TASK ACCESS
router.get('/:id/comments', requireTaskAccess, async (req, res) => {
  try {
    const db = await mongo.getDb();
    const commentsCol = db.collection('comments');
    
    const comments = await commentsCol.aggregate([
      { $match: { task_id: req.task._id } },
      { $lookup: {
          from: 'login',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
          content: 1,
          created_at: 1,
          user_name: '$user.name',
          avatar_color: '$user.avatar_color'
      }},
      { $sort: { created_at: 1 } }
    ]).toArray();
    
    res.json({ comments: comments || [] });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// Add comment - MUST HAVE TASK ACCESS
router.post('/:id/comments', requireTaskAccess, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content is required' });
  try {
    const db = await mongo.getDb();
    const commentsCol = db.collection('comments');
    const result = await commentsCol.insertOne({
      task_id: req.task._id,
      user_id: new ObjectId(req.user.id),
      content: content.trim(),
      created_at: new Date()
    });

    // Update task's updated_at to reflect recent activity
    const tasksCol = await mongo.getTasksCollection();
    await tasksCol.updateOne({ _id: req.task._id }, { $set: { updated_at: new Date() } });

    const comment = await commentsCol.findOne({ _id: result.insertedId });
    res.status(201).json({ comment });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
