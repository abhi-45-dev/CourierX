"""
COURIERX - Comprehensive Demo Accounts & Realistic Data Seeder
Populates 5 accounts for each of the 4 roles (Total 20 accounts):
  1. Administrator (5 accounts)
  2. Customer (5 accounts)
  3. Courier Partner (5 accounts)
  4. Seller/Vendor (5 accounts)

Populates realistic relational data:
  - Branches & Employees
  - Customers & UserAccounts
  - Parcels & Shipments
  - Tracking Updates
  - Deliveries
  - Payments
  - Feedbacks & Reviews
"""

import os
import sys
import sqlite3
from datetime import datetime, timedelta

# Ensure backend modules can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from auth import (
    ROLE_ADMIN, ROLE_CUSTOMER, ROLE_COURIER, ROLE_VENDOR,
    STATUS_ACTIVE, hash_password
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "courier_demo.db")

PASSWORD_DEFAULT = "CourierX2026!"
PASSWORD_ADMIN_PRIMARY = "Admin@CourierX2026!"


# ==============================================================================
# DATA DEFINITIONS
# ==============================================================================

ADMIN_ACCOUNTS = [
    {
        "name": "System Administrator",
        "email": "admin@courierx.com",
        "phone": "9876543210",
        "password": PASSWORD_ADMIN_PRIMARY,
        "title": "Head of Systems"
    },
    {
        "name": "Alexander Wright",
        "email": "alex.admin@courierx.com",
        "phone": "9876543211",
        "password": PASSWORD_DEFAULT,
        "title": "Director of National Operations"
    },
    {
        "name": "Sarah Jenkins",
        "email": "sarah.admin@courierx.com",
        "phone": "9876543212",
        "password": PASSWORD_DEFAULT,
        "title": "Logistics Dispatch Lead"
    },
    {
        "name": "Marcus Vance",
        "email": "marcus.admin@courierx.com",
        "phone": "9876543213",
        "password": PASSWORD_DEFAULT,
        "title": "Quality & Audit Officer"
    },
    {
        "name": "Elena Rostova",
        "email": "elena.admin@courierx.com",
        "phone": "9876543214",
        "password": PASSWORD_DEFAULT,
        "title": "Regional Hub Supervisor"
    }
]

