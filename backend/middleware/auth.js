const jwt = require('jsonwebtoken');
const mongo = require('../mongoClient');
const { ObjectId } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secret-key-2024';

/**
 * Authenticate user via JWT token
 */
async function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const col = await mongo.getLoginCollection();
    const user = await col.findOne({ _id: new ObjectId(payload.id) }, { projection: { name: 1, email: 1, role: 1, avatar_color: 1, isApproved: 1 } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, avatar_color: user.avatar_color, isApproved: user.isApproved };
    next();
  } catch (e) {
    console.error('Auth error:', e);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require account approval
 */
function requireApproval(req, res, next) {
  if (!req.user?.isApproved) {
    return res.status(403).json({ error: 'Access denied. Your account is pending admin approval.' });
  }
  next();
}

/**
 * Require Admin role
 */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Require Member role (non-admin)
 */
function requireMember(req, res, next) {
  if (req.user?.role !== 'member') {
    return res.status(403).json({ error: 'Member access required' });
  }
  next();
}

/**
 * Check if user is project member or owner or admin
 * Attaches projectId and isOwner to req for use in route handlers
 */
async function requireProjectMembership(req, res, next) {
  try {
    const projectId = req.params.projectId || req.body.project_id;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const col = await mongo.getProjectsCollection();
    const project = await col.findOne({ _id: new ObjectId(projectId) });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const userId = new ObjectId(req.user.id);
    const isOwner = project.owner_id.toString() === req.user.id;
    const isMember = project.members?.some(m => m.toString() === req.user.id);
    const isAdmin = req.user.role === 'admin';

    // User must be owner, member, or admin
    if (!isOwner && !isMember && !isAdmin) {
      return res.status(403).json({ error: 'Access denied - not part of this project' });
    }

    req.project = project;
    req.isProjectOwner = isOwner;
    req.isProjectMember = isMember;
    next();
  } catch (err) {
    console.error('Project membership check error:', err);
    res.status(500).json({ error: 'Failed to verify project access' });
  }
}

/**
 * Check if user can assign tasks (admin or project owner only)
 */
async function requireCanAssignTasks(req, res, next) {
  try {
    const userId = new ObjectId(req.user.id);
    const isAdmin = req.user.role === 'admin';
    const isProjectOwner = req.isProjectOwner;

    if (!isAdmin && !isProjectOwner) {
      return res.status(403).json({ error: 'Only admins and project owners can assign tasks' });
    }

    next();
  } catch (err) {
    console.error('Task assignment check error:', err);
    res.status(500).json({ error: 'Failed to verify assignment permission' });
  }
}

/**
 * Check if user can manage project members (admin or project owner only)
 */
async function requireCanManageMembers(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const isProjectOwner = req.isProjectOwner;

    if (!isAdmin && !isProjectOwner) {
      return res.status(403).json({ error: 'Only admins and project owners can manage members' });
    }

    next();
  } catch (err) {
    console.error('Member management check error:', err);
    res.status(500).json({ error: 'Failed to verify management permission' });
  }
}

/**
 * Check if user can access/modify a task
 * Checks ownership or assignment
 */
async function requireTaskAccess(req, res, next) {
  try {
    const taskId = req.params.id || req.params.taskId;
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    if (!ObjectId.isValid(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    const col = await mongo.getTasksCollection();
    const task = await col.findOne({ _id: new ObjectId(taskId) });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const userId = req.user.id;
    const isCreator = task.creator_id.toString() === userId;
    const isAssignee = task.assignee_id?.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    // Check project membership
    const projectsCol = await mongo.getProjectsCollection();
    const project = await projectsCol.findOne({ _id: task.project_id });
    const isProjectMember = project?.members?.some(m => m.toString() === userId);

    // Only creator, assignee, admin, or project member can access
    if (!isCreator && !isAssignee && !isAdmin && !isProjectMember) {
      return res.status(403).json({ error: 'Access denied - you are not a member of this project' });
    }

    req.task = task;
    req.isTaskCreator = isCreator;
    req.isTaskAssignee = isAssignee;
    req.isProjectMember = isProjectMember;
    next();
  } catch (err) {
    console.error('Task access check error:', err);
    res.status(500).json({ error: 'Failed to verify task access' });
  }
}

module.exports = {
  authenticate,
  requireApproval,
  requireAdmin,
  requireMember,
  requireProjectMembership,
  requireCanAssignTasks,
  requireCanManageMembers,
  requireTaskAccess,
  JWT_SECRET
};
