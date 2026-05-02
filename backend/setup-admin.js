// Helper script to make a user admin and approved
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function setupAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection('login');

    // Update the admin-test@example.com user to be admin and approved
    const result = await col.updateOne(
      { email: 'admin-test@example.com' },
      {
        $set: {
          role: 'admin',
          isApproved: true,
          updated_at: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ User updated to admin and approved');
      
      // Show the updated user
      const user = await col.findOne({ email: 'admin-test@example.com' });
      console.log('Updated user:', {
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      });
    } else {
      console.log('❌ User not found or not modified');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

setupAdmin();