CUSTOMER_ACCOUNTS = [
    {
        "name": "Priya Sharma",
        "email": "priya.customer@courierx.com",
        "phone": "9820112233",
        "address": "402 Palm Heights, Bandra West, Mumbai, MH 400050",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-PRIYA-101",
                "recipient_name": "Arjun Kapoor",
                "recipient_email": "arjun.kapoor@example.com",
                "recipient_phone": "9811002233",
                "recipient_address": "Flat 12, Defense Colony, New Delhi, DL 110024",
                "origin_city": "Mumbai",
                "dest_city": "New Delhi",
                "weight": 2.4,
                "parcel_type": "Personal Document & Keepsakes",
                "cost": 320.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "UPI",
                "rating": 5,
                "review": "Fast delivery! The parcel reached Delhi ahead of schedule and intact."
            },
            {
                "tracking_number": "CX-PRIYA-102",
                "recipient_name": "Deepa Rao",
                "recipient_email": "deepa.rao@example.com",
                "recipient_phone": "9822334455",
                "recipient_address": "45 Koramangala 4th Block, Bengaluru, KA 560034",
                "origin_city": "Mumbai",
                "dest_city": "Bengaluru",
                "weight": 5.1,
                "parcel_type": "Handmade Gifts & Sweets",
                "cost": 540.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "Credit Card",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-PRIYA-103",
                "recipient_name": "Nitin Gadhavi",
                "recipient_email": "nitin.g@example.com",
                "recipient_phone": "9833445566",
                "recipient_address": "8 Navrangpura, Ahmedabad, GJ 380009",
                "origin_city": "Mumbai",
                "dest_city": "Ahmedabad",
                "weight": 1.2,
                "parcel_type": "Books & Electronics Accessories",
                "cost": 210.00,
                "status": "Out for Delivery",
                "payment_status": "Unpaid",
                "payment_method": "Cash on Delivery",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "Rahul Mehta",
        "email": "rahul.customer@courierx.com",
        "phone": "9833224455",
        "address": "12 Gulmohar Lane, Indiranagar, Bengaluru, KA 560038",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-RAHUL-201",
                "recipient_name": "Siddharth Jain",
                "recipient_email": "sid.jain@example.com",
                "recipient_phone": "9844556677",
                "recipient_address": "Plot 88, Banjara Hills, Hyderabad, TS 500034",
                "origin_city": "Bengaluru",
                "dest_city": "Hyderabad",
                "weight": 3.8,
                "parcel_type": "Mechanical Keyboard & Gadgets",
                "cost": 450.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "NetBanking",
                "rating": 5,
                "review": "Very secure handling for fragile electronics. Highly recommended!"
            },
            {
                "tracking_number": "CX-RAHUL-202",
                "recipient_name": "Kiran Roy",
                "recipient_email": "kiran.roy@example.com",
                "recipient_phone": "9855667788",
                "recipient_address": "14 Salt Lake Sector V, Kolkata, WB 700091",
                "origin_city": "Bengaluru",
                "dest_city": "Kolkata",
                "weight": 8.0,
                "parcel_type": "Ergonomic Office Chair Parts",
                "cost": 890.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "UPI",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-RAHUL-203",
                "recipient_name": "Sumanth Reddy",
                "recipient_email": "sumanth.r@example.com",
                "recipient_phone": "9866778899",
                "recipient_address": "22 Somajiguda, Hyderabad, TS 500082",
                "origin_city": "Bengaluru",
                "dest_city": "Hyderabad",
                "weight": 0.8,
                "parcel_type": "Legal Documents & Contracts",
                "cost": 180.00,
                "status": "Pending",
                "payment_status": "Unpaid",
                "payment_method": "Cash on Delivery",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "Ananya Iyer",
        "email": "ananya.customer@courierx.com",
        "phone": "9844335566",
        "address": "78 Lakeview Enclave, Anna Nagar, Chennai, TN 600040",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-ANANYA-301",
                "recipient_name": "Lakshmi Narayanan",
                "recipient_email": "lakshmi.n@example.com",
                "recipient_phone": "9877889900",
                "recipient_address": "90 Alwarpet High Road, Chennai, TN 600018",
                "origin_city": "Chennai",
                "dest_city": "Chennai",
                "weight": 1.5,
                "parcel_type": "Handloom Sarees & Silk Fabrics",
                "cost": 150.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "UPI",
                "rating": 5,
                "review": "Same day city delivery was smooth and courteous."
            },
            {
                "tracking_number": "CX-ANANYA-302",
                "recipient_name": "Vivek Sengupta",
                "recipient_email": "vivek.sg@example.com",
                "recipient_phone": "9888990011",
                "recipient_address": "33 Park Circus, Kolkata, WB 700017",
                "origin_city": "Chennai",
                "dest_city": "Kolkata",
                "weight": 4.2,
                "parcel_type": "Ceramic Kitchenware Set",
                "cost": 490.00,
                "status": "Out for Delivery",
                "payment_status": "Paid",
                "payment_method": "Debit Card",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-ANANYA-303",
                "recipient_name": "Tanvi Joshi",
                "recipient_email": "tanvi.j@example.com",
                "recipient_phone": "9899001122",
                "recipient_address": "104 Kothrud, Pune, MH 411038",
                "origin_city": "Chennai",
                "dest_city": "Pune",
                "weight": 2.0,
                "parcel_type": "Handcrafted Jewelry Box",
                "cost": 310.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "UPI",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "David Miller",
        "email": "david.customer@courierx.com",
        "phone": "9855446677",
        "address": "204 Park Avenue, Connaught Place, New Delhi, DL 110001",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-DAVID-401",
                "recipient_name": "Robert Dsouza",
                "recipient_email": "robert.d@example.com",
                "recipient_phone": "9812345670",
                "recipient_address": "15 Candolim Beach Road, Panaji, GA 403515",
                "origin_city": "New Delhi",
                "dest_city": "Mumbai",
                "weight": 3.0,
                "parcel_type": "Photography Lenses & Filters",
                "cost": 420.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "Credit Card",
                "rating": 4,
                "review": "Well tracked shipment across transit checkpoints."
            },
            {
                "tracking_number": "CX-DAVID-402",
                "recipient_name": "Sunil Varma",
                "recipient_email": "sunil.v@example.com",
                "recipient_phone": "9823456781",
                "recipient_address": "88 Civil Lines, Jaipur, RJ 302006",
                "origin_city": "New Delhi",
                "dest_city": "Jaipur",
                "weight": 6.5,
                "parcel_type": "Architectural Blueprint Folio",
                "cost": 610.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "NetBanking",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-DAVID-403",
                "recipient_name": "Pooja Malhotra",
                "recipient_email": "pooja.m@example.com",
                "recipient_phone": "9834567892",
                "recipient_address": "7 Gomti Nagar, Lucknow, UP 226010",
                "origin_city": "New Delhi",
                "dest_city": "Lucknow",
                "weight": 1.1,
                "parcel_type": "Client Hard Drives (Encrypted)",
                "cost": 220.00,
                "status": "Pending",
                "payment_status": "Unpaid",
                "payment_method": "Cash on Delivery",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "Fatima Khan",
        "email": "fatima.customer@courierx.com",
        "phone": "9866557788",
        "address": "55 Jubilee Hills, Road No. 36, Hyderabad, TS 500033",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-FATIMA-501",
                "recipient_name": "Zoya Akhtar",
                "recipient_email": "zoya.a@example.com",
                "recipient_phone": "9845678903",
                "recipient_address": "33 Khar West, Mumbai, MH 400052",
                "origin_city": "Hyderabad",
                "dest_city": "Mumbai",
                "weight": 2.2,
                "parcel_type": "Traditional Hyderabadi Sweets",
                "cost": 290.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "UPI",
                "rating": 5,
                "review": "Perishable package arrived fresh on time!"
            },
            {
                "tracking_number": "CX-FATIMA-502",
                "recipient_name": "Tariq Mansoor",
                "recipient_email": "tariq.m@example.com",
                "recipient_phone": "9856789014",
                "recipient_address": "19 Aliganj, Lucknow, UP 226024",
                "origin_city": "Hyderabad",
                "dest_city": "Lucknow",
                "weight": 4.5,
                "parcel_type": "Hand embroidered textiles",
                "cost": 480.00,
                "status": "Out for Delivery",
                "payment_status": "Paid",
                "payment_method": "UPI",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-FATIMA-503",
                "recipient_name": "Rehana Begum",
                "recipient_email": "rehana.b@example.com",
                "recipient_phone": "9867890125",
                "recipient_address": "62 T Nagar, Chennai, TN 600017",
                "origin_city": "Hyderabad",
                "dest_city": "Chennai",
                "weight": 1.7,
                "parcel_type": "Pearls & Silver Accessories",
                "cost": 270.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "NetBanking",
                "rating": None,
                "review": None
            }
        ]
    }
]

