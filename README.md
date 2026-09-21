<<<<<<< HEAD
# Pharmacy Management System – Python Flask + MongoDB

## Dashboard demo values
On the first run, this version creates exactly:
- Total Medicines: 50
- Low Stock: 10
- Expiring Soon: 5
- Expired: 5
- Online Sale Members: 2

The 50 demo records replace the old 10-medicine demo data once, using the `dashboard_demo_v2` marker. After that, medicines you add are preserved.

## Login
- Username: `admin`
- Password: `admin123`

## Run on Windows
```bash
cd Pharmacy_Management_System_50_Medicines
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

Open: http://127.0.0.1:5000

Make sure MongoDB is running on `mongodb://localhost:27017/`.

## Features
- Login / Logout
- Dashboard
- 50 demo medicines
- Add unlimited medicines
- Medicine search and delete
- Low stock / expiring soon / expired dashboard counts
- 2 online-sale members
- Add members
- Online sale cart and order placement
- Stock decreases after an order
=======
# pharmacy-management-system
>>>>>>> ee84d93164e7604b2f8edd152e50af87d6b32bee
