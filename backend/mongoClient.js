const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || ''
let client

async function getClient() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing from environment variables!');
    throw new Error('MONGODB_URI not set');
  }
  if (!client) {
    try {
      console.log('⏳ Connecting to MongoDB...');
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      console.log('✅ MongoDB connected successfully');
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
      throw err;
    }
  }
  return client;
}

async function getDb() {
  const c = await getClient()
  const dbName = process.env.MONGODB_DB || 'TASKFLOW'
  return c.db(dbName)
}

async function getLoginCollection() {
  const db = await getDb()
  const col = db.collection('login')
  await col.createIndex({ email: 1 }, { unique: true })
  return col
}

async function getProjectsCollection() {
  const db = await getDb()
  const col = db.collection('projects')
  await col.createIndex({ owner_id: 1 })
  await col.createIndex({ members: 1 })
  return col
}

async function getTasksCollection() {
  const db = await getDb()
  const col = db.collection('tasks')
  await col.createIndex({ project_id: 1 })
  await col.createIndex({ creator_id: 1 })
  await col.createIndex({ assignee_id: 1 })
  return col
}

async function getUsersCollection() {
  return getLoginCollection()
}

module.exports = { getClient, getDb, getLoginCollection, getProjectsCollection, getTasksCollection, getUsersCollection }