COURIER_PARTNERS = [
    {
        "name": "Rajesh Kumar",
        "email": "rajesh.courier@courierx.com",
        "phone": "9877112233",
        "branch_name": "Mumbai Central Hub",
        "password": PASSWORD_DEFAULT,
        "vehicle_type": "Express Cargo Van",
        "deliveries": [
            {
                "tracking_number": "CX-MUM-DELIV-01",
                "sender": "Reliance Retail Dispatches",
                "recipient": "Sunita Patil",
                "dest_address": "88 Dadar West, Mumbai",
                "status": "Delivered",
                "cost": 240.00,
                "weight": 2.1,
                "type": "Electronics"
            },
            {
                "tracking_number": "CX-MUM-DELIV-02",
                "sender": "Croma Online Fulfillment",
                "recipient": "Kunal Deshmukh",
                "dest_address": "14 Worli Seaface, Mumbai",
                "status": "Out for Delivery",
                "cost": 350.00,
                "weight": 3.5,
                "type": "Home Appliance"
            },
            {
                "tracking_number": "CX-MUM-DELIV-03",
                "sender": "Tata Cliq Luxury",
                "recipient": "Ayesha Merchant",
                "dest_address": "9 Altamount Road, Mumbai",
                "status": "In Transit",
                "cost": 420.00,
                "weight": 1.8,
                "type": "Luxury Apparel"
            }
        ]
    },
    {
        "name": "Vikram Singh",
        "email": "vikram.courier@courierx.com",
        "phone": "9877223344",
        "branch_name": "Delhi Central Hub",
        "password": PASSWORD_DEFAULT,
        "vehicle_type": "Heavy Freight Truck",
        "deliveries": [
            {
                "tracking_number": "CX-DEL-DELIV-01",
                "sender": "Amazon Fulfillment Centre Hub",
                "recipient": "Gaurav Chawla",
                "dest_address": "52 Greater Kailash I, New Delhi",
                "status": "Delivered",
                "cost": 310.00,
                "weight": 4.0,
                "type": "Gaming Console"
            },
            {
                "tracking_number": "CX-DEL-DELIV-02",
                "sender": "Flipkart Logistics Hub",
                "recipient": "Meenakshi Sethi",
                "dest_address": "3 Vasant Vihar, New Delhi",
                "status": "In Transit",
                "cost": 290.00,
                "weight": 2.5,
                "type": "Designer Handbag"
            },
            {
                "tracking_number": "CX-DEL-DELIV-03",
                "sender": "Nykaa E-Retail",
                "recipient": "Simran Arora",
                "dest_address": "19 Model Town, New Delhi",
                "status": "Out for Delivery",
                "cost": 190.00,
                "weight": 1.2,
                "type": "Cosmetics Package"
            }
        ]
    },
    {
        "name": "Karthik Nair",
        "email": "karthik.courier@courierx.com",
        "phone": "9877334455",
        "branch_name": "Bangalore Central Hub",
        "password": PASSWORD_DEFAULT,
        "vehicle_type": "Electric Delivery Van",
        "deliveries": [
            {
                "tracking_number": "CX-BLR-DELIV-01",
                "sender": "Infosys Logistics Dispatches",
                "recipient": "Naveen Prakash",
                "dest_address": "77 Electronic City Phase 1, Bengaluru",
                "status": "Delivered",
                "cost": 280.00,
                "weight": 3.0,
                "type": "Workstation Accessories"
            },
            {
                "tracking_number": "CX-BLR-DELIV-02",
                "sender": "Myntra Warehouses",
                "recipient": "Divya Hegde",
                "dest_address": "42 HSR Layout Sector 2, Bengaluru",
                "status": "Delivered",
                "cost": 210.00,
                "weight": 1.7,
                "type": "Apparel"
            },
            {
                "tracking_number": "CX-BLR-DELIV-03",
                "sender": "Cult.fit Equipment",
                "recipient": "Abhishek Rao",
                "dest_address": "10 Sarjapur Main Road, Bengaluru",
                "status": "Out for Delivery",
                "cost": 590.00,
                "weight": 10.5,
                "type": "Fitness Dumbbells & Mats"
            }
        ]
    },
    {
        "name": "Amit Patel",
        "email": "amit.courier@courierx.com",
        "phone": "9877445566",
        "branch_name": "Ahmedabad Central Hub",
        "password": PASSWORD_DEFAULT,
        "vehicle_type": "Express Cargo Van",
        "deliveries": [
            {
                "tracking_number": "CX-AMD-DELIV-01",
                "sender": "Arvind Mills Logistics",
                "recipient": "Bhavin Shah",
                "dest_address": "33 SG Highway, Ahmedabad",
                "status": "Delivered",
                "cost": 340.00,
                "weight": 5.0,
                "type": "Denim Fabric Bundles"
            },
            {
                "tracking_number": "CX-AMD-DELIV-02",
                "sender": "Zydus Pharma Supply",
                "recipient": "Hetal Parikh",
                "dest_address": "12 Vastrapur, Ahmedabad",
                "status": "In Transit",
                "cost": 410.00,
                "weight": 2.0,
                "type": "Medical Diagnostics"
            },
            {
                "tracking_number": "CX-AMD-DELIV-03",
                "sender": "Amul Fed Dispatches",
                "recipient": "Ketan Dave",
                "dest_address": "7 Drive-In Road, Ahmedabad",
                "status": "Out for Delivery",
                "cost": 260.00,
                "weight": 3.2,
                "type": "Dairy Merchandise"
            }
        ]
    },
    {
        "name": "Suresh Verma",
        "email": "suresh.courier@courierx.com",
        "phone": "9877556677",
        "branch_name": "Kolkata Central Hub",
        "password": PASSWORD_DEFAULT,
        "vehicle_type": "Regional Transport Van",
        "deliveries": [
            {
                "tracking_number": "CX-KOL-DELIV-01",
                "sender": "ITC Packaging Division",
                "recipient": "Sourav Mukherjee",
                "dest_address": "84 Ballygunge Circular Rd, Kolkata",
                "status": "Delivered",
                "cost": 310.00,
                "weight": 3.4,
                "type": "Confectionery Packs"
            },
            {
                "tracking_number": "CX-KOL-DELIV-02",
                "sender": "Biswa Bangla Crafts",
                "recipient": "Moumita Sen",
                "dest_address": "15 New Town Action Area 1, Kolkata",
                "status": "Out for Delivery",
                "cost": 270.00,
                "weight": 2.2,
                "type": "Terracotta Handicrafts"
            },
            {
                "tracking_number": "CX-KOL-DELIV-03",
                "sender": "Spencer Retail Express",
                "recipient": "Anirban Ghosh",
                "dest_address": "92 Rashbehari Avenue, Kolkata",
                "status": "In Transit",
                "cost": 220.00,
                "weight": 1.9,
                "type": "Specialty Groceries"
            }
        ]
    }
]

