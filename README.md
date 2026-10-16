# CourierX — Logistics & Courier Management System

[![Live on Vercel](https://img.shields.io/badge/Vercel-Live%20Demo-101216?style=for-the-badge&logo=vercel&logoColor=white)](https://courierx-tau.vercel.app)
[![Python](https://img.shields.io/badge/Python-3.14-38BDF8?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-F2F4F7?style=for-the-badge&logo=flask&logoColor=black)](https://flask.palletsprojects.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-F59E0B?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)

**CourierX** is a full-stack, enterprise-grade courier and logistics management system built with Flask, MySQL, and a neutral dark theme design system. It provides comprehensive end-to-end tracking, fleet dispatching, employee management, billing with pure-Python QR payments, and customer review collection.

🌐 **Live Website**: [https://courierx-tau.vercel.app](https://courierx-tau.vercel.app)

---

## 🌟 Key Features

### 1. Operations & Fleet Dispatch
- **Shipment Management**: Assign delivery vehicles and drivers to booked parcels. Track lifecycle from `Pending` → `In Transit` → `Out for Delivery` → `Delivered`.
- **Live Parcel Tracking**: Visual route cards and chronological status timelines.
- **Branch & Vehicle Directories**: Monitor hub capacity, fleet status (Active / Inactive), and maintenance schedules.

### 2. Employee Management
- **Role-Based Operations**: Manage drivers, hub managers, dispatchers, and support staff.
- **Safe Deactivation Check**: Backend validation blocks employee deactivation if they are currently assigned to an active delivery.
- **Search & Filter**: Real-time filtering by status (`Active` / `Inactive`), branch location, and search queries.

### 3. Payments & Billing
- **Full Accounting**: Tracks transaction history, payment status (`Paid`, `Unpaid`, `Refunded`), and methods (`UPI`, `Credit Card`, `Debit Card`, `Cash`, `Net Banking`).
- **Revenue Segregation**: Revenue metrics strictly sum verified `Paid` transactions.
- **Unpaid Parcel Detection**: Enforces 1-to-1 payment-to-parcel mapping with duplicate prevention.

### 4. Zero-Dependency QR Code Payments
- **Pure-Python Vector Engine**: Custom Reed-Solomon byte encoder (`backend/qr_code.py`) generating scalable inline SVG QR codes with **zero external pip dependencies**.
- **Demo Reference**: Fully compliant demonstration QR encoding payment reference, derived DB amounts, and tracking codes, labeled with `"Demo QR — No Money Transferred"`.
- **Downloadable SVGs**: One-click download of generated QR code vectors for customer receipts.

### 5. Customer Feedback & Quality Metrics
- **Interactive Reviews**: Star rating picker (1 to 5 stars) with comments up to 500 characters.
- **Rating Analytics**: Real-time calculation of average satisfaction scores and star distribution histograms.
- **Eligibility Checking**: Prevents duplicate reviews per parcel.

### 6. Neutral Dark Theme SaaS Design System
- **Tailored Neutral Palette**: Main background (`#101216`), sidebar (`#0B0D11`), card containers (`#171A20`), elevated panels (`#1D2129`), borders (`#2A303A`), and primary text (`#F2F4F7`).
- **Refined Semantic Badges**: Muted emerald (`#10B981`), amber (`#F59E0B`), crimson (`#EF4444`), and steel blue (`#38BDF8`).
- **Smooth Micro-Interactions**: 150–250ms transitions, active navigation indicators, and accessibility focus rings.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Python 3.14 + Flask (Modular REST API with 46 endpoints)
- **Database**: MySQL 8.0 (`courier_management`) with relational foreign keys, composite indexes, and enum constraints
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

### 3. Database Initialization
```bash
mysql -u root -p < sql/schema.sql
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
│   └── index.py            # Vercel Serverless entrypoint
├── backend/
│   ├── app.py              # Flask application & REST endpoints
│   ├── db.py               # Database connection helper
│   └── qr_code.py          # Standalone pure-Python QR generator
├── sql/
│   └── schema.sql          # MySQL database schema definition
├── static/
│   ├── css/
│   │   └── style.css       # Neutral dark design system
│   └── js/
│       └── app.js          # Client-side controllers & UI state
├── templates/
│   └── index.html          # Single-page dashboard & modal shell
├── pyproject.toml          # Vercel build configuration
├── requirements.txt        # Production dependencies
├── .gitignore              # Ignored secrets & build artifacts
└── README.md               # Documentation & live link
```

---

## 📄 License
This project is developed for educational and demonstration purposes.
