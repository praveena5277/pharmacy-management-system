from flask import Flask, render_template, request, jsonify, session
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, date, timedelta

app = Flask(__name__)
app.secret_key = "pharmacy-project-secret-key"

MONGO_URI = "mongodb://localhost:27017/"
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client["pharmacy_db"]
medicines = db["medicines"]
orders = db["orders"]
members = db["members"]
settings = db["settings"]


def build_demo_medicines():
    """Create exactly 50 demo medicines with dashboard counts:
    Total=50, Low Stock=10, Expiring Soon=5, Expired=5.
    Categories are kept separate so the displayed counts are exact.
    """
    today = date.today()
    docs = []

    # 5 expired medicines (quantity > 10, so they do not count as low stock).
    for i in range(1, 6):
        docs.append({
            "name": f"Expired Medicine {i}",
            "batch": f"EXP{i:03d}",
            "expiry": (today - timedelta(days=10 + i)).isoformat(),
            "quantity": 30 + i,
            "price": 20 + i * 5,
        })

    # 5 medicines expiring within the next 30 days (quantity > 10).
    for i in range(1, 6):
        docs.append({
            "name": f"Expiring Soon Medicine {i}",
            "batch": f"SOON{i:03d}",
            "expiry": (today + timedelta(days=5 + i)).isoformat(),
            "quantity": 20 + i,
            "price": 30 + i * 5,
        })

    # 10 low-stock medicines (quantity <= 10), but not expired or expiring soon.
    for i in range(1, 11):
        docs.append({
            "name": f"Low Stock Medicine {i}",
            "batch": f"LOW{i:03d}",
            "expiry": (today + timedelta(days=180 + i)).isoformat(),
            "quantity": i,
            "price": 25 + i * 3,
        })

    # 30 normal medicines.
    normal_names = [
        "Paracetamol 500mg", "Amoxicillin 500mg", "Azithromycin 500mg",
        "Cetirizine 10mg", "Ibuprofen 400mg", "Pantoprazole 40mg",
        "Metformin 500mg", "Omeprazole 20mg", "Vitamin C 500mg", "ORS Sachet",
        "Diclofenac 50mg", "Amlodipine 5mg", "Losartan 50mg", "Atorvastatin 10mg",
        "Levocetirizine 5mg", "Montelukast 10mg", "Doxycycline 100mg", "Cefixime 200mg",
        "Clotrimazole Cream", "Mupirocin Ointment", "Ranitidine 150mg", "Domperidone 10mg",
        "Ondansetron 4mg", "Calcium Tablet", "Iron Tablet", "Zinc Tablet",
        "Cough Syrup", "Antacid Syrup", "Salbutamol Tablet", "Multivitamin Tablet"
    ]
    for i, name in enumerate(normal_names, 1):
        docs.append({
            "name": name,
            "batch": f"NOR{i:03d}",
            "expiry": (today + timedelta(days=240 + i)).isoformat(),
            "quantity": 40 + (i % 6) * 10,
            "price": 20 + (i % 10) * 10,
        })

    return docs


def seed_demo_data():
    # Reset only once for this demo version. This also replaces the previous
    # 10-medicine demo data from older versions of the project.
    marker = settings.find_one({"_id": "dashboard_demo_v2"})
    if not marker:
        medicines.delete_many({})
        medicines.insert_many(build_demo_medicines())
        settings.update_one(
            {"_id": "dashboard_demo_v2"},
            {"$set": {"initialized_at": datetime.now().isoformat()}},
            upsert=True,
        )

    if members.count_documents({}) == 0:
        members.insert_many([
            {"member_id": "MEM001", "name": "Arun Kumar", "phone": "9876543210", "email": "arun@example.com"},
            {"member_id": "MEM002", "name": "Priya S", "phone": "9876501234", "email": "priya@example.com"},
        ])


seed_demo_data()


@app.post("/api/login")
def login():
    data = request.get_json() or {}
    if data.get("username") == "admin" and data.get("password") == "admin123":
        session["logged_in"] = True
        return jsonify({"message": "Login successful"})
    return jsonify({"error": "Invalid username or password"}), 401


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.get("/api/auth")
def auth():
    return jsonify({"logged_in": bool(session.get("logged_in"))})


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/medicines")
def get_medicines():
    docs = list(medicines.find().sort("name", 1))
    for d in docs:
        d["_id"] = str(d["_id"])
    return jsonify(docs)


@app.post("/api/medicines")
def add_medicine():
    if not session.get("logged_in"):
        return jsonify({"error": "Please login first"}), 401
    data = request.get_json(silent=True) or {}
    required = ["name", "batch", "expiry", "quantity", "price"]
    for key in required:
        if str(data.get(key, "")).strip() == "":
            return jsonify({"error": f"{key.title()} is required"}), 400
    try:
        data["name"] = str(data["name"]).strip()
        data["batch"] = str(data["batch"]).strip()
        data["expiry"] = str(data["expiry"]).strip()
        data["quantity"] = int(data["quantity"])
        data["price"] = float(data["price"])
        if data["quantity"] < 0 or data["price"] < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity and price must be valid numbers"}), 400
    result = medicines.insert_one(data)
    return jsonify({"message": f"{data['name']} added successfully", "id": str(result.inserted_id)}), 201


@app.delete("/api/medicines/<id>")
def delete_medicine(id):
    if not session.get("logged_in"):
        return jsonify({"error": "Please login first"}), 401
    medicines.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Medicine deleted"})


@app.get("/api/members")
def get_members():
    docs = list(members.find().sort("name", 1))
    for d in docs:
        d["_id"] = str(d["_id"])
    return jsonify(docs)


@app.post("/api/members")
def add_member():
    if not session.get("logged_in"):
        return jsonify({"error": "Please login first"}), 401
    data = request.get_json(silent=True) or {}
    for key in ["name", "phone"]:
        if not str(data.get(key, "")).strip():
            return jsonify({"error": f"{key.title()} is required"}), 400
    count = members.count_documents({})
    data["member_id"] = f"MEM{count + 1:03d}"
    data["name"] = str(data["name"]).strip()
    data["phone"] = str(data["phone"]).strip()
    data["email"] = str(data.get("email", "")).strip()
    members.insert_one(data)
    return jsonify({"message": f"{data['name']} added successfully"}), 201


@app.post("/api/orders")
def create_order():
    if not session.get("logged_in"):
        return jsonify({"error": "Please login first"}), 401
    data = request.get_json() or {}
    items = data.get("items", [])
    if not items:
        return jsonify({"error": "Cart is empty"}), 400
    total = sum(float(i["price"]) * int(i["quantity"]) for i in items)
    order = {
        "member_id": data.get("member_id", ""),
        "customer": data.get("customer", {}),
        "items": items,
        "total": total,
        "created_at": datetime.now().isoformat(),
    }
    orders.insert_one(order)
    for item in items:
        medicines.update_one(
            {"_id": ObjectId(item["id"])},
            {"$inc": {"quantity": -int(item["quantity"])}},
        )
    return jsonify({"message": "Order placed successfully", "total": total})


if __name__ == "__main__":
    app.run(debug=True)