SELLER_VENDORS = [
    {
        "name": "Rohan Verma",
        "business_name": "Apex Electronics Ltd",
        "email": "apex.vendor@courierx.com",
        "phone": "9899112233",
        "address": "Plot 45, Okhla Industrial Area Phase III, New Delhi 110020",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-APEX-001",
                "recipient_name": "TechZone Retail Bengaluru",
                "recipient_email": "orders@techzone.in",
                "recipient_phone": "9810101010",
                "recipient_address": "100ft Road, Indiranagar, Bengaluru, KA 560038",
                "origin_city": "New Delhi",
                "dest_city": "Bengaluru",
                "weight": 15.0,
                "parcel_type": "Commercial Electronics (10x Ultra Laptops)",
                "cost": 2450.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": 5,
                "review": "Exceptional B2B delivery service. Consignment arrived safe and sealed."
            },
            {
                "tracking_number": "CX-APEX-002",
                "recipient_name": "NextGen Computers Pune",
                "recipient_email": "procurement@nextgen.com",
                "recipient_phone": "9820202020",
                "recipient_address": "FC Road, Deccan Gymkhana, Pune, MH 411004",
                "origin_city": "New Delhi",
                "dest_city": "Pune",
                "weight": 8.5,
                "parcel_type": "Gaming Graphics Cards & CPUs",
                "cost": 1620.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-APEX-003",
                "recipient_name": "Matrix Smart Home Systems",
                "recipient_email": "shipping@matrixsmart.in",
                "recipient_phone": "9830303030",
                "recipient_address": "Gachibowli Financial District, Hyderabad, TS 500032",
                "origin_city": "New Delhi",
                "dest_city": "Hyderabad",
                "weight": 12.0,
                "parcel_type": "IoT Smart Hubs & Sensors (50 units)",
                "cost": 1980.00,
                "status": "Out for Delivery",
                "payment_status": "Paid",
                "payment_method": "UPI Business",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "Meera Kapoor",
        "business_name": "Urban Vogue Apparel",
        "email": "vogue.vendor@courierx.com",
        "phone": "9899223344",
        "address": "B-14 Fashion Arcade, Linking Road, Mumbai 400052",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-VOGUE-001",
                "recipient_name": "Kavya Singhania",
                "recipient_email": "kavya.s@example.com",
                "recipient_phone": "9840404040",
                "recipient_address": "Park Street, Kolkata, WB 700016",
                "origin_city": "Mumbai",
                "dest_city": "Kolkata",
                "weight": 3.5,
                "parcel_type": "Designer Bridal Ensemble & Accessories",
                "cost": 650.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "Credit Card",
                "rating": 5,
                "review": "Garments arrived in pristine condition in protective hanger boxes!"
            },
            {
                "tracking_number": "CX-VOGUE-002",
                "recipient_name": "Ritu Boutique Jaipur",
                "recipient_email": "orders@rituboutique.com",
                "recipient_phone": "9850505050",
                "recipient_address": "MI Road, Jaipur, RJ 302001",
                "origin_city": "Mumbai",
                "dest_city": "Jaipur",
                "weight": 7.0,
                "parcel_type": "Autumn Pret Collection (25 Garments)",
                "cost": 1120.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "UPI Business",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-VOGUE-003",
                "recipient_name": "StyleStudio Chennai",
                "recipient_email": "stylestudio@example.com",
                "recipient_phone": "9860606060",
                "recipient_address": "Nungambakkam High Road, Chennai, TN 600034",
                "origin_city": "Mumbai",
                "dest_city": "Chennai",
                "weight": 5.2,
                "parcel_type": "Premium Footwear & Leather Belts",
                "cost": 840.00,
                "status": "Out for Delivery",
                "payment_status": "Paid",
                "payment_method": "Credit Card",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "Dr. Arvind Swamy",
        "business_name": "HealthCare Plus Pharma",
        "email": "health.vendor@courierx.com",
        "phone": "9899334455",
        "address": "10 Biotech Park, Whitefield, Bengaluru 560066",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-HEALTH-001",
                "recipient_name": "Apollo Clinic Dispatches",
                "recipient_email": "pharmacy@apolloclinic.com",
                "recipient_phone": "9870707070",
                "recipient_address": "Basavanagudi, Bengaluru, KA 560004",
                "origin_city": "Bengaluru",
                "dest_city": "Bengaluru",
                "weight": 4.0,
                "parcel_type": "Diagnostic Lab Testing Kits (Cold Chain)",
                "cost": 720.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": 5,
                "review": "Crucial temperature-controlled logistics handled with extreme precision."
            },
            {
                "tracking_number": "CX-HEALTH-002",
                "recipient_name": "Max Healthcare Pharmacy",
                "recipient_email": "stores@maxhealth.in",
                "recipient_phone": "9880808080",
                "recipient_address": "Saket, New Delhi, DL 110017",
                "origin_city": "Bengaluru",
                "dest_city": "New Delhi",
                "weight": 9.2,
                "parcel_type": "Specialty Oncology Medication Dispatches",
                "cost": 1850.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-HEALTH-003",
                "recipient_name": "Care Hospital Pharmacy",
                "recipient_email": "medstores@carehospital.org",
                "recipient_phone": "9890909090",
                "recipient_address": "Nampally, Hyderabad, TS 500001",
                "origin_city": "Bengaluru",
                "dest_city": "Hyderabad",
                "weight": 3.5,
                "parcel_type": "Cardiovascular Monitors & Sensors",
                "cost": 890.00,
                "status": "Out for Delivery",
                "payment_status": "Paid",
                "payment_method": "UPI Business",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "Kavita Nambiar",
        "business_name": "Gourmet Foods Direct",
        "email": "gourmet.vendor@courierx.com",
        "phone": "9899445566",
        "address": "88 Spices Industrial Park, Willingdon Island, Kochi 682003",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-GOURMET-001",
                "recipient_name": "Taj Hotels Culinary Hub",
                "recipient_email": "chef@tajhotels.com",
                "recipient_phone": "9812121212",
                "recipient_address": "Apollo Bunder, Colaba, Mumbai, MH 400001",
                "origin_city": "Bengaluru",
                "dest_city": "Mumbai",
                "weight": 11.0,
                "parcel_type": "Artisanal Spices, Saffron & Vanilla Pods",
                "cost": 1450.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": 5,
                "review": "Aromatic spices arrived in airtight packaging without any flavor degradation."
            },
            {
                "tracking_number": "CX-GOURMET-002",
                "recipient_name": "FoodHall Gourmet Store",
                "recipient_email": "orders@foodhall.in",
                "recipient_phone": "9823232323",
                "recipient_address": "DLF CyberHub, Gurugram, HR 122002",
                "origin_city": "Bengaluru",
                "dest_city": "New Delhi",
                "weight": 18.0,
                "parcel_type": "Estate Coffee Beans & Cocoa Boxes",
                "cost": 2100.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "UPI Business",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-GOURMET-003",
                "recipient_name": "The Leela Palace Kitchens",
                "recipient_email": "kitchen@theleela.com",
                "recipient_phone": "9834343434",
                "recipient_address": "Old Airport Road, Bengaluru, KA 560008",
                "origin_city": "Bengaluru",
                "dest_city": "Bengaluru",
                "weight": 6.5,
                "parcel_type": "Wild Honey Hampers & Artisanal Cheese",
                "cost": 820.00,
                "status": "Out for Delivery",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": None,
                "review": None
            }
        ]
    },
    {
        "name": "Deepak Joshi",
        "business_name": "Craft & Home Living",
        "email": "craft.vendor@courierx.com",
        "phone": "9899556677",
        "address": "23 Handicraft Zone, Mansarovar, Jaipur 302020",
        "password": PASSWORD_DEFAULT,
        "parcels": [
            {
                "tracking_number": "CX-CRAFT-001",
                "recipient_name": "FabIndia Home Store",
                "recipient_email": "merchandise@fabindia.com",
                "recipient_phone": "9845454545",
                "recipient_address": "Khan Market, New Delhi, DL 110003",
                "origin_city": "Jaipur",
                "dest_city": "New Delhi",
                "weight": 14.0,
                "parcel_type": "Handcarved Sheesham Wooden Artifacts",
                "cost": 1780.00,
                "status": "Delivered",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": 5,
                "review": "Heavy wood carvings safely cushioned and delivered without scratch!"
            },
            {
                "tracking_number": "CX-CRAFT-002",
                "recipient_name": "Good Earth Living",
                "recipient_email": "orders@goodearth.in",
                "recipient_phone": "9856565656",
                "recipient_address": "Raghuvanshi Mills, Lower Parel, Mumbai, MH 400013",
                "origin_city": "Jaipur",
                "dest_city": "Mumbai",
                "weight": 8.0,
                "parcel_type": "Handpainted Blue Pottery Dinnerware",
                "cost": 1250.00,
                "status": "In Transit",
                "payment_status": "Paid",
                "payment_method": "UPI Business",
                "rating": None,
                "review": None
            },
            {
                "tracking_number": "CX-CRAFT-003",
                "recipient_name": "Urban Ladder Warehouses",
                "recipient_email": "inbound@urbanladder.com",
                "recipient_phone": "9867676767",
                "recipient_address": "Electronic City, Bengaluru, KA 560100",
                "origin_city": "Jaipur",
                "dest_city": "Bengaluru",
                "weight": 19.5,
                "parcel_type": "Wrought Iron Wall Accents (5 Crates)",
                "cost": 2350.00,
                "status": "Out for Delivery",
                "payment_status": "Paid",
                "payment_method": "Corporate NetBanking",
                "rating": None,
                "review": None
            }
        ]
    }
]


