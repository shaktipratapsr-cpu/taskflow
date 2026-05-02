# 🚀 TaskFlow — Enterprise Team Productivity SaaS

**TaskFlow** is a premium, full-stack project and task management application designed for modern teams. It features a stunning dark-themed interface with glassmorphism, interactive data visualization, and a robust role-based access control (RBAC) system.

---

## ✨ Premium Features

- **📊 Intelligent Dashboard**
  - **Dynamic Stats**: Real-time tracking of projects, tasks, and completion rates.
  - **Interactive Tracking**: Three-column visual progress cards (Assigned, In Progress, Completed).
  - **Smart Navigation**: One-click shortcuts from high-level stats to detailed project/task views.
  - **Real-time Activity**: Live-updating recent activity feed synced with team comments.
- **📁 Advanced Project Management**
  - **Admin-Controlled Creation**: Centralized project management restricted to Administrators.
  - **Team Collaboration**: Granular member management within projects.
  - **Visual Progress**: Project-level progress bars and status badges.
- **✅ Specialized Task Tracking**
  - **Pro-Level Task Cards**: Detailed cards with priority badges, assignee avatars, and due-date alerts.
  - **Overdue Detection**: Automated tracking and highlighted alerts for past-due tasks.
  - **Comment Threads**: Built-in discussion system for every task.
- **🛡️ Enterprise-Grade Security**
  - **JWT Authentication**: Secure, token-based login and session management.
  - **Admin Approval System**: New registrations require manual Admin approval before access.
  - **RBAC**: Strict role enforcement for data integrity and privacy.

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB (Atlas) |
| **Auth** | JSON Web Tokens (JWT) + bcrypt.js |
| **Frontend** | Pure Vanilla JS + Modern CSS3 (CSS Variables, Flex/Grid) |
| **Design** | Dark Mode SaaS Aesthetic, Glassmorphism, Inter Typography |

---

## 🔑 Access Credentials

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Administrator** | `recruiter@ethara.com` | `123456` | Full control, User Approval, Project Creation |
| **Team Member** | `employee@ethara.com` | `123456` | Task management, Status updates, Comments |

> [!NOTE]
> All new registrations are placed in a **Pending** state. You must log in as an Admin to approve new users in the **Team Management** panel.

---

## 🔐 Permissions Matrix

| Action | Admin | Member |
|--------|:---:|:---:|
| **Create Project** | ✅ | ❌ |
| **Approve New Users** | ✅ | ❌ |
| **Add/Remove Project Members** | ✅ | ❌ |
| **Edit/Delete Any Project** | ✅ | ❌ |
| **Create Task** | ✅ | ✅ |
| **Update Task Status** | ✅ | ✅ (Assigned only) |
| **Delete Task** | ✅ | ✅ (Creator only) |
| **View Dashboard Stats** | ✅ | ✅ (Personal) |

---

## 📁 Installation & Setup

1. **Clone & Install**:
   ```bash
   npm install
   ```
2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_random_secret
   ```
3. **Run Application**:
   ```bash
   # Development Mode
   npm run dev
   
   # Production Mode
   npm start
   ```

---

## 🎨 Design Philosophy
TaskFlow uses a centralized CSS variable system (`style.css`) to maintain a cohesive brand identity. 
- **Typography**: Inter (System-optimized sans-serif).
- **Color Palette**: Deep backgrounds (`#060612`) with vibrant accents (`#6366f1`).
- **Interactions**: Smooth 0.2s transitions, 3D hover effects on cards, and animated toast notifications.

---

## 📝 License
This project is proprietary and confidential. Licensed under MIT for internal team use.
