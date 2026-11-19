# InfraSoko - Infrastructure Project Management System

InfraSoko is a comprehensive web-based infrastructure project management system built with React, TypeScript, and modern web technologies. It provides a robust platform for managing infrastructure projects, procurement processes, and team collaboration.

## 🚀 Features

### User Management
- Role-based access control (Admin, Client, Contractor, Consultant)
- Secure authentication system
- User profile management
- Customizable permissions

### Project Management
- Create and manage infrastructure projects
- Track project progress and status
- Assign team members and roles
- Monitor project timelines and budgets
- Real-time project updates

### Procurement Module
- Material request management
- Purchase order creation and tracking
- Bid submission system
- Supplier management
- Cost tracking and analysis

### Dashboard
- Real-time project metrics
- Team performance analytics
- Budget tracking
- Task completion status
- Interactive charts and visualizations

## 🎬 Live demo (no account needed)

Send prospects to **`https://<your-site>/demo`** (or they click **Try the live demo** on the home page or
**Explore the live demo** on the sign-in page). They land on the dashboard of *Demo Construction Ltd* with four
sample projects; *Kigali Business Hub – Office Block* is fully filled in (timeline, BoQ, budget, expenses,
invoices, procurement, stock, labour, petty cash, subcontractors, documents).

- Everything runs in the visitor's browser (`src/demo/`): no request reaches the API and no account is created.
- Visitors can create and approve things freely; changes stay in their browser until they click **Exit demo**.
- A banner on every page offers **Get your own account** — set `VITE_DEMO_CONTACT_WHATSAPP`,
  `VITE_DEMO_CONTACT_PHONE` or `VITE_DEMO_CONTACT_EMAIL` so it calls / messages you (otherwise it opens `/contact`).
- To change the sample data, edit `src/demo/demo-seed.ts` and bump `DEMO_DB_VERSION` so returning visitors get it.

## 🛠 Technology Stack

- **Frontend Framework**: React 18.x
- **Type System**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod
- **State Management**: React Context + Zustand
- **Database**: IndexedDB (Local Storage)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components
│   └── procurement/   # Procurement-specific components
├── contexts/          # React context providers
├── lib/              # Utility functions and services
├── pages/            # Main application pages
├── types/            # TypeScript type definitions
└── main.tsx          # Application entry point
```

## 🔑 Key Components

### Core Components
- `Layout.tsx`: Main application layout with sidebar and navigation
- `Sidebar.tsx`: Collapsible navigation sidebar
- `Navbar.tsx`: Top navigation bar with user controls
- `RoleGuard.tsx`: Role-based access control component

### Feature Components
- `ProjectDialog.tsx`: Project creation/editing form
- `MaterialRequestForm.tsx`: Material procurement request form
- `PurchaseOrderForm.tsx`: Purchase order management
- `BidSubmissionForm.tsx`: Contractor bid submission system

## 🔒 Authentication & Authorization

The system implements a role-based access control system with the following roles:
- **Admin**: Full system access
- **Client**: Project viewing and approval
- **Contractor**: Project execution and procurement
- **Consultant**: Project oversight and reporting

## 💼 Modules

### 1. Dashboard
- Project overview
- Key performance indicators
- Team activity metrics
- Budget tracking
- Timeline visualization

### 2. Projects
- Project creation and management
- Team assignment
- Progress tracking
- Document management
- Timeline management

### 3. Procurement
- Material requests
- Purchase orders
- Bid submissions
- Supplier management
- Cost tracking

### 4. Tasks
- Task creation and assignment
- Progress tracking
- Priority management
- Deadline monitoring

## 🚦 Getting Started

1. **Installation**
   ```bash
   npm install
   ```

2. **Development**
   ```bash
   npm run dev
   ```

3. **Build**
   ```bash
   npm run build
   ```

## 👥 User Roles & Access

### Admin
- Full system access
- User management
- System configuration
- Financial oversight

### Client
- Project viewing
- Approval workflows
- Contract management
- Report access

### Contractor
- Project execution
- Procurement management
- Task updates
- Resource management

### Consultant
- Project oversight
- Quality assurance
- Technical guidance
- Report generation

## 🔐 Default Login Credentials

```
Admin:
- Email: admin@infrasoko.com
- Password: admin123

Client:
- Email: client@example.com
- Password: client123

Contractor:
- Email: contractor@example.com
- Password: contractor123

Consultant:
- Email: consultant@example.com
- Password: consultant123
```

## 🎨 UI Components

The system uses a custom UI component library built on top of Radix UI primitives:
- Button
- Dialog
- Dropdown
- Form controls
- Avatar
- Toast notifications
- Navigation menus

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile devices

## 🔄 State Management

- React Context for global state
- Zustand for complex state management
- Form state handled by React Hook Form
- Local storage for persistence

## 🛡 Security Features

- Secure authentication flow
- Role-based access control
- Protected routes
- Input validation
- XSS protection
- CSRF protection

## 🔍 Future Enhancements

1. Real-time notifications
2. Document management system
3. Advanced reporting
4. Mobile application
5. Integration with external services
6. Enhanced analytics
7. Automated workflows
8. API integration capabilities
