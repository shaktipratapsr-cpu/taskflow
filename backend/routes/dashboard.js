const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../database');
const { authenticate, requireApproval } = require('../middleware/auth');
const mongo = require('../mongoClient');

const router = express.Router();
router.use(authenticate, requireApproval);

router.get('/stats', async (req, res) => {
  try {
    const projectsCol = await mongo.getProjectsCollection();
    const tasksCol = await mongo.getTasksCollection();
    const usersCol = await mongo.getLoginCollection();
    const userId = new ObjectId(req.user.id);

    let projectCount, taskStats, overdueTasks, recentActivity, teamStats;

    const today = new Date().toISOString().split('T')[0];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (req.user.role === 'admin') {
      projectCount = await projectsCol.countDocuments({});
      const stats = await tasksCol.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
            in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            overdue: { $sum: { $cond: [{ $and: [{ $lt: ['$due_date', todayStart] }, { $ne: ['$status', 'completed'] }, { $ne: ['$due_date', null] }] }, 1, 0] } }
          }
        }
      ]).toArray();
      taskStats = stats[0] || { total: 0, assigned: 0, in_progress: 0, completed: 0, overdue: 0 };
      teamStats = await usersCol.countDocuments({});
    } else {
      projectCount = await projectsCol.countDocuments({
        $or: [{ owner_id: userId }, { members: userId }]
      });
      const stats = await tasksCol.aggregate([
        { $match: { $or: [{ assignee_id: userId }, { creator_id: userId }] } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
            in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            overdue: { $sum: { $cond: [{ $and: [{ $lt: ['$due_date', todayStart] }, { $ne: ['$status', 'completed'] }, { $ne: ['$due_date', null] }] }, 1, 0] } }
          }
        }
      ]).toArray();
      taskStats = stats[0] || { total: 0, assigned: 0, in_progress: 0, completed: 0, overdue: 0 };
      teamStats = 0;
    }

    // Overdue tasks list
    const overdueFilter = {
      due_date: { $lt: todayStart, $ne: null },
      status: { $ne: 'completed' }
    };
    if (req.user.role !== 'admin') {
      overdueFilter.$or = [{ assignee_id: userId }, { creator_id: userId }];
    }
    overdueTasks = await tasksCol.find(overdueFilter).sort({ due_date: 1 }).limit(5).toArray();

    // Recent activity (Joined with Projects for colors)
    const recentFilter = {};
    if (req.user.role !== 'admin') {
      recentFilter.$or = [{ assignee_id: userId }, { creator_id: userId }];
    }
    recentActivity = await tasksCol.aggregate([
      { $match: recentFilter },
      { $sort: { updated_at: -1 } },
      { $limit: 10 },
      { $lookup: {
          from: 'projects',
          localField: 'project_id',
          foreignField: '_id',
          as: 'project'
      }},
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      { $project: {
          _id: 1, title: 1, status: 1, updated_at: 1,
          project_color: '$project.color',
          project_name: '$project.name'
      }}
    ]).toArray();

    res.json({ 
      projectCount, 
      taskStats, 
      teamStats, 
      overdueTasks: overdueTasks.map(t => ({ ...t, id: t._id.toString() })), 
      recentActivity: recentActivity.map(t => ({ ...t, id: t._id.toString() })) 
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const col = await mongo.getLoginCollection();
    const users = await col.find({}, { projection: { name: 1, email: 1, role: 1, avatar_color: 1, isApproved: 1 } }).toArray();
    
    const formattedUsers = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      avatar_color: u.avatar_color,
      isApproved: u.isApproved
    }));
    
    res.json({ users: formattedUsers });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to load team' });
  }
});

module.exports = router;
