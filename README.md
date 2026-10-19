# CourierX — Logistics & Courier Management System

[![Live on Vercel](https://img.shields.io/badge/Vercel-Live%20Demo-101216?style=for-the-badge&logo=vercel&logoColor=white)](https://courierx-tau.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.14-38BDF8?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-F2F4F7?style=for-the-badge&logo=flask&logoColor=black)](https://flask.palletsprojects.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-F59E0B?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)

**CourierX** is an enterprise-grade courier and logistics management system built with Flask, MySQL, and a neutral dark-theme SaaS design system. It features complete end-to-end package tracking, fleet dispatching, employee management, billing with pure-Python QR payments, customer reviews, and a full **Role-Based Access Control (RBAC)** architecture supporting 4 distinct user roles with dedicated portals and shared database synchronization.

🌐 **Live Website**: [https://courierx-tau.vercel.app](https://courierx-tau.vercel.app)  
📦 **GitHub Repository**: [https://github.com/abhi-45-dev/CourierX](https://github.com/abhi-45-dev/CourierX)

---

## 🌟 Key Features

### 1. Role-Based Access Control (RBAC) & Multi-User Portals
CourierX supports four dedicated user roles, each with tailored views, scoped permissions, and dedicated authentication:
- **System Administrator**: Full system oversight, fleet & employee management, pending account approvals, user status management (Active, Suspended, Rejected), and review moderation.
- **Customer**: Personal shipments dashboard, parcel booking (with editable prefilled sender details), live timeline tracking, and feedback submission.
- **Courier Partner**: Route assignments, branch fleet linkages, and real-time delivery status updates (`In Transit`, `Out for Delivery`, `Delivered`).
- **Seller / Vendor**: Commercial bulk orders, B2B dispatches across regional hubs, payment reconciliations, and customer satisfaction ratings.

### 2. Operations & Fleet Dispatch
- **Shipment Management**: Assign delivery vehicles and drivers to booked parcels. Track lifecycle from `Pending` → `In Transit` → `Out for Delivery` → `Delivered`.
- **Live Parcel Tracking**: Interactive route cards, checkpoint maps, and chronological status timelines.
- **Branch & Vehicle Directories**: Monitor hub capacity across major Indian cities, vehicle types (Haulers, Vans, Trucks), and maintenance schedules.

### 3. Employee Management
- **Role-Based Operations**: Manage drivers, hub managers, dispatchers, and support staff.
- **Safe Deactivation Check**: Backend validation blocks employee deactivation if they are currently assigned to an active delivery.
- **Search & Filter**: Real-time filtering by status (`Active` / `Inactive`), branch location, and search queries.

### 4. Payments & Billing
- **Full Accounting**: Tracks transaction history, payment status (`Paid`, `Unpaid`, `Refunded`), and payment methods (`UPI`, `Credit Card`, `Debit Card`, `Cash`, `Net Banking`).
- **Revenue Segregation**: Financial metrics strictly aggregate verified `Paid` transactions.
- **Unpaid Parcel Detection**: Enforces 1-to-1 payment-to-parcel mapping with duplicate prevention.

### 5. Zero-Dependency QR Code Payments
- **Pure-Python Vector Engine**: Custom Reed-Solomon polynomial Galois-field byte encoder ([`backend/qr_code.py`](file:///Users/sabhiram/Downloads/dbms%20proj/backend/qr_code.py)) generating scalable inline SVG QR codes with **zero external pip dependencies**.
- **Compliant Reference**: Dynamic demonstration QR encoding invoice payment references, derived DB amounts, and tracking codes.
- **Downloadable SVGs**: One-click download of generated QR code vectors for customer invoices.

### 6. Customer Feedback & Review Moderation
- **Interactive Reviews**: Star rating picker (1 to 5 stars) with comments up to 500 characters.
- **Role Moderation**: Review moderation tools for administrators to approve or reject customer feedback.
- **Quality Metrics**: Real-time calculation of average satisfaction scores and star distribution histograms.

### 7. Modern Neutral Dark Theme UI
- **Curated Palette**: Main background (`#101216`), sidebar (`#0B0D11`), cards (`#171A20`), elevated panels (`#1D2129`), borders (`#2A303A`), and primary text (`#F2F4F7`).
- **1-Click Demo Credentials**: Interactive chips on the login modal allow instant auto-fill for all 20 demo accounts.
- **Micro-Animations**: Smooth 150–250ms transitions, accessibility focus rings, and responsive navigation.

---

## 👥 Demo Accounts (5 Accounts Per Role — Total 20)

All accounts are pre-seeded with realistic relational records (shipments, tracking history, payments, deliveries, and reviews).

> **Universal Demo Password**: `CourierX2026!` *(Default Administrator also accepts `Admin@CourierX2026!`)*

### 1. System Administrator
| Name | Email | Password | Role / Title |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@courierx.com` | `Admin@CourierX2026!` / `CourierX2026!` | Head of Systems |
| **Alexander Wright** | `alex.admin@courierx.com` | `CourierX2026!` | National Operations Director |
| **Sarah Jenkins** | `sarah.admin@courierx.com` | `CourierX2026!` | Logistics Dispatch Lead |
| **Marcus Vance** | `marcus.admin@courierx.com` | `CourierX2026!` | Compliance & Audit Officer |
| **Elena Rostova** | `elena.admin@courierx.com` | `CourierX2026!` | Regional Hub Supervisor |

### 2. Customer
| Name | Email | Password | Location & Sample Data |
| :--- | :--- | :--- | :--- |
| **Priya Sharma** | `priya.customer@courierx.com` | `CourierX2026!` | Mumbai — 3 parcels (Delivered, In Transit, Out for Delivery; UPI paid; 5★ review) |
| **Rahul Mehta** | `rahul.customer@courierx.com` | `CourierX2026!` | Bengaluru — 3 parcels (Electronics delivered, Chair parts in transit, NetBanking) |
| **Ananya Iyer** | `ananya.customer@courierx.com` | `CourierX2026!` | Chennai — 3 parcels (Handloom Sarees delivered, Kitchenware, Jewelry in transit) |
| **David Miller** | `david.customer@courierx.com` | `CourierX2026!` | New Delhi — 3 parcels (Lenses delivered, Blueprints in transit, Hard drives) |
| **Fatima Khan** | `fatima.customer@courierx.com` | `CourierX2026!` | Hyderabad — 3 parcels (Sweets delivered, Textiles out for delivery, Pearls) |

### 3. Courier Partner
| Courier Name | Email | Password | Assigned Hub & Fleet |
| :--- | :--- | :--- | :--- |
| **Rajesh Kumar** | `rajesh.courier@courierx.com` | `CourierX2026!` | Mumbai Central Hub — Express Cargo Van (3 assigned deliveries) |
| **Vikram Singh** | `vikram.courier@courierx.com` | `CourierX2026!` | Delhi Central Hub — Heavy Freight Truck (3 assigned deliveries) |
| **Karthik Nair** | `karthik.courier@courierx.com` | `CourierX2026!` | Bangalore Central Hub — Electric Delivery Van (3 assigned deliveries) |
| **Amit Patel** | `amit.courier@courierx.com` | `CourierX2026!` | Ahmedabad Central Hub — Express Cargo Van (3 assigned deliveries) |
| **Suresh Verma** | `suresh.courier@courierx.com` | `CourierX2026!` | Kolkata Central Hub — Regional Transport Van (3 assigned deliveries) |

### 4. Seller / Vendor
| Business Name | Contact Person | Email | Password | Commercial Consignments |
| :--- | :--- | :--- | :--- | :--- |
| **Apex Electronics Ltd** | Rohan Verma | `apex.vendor@courierx.com` | `CourierX2026!` | 3 bulk orders: Laptops (Delivered), GPUs, IoT Sensors |
| **Urban Vogue Apparel** | Meera Kapoor | `vogue.vendor@courierx.com` | `CourierX2026!` | 3 consignments: Bridal Ensemble (Delivered), Pret Collection, Footwear |
| **HealthCare Plus Pharma**| Dr. Arvind Swamy | `health.vendor@courierx.com` | `CourierX2026!` | 3 shipments: Cold-chain Lab Kits (Delivered), Oncology, Monitors |
| **Gourmet Foods Direct** | Kavita Nambiar | `gourmet.vendor@courierx.com` | `CourierX2026!` | 3 consignments: Saffron & Spices (Delivered), Coffee Beans, Artisanal Cheese |
| **Craft & Home Living** | Deepak Joshi | `craft.vendor@courierx.com` | `CourierX2026!` | 3 consignments: Sheesham Artifacts (Delivered), Blue Pottery, Wall Accents |

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python 3.14 + Flask (50+ modular REST API endpoints)
- **Authentication**: Werkzeug secure password hashing (`generate_password_hash`, `check_password_hash`), server-side HTTP sessions, role authorization decorators (`@login_required`, `@role_required`)
- **Database**: MySQL 8.0 (`courier_management`) with relational foreign keys, composite indexes, and enum constraints
- **Fallback Store**: High-performance SQLite local store (`backend/courier_demo.db`) with automatic serverless `/tmp` synchronization for cloud deployments
- **Frontend**: Vanilla JavaScript (ES6+ async/await modules), Semantic HTML5, Vanilla CSS3 (Custom Design Tokens)
- **Deployment**: Vercel Serverless Function deployment with CDN asset delivery

---

## 🚀 Local Setup & Installation

### Prerequisites
- Python 3.10+ (or 3.14)
- MySQL Server 8.0+

### 1. Clone Repository
```bash
git clone https://github.com/abhi-45-dev/CourierX.git
cd CourierX
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=courier_management
```

### 3. Database Initialization & Seeding
```bash
# Initialize core schema
mysql -u root -p < sql/schema.sql

# Apply RBAC & Authentication migration
mysql -u root -p < sql/migration_auth.sql

# Seed 20 demo accounts with relational shipments & tracking data
mysql -u root -p < sql/seed_demo_accounts.sql
```

### 4. Install Dependencies & Run
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python backend/app.py
```
Visit `http://127.0.0.1:5000` in your browser.

---

## 📂 Project Structure

```text
CourierX/
├── api/
│   └── index.py                # Vercel Serverless entrypoint
├── backend/
│   ├── app.py                  # Flask application & core REST endpoints
│   ├── auth.py                 # RBAC helpers, password hashing & session management
│   ├── auth_routes.py          # Authentication & user administration REST routes
│   ├── db.py                   # MySQL / SQLite fallback connection manager
│   ├── qr_code.py              # Standalone pure-Python Reed-Solomon QR generator
│   ├── seed_demo_accounts.py   # Seeder script for 20 accounts & relational data
│   ├── test_auth_system.py     # Unit test suite for authentication
│   └── test_full_lifecycle.py  # End-to-end multi-user integration tests
├── sql/
│   ├── schema.sql              # Base database schema definition
│   ├── migration_auth.sql      # Multi-user RBAC table & constraints migration
│   └── seed_demo_accounts.sql  # SQL seed records for demo accounts & parcels
├── static/
│   ├── css/
│   │   └── style.css           # Neutral dark SaaS design system
│   └── js/
│       └── app.js              # Client-side controllers, role portals & UI state
├── templates/
│   └── index.html              # Single-page application shell & role modals
├── pyproject.toml              # Vercel deployment dependencies
├── requirements.txt            # Production Python requirements
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation & credentials
```

---

## 📄 License
This project is developed for educational and demonstration purposes.