def seed_sqlite():
    print(f"[SQLite] Seeding {SQLITE_DB_PATH}...")
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    # Pre-fetch branch map
    cursor.execute("SELECT city, branch_id FROM Branch")
    branches_by_city = {}
    for city, bid in cursor.fetchall():
        if city not in branches_by_city:
            branches_by_city[city] = bid

    default_bid = list(branches_by_city.values())[0] if branches_by_city else 1
    mumbai_bid = branches_by_city.get("Mumbai", default_bid)
    delhi_bid = branches_by_city.get("New Delhi", default_bid)
    blr_bid = branches_by_city.get("Bengaluru", default_bid)

    # Pre-fetch vehicle map
    cursor.execute("SELECT vehicle_id, branch_id FROM Vehicle")
    vehicles_by_branch = {}
    all_vehicles = []
    for vid, bid in cursor.fetchall():
        all_vehicles.append(vid)
        vehicles_by_branch.setdefault(bid, []).append(vid)
    default_vid = all_vehicles[0] if all_vehicles else 1

    # =========================================================================
    # 1. SEED ADMINISTRATORS (5 accounts)
    # =========================================================================
    print("  -> Seeding 5 Administrator accounts...")
    for admin in ADMIN_ACCOUNTS:
        cursor.execute("SELECT user_id FROM UserAccount WHERE email = ?", (admin["email"],))
        existing = cursor.fetchone()
        hashed = hash_password(admin["password"])
        if existing:
            cursor.execute("""
                UPDATE UserAccount 
                SET name = ?, phone = ?, password_hash = ?, role = ?, status = ?
                WHERE email = ?
            """, (admin["name"], admin["phone"], hashed, ROLE_ADMIN, STATUS_ACTIVE, admin["email"]))
        else:
            cursor.execute("""
                INSERT INTO UserAccount (name, email, phone, password_hash, role, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (admin["name"], admin["email"], admin["phone"], hashed, ROLE_ADMIN, STATUS_ACTIVE))

    # =========================================================================
    # 2. SEED CUSTOMERS (5 accounts) + Realistic Parcels
    # =========================================================================
    print("  -> Seeding 5 Customer accounts and their parcels...")
    for cust in CUSTOMER_ACCOUNTS:
        # Check or insert Customer record
        cursor.execute("SELECT customer_id FROM Customer WHERE email = ?", (cust["email"],))
        row = cursor.fetchone()
        if row:
            customer_id = row[0]
            cursor.execute("""
                UPDATE Customer SET name = ?, phone = ?, address = ? WHERE customer_id = ?
            """, (cust["name"], cust["phone"], cust["address"], customer_id))
        else:
            cursor.execute("""
                INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, ?, ?)
            """, (cust["name"], cust["email"], cust["phone"], cust["address"]))
            customer_id = cursor.lastrowid

        # Check or insert UserAccount
        hashed = hash_password(cust["password"])
        cursor.execute("SELECT user_id FROM UserAccount WHERE email = ?", (cust["email"],))
        u_row = cursor.fetchone()
        if u_row:
            user_id = u_row[0]
            cursor.execute("""
                UPDATE UserAccount 
                SET name = ?, phone = ?, password_hash = ?, role = ?, status = ?, customer_id = ?
                WHERE user_id = ?
            """, (cust["name"], cust["phone"], hashed, ROLE_CUSTOMER, STATUS_ACTIVE, customer_id, user_id))
        else:
            cursor.execute("""
                INSERT INTO UserAccount (name, email, phone, password_hash, role, status, customer_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (cust["name"], cust["email"], cust["phone"], hashed, ROLE_CUSTOMER, STATUS_ACTIVE, customer_id))
            user_id = cursor.lastrowid

        # Insert parcels for this customer
        for pdata in cust["parcels"]:
            # Check or create recipient
            cursor.execute("SELECT customer_id FROM Customer WHERE email = ?", (pdata["recipient_email"],))
            recip_row = cursor.fetchone()
            if recip_row:
                recip_id = recip_row[0]
            else:
                cursor.execute("""
                    INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, ?, ?)
                """, (pdata["recipient_name"], pdata["recipient_email"], pdata["recipient_phone"], pdata["recipient_address"]))
                recip_id = cursor.lastrowid

            orig_bid = branches_by_city.get(pdata["origin_city"], mumbai_bid)
            dest_bid = branches_by_city.get(pdata["dest_city"], delhi_bid)

            # Check or insert Parcel
            cursor.execute("SELECT parcel_id FROM Parcel WHERE tracking_number = ?", (pdata["tracking_number"],))
            p_row = cursor.fetchone()
            if p_row:
                parcel_id = p_row[0]
                cursor.execute("""
                    UPDATE Parcel SET sender_id = ?, receiver_id = ?, origin_branch_id = ?,
                        destination_branch_id = ?, weight = ?, parcel_type = ?, shipping_cost = ?, status = ?
                    WHERE parcel_id = ?
                """, (customer_id, recip_id, orig_bid, dest_bid, pdata["weight"], pdata["parcel_type"], pdata["cost"], pdata["status"], parcel_id))
            else:
                booking_dt = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Parcel (tracking_number, sender_id, receiver_id, origin_branch_id, destination_branch_id, weight, parcel_type, shipping_cost, status, booking_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (pdata["tracking_number"], customer_id, recip_id, orig_bid, dest_bid, pdata["weight"], pdata["parcel_type"], pdata["cost"], pdata["status"], booking_dt))
                parcel_id = cursor.lastrowid

            # Payment
            cursor.execute("SELECT payment_id FROM Payment WHERE parcel_id = ?", (parcel_id,))
            pay_row = cursor.fetchone()
            pay_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S") if pdata["payment_status"] == "Paid" else None
            if pay_row:
                cursor.execute("""
                    UPDATE Payment SET customer_id = ?, amount = ?, payment_method = ?, payment_status = ?, payment_date = ?
                    WHERE parcel_id = ?
                """, (customer_id, pdata["cost"], pdata["payment_method"], pdata["payment_status"], pay_date, parcel_id))
            else:
                cursor.execute("""
                    INSERT INTO Payment (parcel_id, customer_id, amount, payment_method, payment_status, payment_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, customer_id, pdata["cost"], pdata["payment_method"], pdata["payment_status"], pay_date))

            # Tracking updates
            cursor.execute("DELETE FROM Tracking_Update WHERE parcel_id = ?", (parcel_id,))
            t1 = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (parcel_id, orig_bid, 1, "Pending", f"Origin Hub - {pdata['origin_city']}", t1))

            if pdata["status"] in ["In Transit", "Out for Delivery", "Delivered"]:
                t2 = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, dest_bid, 1, "In Transit", f"Transit Sorting Hub - {pdata['dest_city']}", t2))

            if pdata["status"] in ["Out for Delivery", "Delivered"]:
                t3 = (datetime.now() - timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, dest_bid, 1, "Out for Delivery", f"Final Route Delivery Van, {pdata['dest_city']}", t3))

            if pdata["status"] == "Delivered":
                t4 = (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, dest_bid, 1, "Delivered", f"Delivered to Recipient - {pdata['dest_city']}", t4))

                # Delivery record
                cursor.execute("SELECT delivery_id FROM Delivery WHERE parcel_id = ?", (parcel_id,))
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO Delivery (parcel_id, employee_id, delivery_date, delivery_status)
                        VALUES (?, ?, ?, ?)
                    """, (parcel_id, 1, t4, "Delivered"))

            # Feedback
            if pdata.get("rating") is not None:
                cursor.execute("SELECT feedback_id FROM Feedback WHERE parcel_id = ?", (parcel_id,))
                fb_row = cursor.fetchone()
                fb_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                if fb_row:
                    cursor.execute("""
                        UPDATE Feedback SET rating = ?, comments = ?, feedback_date = ?, reviewer_role = 'Customer', reviewer_user_id = ?, moderation_status = 'Approved'
                        WHERE parcel_id = ?
                    """, (pdata["rating"], pdata["review"], fb_dt, user_id, parcel_id))
                else:
                    cursor.execute("""
                        INSERT INTO Feedback (parcel_id, customer_id, rating, comments, feedback_date, reviewer_role, reviewer_user_id, moderation_status)
                        VALUES (?, ?, ?, ?, ?, 'Customer', ?, 'Approved')
                    """, (parcel_id, customer_id, pdata["rating"], pdata["review"], fb_dt, user_id))

    # =========================================================================
    # 3. SEED COURIER PARTNERS (5 accounts) + Assigned Shipments
    # =========================================================================
    print("  -> Seeding 5 Courier Partner accounts and assigned deliveries...")
    for cp in COURIER_PARTNERS:
        # Find branch id for this partner
        cursor.execute("SELECT branch_id FROM Branch WHERE branch_name LIKE ?", (f"%{cp['branch_name']}%",))
        b_match = cursor.fetchone()
        cp_bid = b_match[0] if b_match else mumbai_bid

        # Check or insert Employee record
        cursor.execute("SELECT employee_id FROM Employee WHERE email = ?", (cp["email"],))
        e_row = cursor.fetchone()
        if e_row:
            employee_id = e_row[0]
            cursor.execute("""
                UPDATE Employee SET name = ?, phone = ?, role = 'Courier', branch_id = ?, status = 'Active'
                WHERE employee_id = ?
            """, (cp["name"], cp["phone"], cp_bid, employee_id))
        else:
            cursor.execute("""
                INSERT INTO Employee (name, phone, email, role, branch_id, status)
                VALUES (?, ?, ?, 'Courier', ?, 'Active')
            """, (cp["name"], cp["phone"], cp["email"], cp_bid))
            employee_id = cursor.lastrowid

        # Check or insert UserAccount
        hashed = hash_password(cp["password"])
        cursor.execute("SELECT user_id FROM UserAccount WHERE email = ?", (cp["email"],))
        u_row = cursor.fetchone()
        if u_row:
            cursor.execute("""
                UPDATE UserAccount 
                SET name = ?, phone = ?, password_hash = ?, role = ?, status = ?, employee_id = ?
                WHERE email = ?
            """, (cp["name"], cp["phone"], hashed, ROLE_COURIER, STATUS_ACTIVE, employee_id, cp["email"]))
        else:
            cursor.execute("""
                INSERT INTO UserAccount (name, email, phone, password_hash, role, status, employee_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (cp["name"], cp["email"], cp["phone"], hashed, ROLE_COURIER, STATUS_ACTIVE, employee_id))

        # Assign vehicle
        cp_vids = vehicles_by_branch.get(cp_bid, all_vehicles)
        cp_vid = cp_vids[0] if cp_vids else default_vid

        # Insert assigned parcels for this courier
        for d in cp["deliveries"]:
            # Recipient & Sender
            sender_email = f"sender.{d['tracking_number'].lower()}@hub.com"
            cursor.execute("SELECT customer_id FROM Customer WHERE email = ?", (sender_email,))
            s_row = cursor.fetchone()
            if s_row:
                sender_id = s_row[0]
            else:
                cursor.execute("INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, '9877000000', 'Hub Origin Address')", (d["sender"], sender_email))
                sender_id = cursor.lastrowid

            recip_email = f"recip.{d['tracking_number'].lower()}@client.com"
            cursor.execute("SELECT customer_id FROM Customer WHERE email = ?", (recip_email,))
            r_row = cursor.fetchone()
            if r_row:
                recip_id = r_row[0]
            else:
                cursor.execute("INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, '9877999999', ?)", (d["recipient"], recip_email, d["dest_address"]))
                recip_id = cursor.lastrowid

            cursor.execute("SELECT parcel_id FROM Parcel WHERE tracking_number = ?", (d["tracking_number"],))
            p_row = cursor.fetchone()
            if p_row:
                parcel_id = p_row[0]
                cursor.execute("""
                    UPDATE Parcel SET sender_id = ?, receiver_id = ?, origin_branch_id = ?, destination_branch_id = ?,
                        weight = ?, parcel_type = ?, shipping_cost = ?, status = ?
                    WHERE parcel_id = ?
                """, (sender_id, recip_id, cp_bid, cp_bid, d["weight"], d["type"], d["cost"], d["status"], parcel_id))
            else:
                b_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Parcel (tracking_number, sender_id, receiver_id, origin_branch_id, destination_branch_id, weight, parcel_type, shipping_cost, status, booking_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (d["tracking_number"], sender_id, recip_id, cp_bid, cp_bid, d["weight"], d["type"], d["cost"], d["status"], b_date))
                parcel_id = cursor.lastrowid

            # Insert Shipment assignment
            cursor.execute("SELECT shipment_id FROM Shipment WHERE parcel_id = ?", (parcel_id,))
            s_match = cursor.fetchone()
            if s_match:
                cursor.execute("""
                    UPDATE Shipment SET vehicle_id = ?, employee_id = ? WHERE shipment_id = ?
                """, (cp_vid, employee_id, s_match[0]))
            else:
                s_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Shipment (parcel_id, vehicle_id, employee_id, shipment_date)
                    VALUES (?, ?, ?, ?)
                """, (parcel_id, cp_vid, employee_id, s_date))

            # Tracking update
            cursor.execute("DELETE FROM Tracking_Update WHERE parcel_id = ?", (parcel_id,))
            cursor.execute("""
                INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (parcel_id, cp_bid, employee_id, d["status"], f"Assigned Courier: {cp['name']} ({cp['branch_name']})", datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

            # Delivery record if delivered or out for delivery
            cursor.execute("SELECT delivery_id FROM Delivery WHERE parcel_id = ?", (parcel_id,))
            deliv_row = cursor.fetchone()
            deliv_status = "Delivered" if d["status"] == "Delivered" else "Pending"
            if deliv_row:
                cursor.execute("""
                    UPDATE Delivery SET employee_id = ?, delivery_status = ? WHERE parcel_id = ?
                """, (employee_id, deliv_status, parcel_id))
            else:
                cursor.execute("""
                    INSERT INTO Delivery (parcel_id, employee_id, delivery_date, delivery_status)
                    VALUES (?, ?, ?, ?)
                """, (parcel_id, employee_id, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), deliv_status))

            # Payment
            cursor.execute("SELECT payment_id FROM Payment WHERE parcel_id = ?", (parcel_id,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO Payment (parcel_id, customer_id, amount, payment_method, payment_status, payment_date)
                    VALUES (?, ?, ?, 'Online Prepaid', 'Paid', ?)
                """, (parcel_id, sender_id, d["cost"], datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    # =========================================================================
    # 4. SEED SELLER / VENDORS (5 accounts) + Commercial Consignments
    # =========================================================================
    print("  -> Seeding 5 Seller / Vendor accounts and commercial parcels...")
    for v in SELLER_VENDORS:
        # Check or insert Customer entry for vendor
        cursor.execute("SELECT customer_id FROM Customer WHERE email = ?", (v["email"],))
        c_row = cursor.fetchone()
        if c_row:
            vendor_cust_id = c_row[0]
            cursor.execute("""
                UPDATE Customer SET name = ?, phone = ?, address = ? WHERE customer_id = ?
            """, (v["name"], v["phone"], v["address"], vendor_cust_id))
        else:
            cursor.execute("""
                INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, ?, ?)
            """, (v["name"], v["email"], v["phone"], v["address"]))
            vendor_cust_id = cursor.lastrowid

        # Check or insert UserAccount
        hashed = hash_password(v["password"])
        cursor.execute("SELECT user_id FROM UserAccount WHERE email = ?", (v["email"],))
        u_row = cursor.fetchone()
        if u_row:
            user_id = u_row[0]
            cursor.execute("""
                UPDATE UserAccount 
                SET name = ?, phone = ?, password_hash = ?, role = ?, status = ?, customer_id = ?, business_name = ?
                WHERE user_id = ?
            """, (v["name"], v["phone"], hashed, ROLE_VENDOR, STATUS_ACTIVE, vendor_cust_id, v["business_name"], user_id))
        else:
            cursor.execute("""
                INSERT INTO UserAccount (name, email, phone, password_hash, role, status, customer_id, business_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (v["name"], v["email"], v["phone"], hashed, ROLE_VENDOR, STATUS_ACTIVE, vendor_cust_id, v["business_name"]))
            user_id = cursor.lastrowid

        # Insert commercial shipments for this vendor
        for pdata in v["parcels"]:
            # Recipient
            cursor.execute("SELECT customer_id FROM Customer WHERE email = ?", (pdata["recipient_email"],))
            r_match = cursor.fetchone()
            if r_match:
                recip_id = r_match[0]
            else:
                cursor.execute("""
                    INSERT INTO Customer (name, email, phone, address) VALUES (?, ?, ?, ?)
                """, (pdata["recipient_name"], pdata["recipient_email"], pdata["recipient_phone"], pdata["recipient_address"]))
                recip_id = cursor.lastrowid

            orig_bid = branches_by_city.get(pdata["origin_city"], delhi_bid)
            dest_bid = branches_by_city.get(pdata["dest_city"], blr_bid)

            cursor.execute("SELECT parcel_id FROM Parcel WHERE tracking_number = ?", (pdata["tracking_number"],))
            p_row = cursor.fetchone()
            if p_row:
                parcel_id = p_row[0]
                cursor.execute("""
                    UPDATE Parcel SET sender_id = ?, receiver_id = ?, origin_branch_id = ?,
                        destination_branch_id = ?, weight = ?, parcel_type = ?, shipping_cost = ?, status = ?
                    WHERE parcel_id = ?
                """, (vendor_cust_id, recip_id, orig_bid, dest_bid, pdata["weight"], pdata["parcel_type"], pdata["cost"], pdata["status"], parcel_id))
            else:
                b_date = (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Parcel (tracking_number, sender_id, receiver_id, origin_branch_id, destination_branch_id, weight, parcel_type, shipping_cost, status, booking_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (pdata["tracking_number"], vendor_cust_id, recip_id, orig_bid, dest_bid, pdata["weight"], pdata["parcel_type"], pdata["cost"], pdata["status"], b_date))
                parcel_id = cursor.lastrowid

            # Payment
            cursor.execute("SELECT payment_id FROM Payment WHERE parcel_id = ?", (parcel_id,))
            pay_row = cursor.fetchone()
            pay_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if pay_row:
                cursor.execute("""
                    UPDATE Payment SET customer_id = ?, amount = ?, payment_method = ?, payment_status = ?, payment_date = ?
                    WHERE parcel_id = ?
                """, (vendor_cust_id, pdata["cost"], pdata["payment_method"], pdata["payment_status"], pay_date, parcel_id))
            else:
                cursor.execute("""
                    INSERT INTO Payment (parcel_id, customer_id, amount, payment_method, payment_status, payment_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, vendor_cust_id, pdata["cost"], pdata["payment_method"], pdata["payment_status"], pay_date))

            # Tracking updates
            cursor.execute("DELETE FROM Tracking_Update WHERE parcel_id = ?", (parcel_id,))
            t1 = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (parcel_id, orig_bid, 1, "Pending", f"Dispatched from Vendor Warehouse ({v['business_name']})", t1))

            if pdata["status"] in ["In Transit", "Out for Delivery", "Delivered"]:
                t2 = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, dest_bid, 1, "In Transit", f"Inter-Hub Linehaul Transport to {pdata['dest_city']}", t2))

            if pdata["status"] in ["Out for Delivery", "Delivered"]:
                t3 = (datetime.now() - timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, dest_bid, 1, "Out for Delivery", f"Commercial Delivery Van out in {pdata['dest_city']}", t3))

            if pdata["status"] == "Delivered":
                t4 = (datetime.now() - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute("""
                    INSERT INTO Tracking_Update (parcel_id, branch_id, employee_id, status, location, update_time)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (parcel_id, dest_bid, 1, "Delivered", f"Signed and received at recipient warehouse in {pdata['dest_city']}", t4))

                cursor.execute("SELECT delivery_id FROM Delivery WHERE parcel_id = ?", (parcel_id,))
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO Delivery (parcel_id, employee_id, delivery_date, delivery_status)
                        VALUES (?, ?, ?, 'Delivered')
                    """, (parcel_id, 1, t4))

            # Feedback
            if pdata.get("rating") is not None:
                cursor.execute("SELECT feedback_id FROM Feedback WHERE parcel_id = ?", (parcel_id,))
                fb_row = cursor.fetchone()
                fb_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                if fb_row:
                    cursor.execute("""
                        UPDATE Feedback SET rating = ?, comments = ?, feedback_date = ?, reviewer_role = 'Seller/Vendor', reviewer_user_id = ?, moderation_status = 'Approved'
                        WHERE parcel_id = ?
                    """, (pdata["rating"], pdata["review"], fb_dt, user_id, parcel_id))
                else:
                    cursor.execute("""
                        INSERT INTO Feedback (parcel_id, customer_id, rating, comments, feedback_date, reviewer_role, reviewer_user_id, moderation_status)
                        VALUES (?, ?, ?, ?, ?, 'Seller/Vendor', ?, 'Approved')
                    """, (parcel_id, vendor_cust_id, pdata["rating"], pdata["review"], fb_dt, user_id))

    conn.commit()
    conn.close()
    print("[SQLite] Seeding complete successfully.")


if __name__ == "__main__":
    seed_sqlite()
