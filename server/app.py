# e-POM Tactical Enterprise Node - v2.1.0-MYSQL
import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding

# Load environment variables
load_dotenv()


def _split_full_name(full_name):
    parts = (full_name or '').strip().split(None, 1)
    if not parts:
        return '', ''
    return parts[0], parts[1] if len(parts) > 1 else ''


def _personnel_user_email(username, email=None):
    addr = (email or '').strip().lower()
    return addr if addr else f'{username}@epom.local'


def _map_personnel_role(role):
    if not role or role == 'User':
        return 'Assistant'
    return role


def _create_user_for_personnel(personnel, password_hash):
    from models import User, db

    email = _personnel_user_email(personnel.username, personnel.email)
    if User.query.filter_by(username=personnel.username).first():
        raise ValueError('Username already registered')
    if User.query.filter_by(email=email).first():
        raise ValueError('Email already registered')

    first, last = _split_full_name(personnel.name)
    user = User(
        username=personnel.username,
        email=email,
        first_name=first,
        last_name=last,
        role=_map_personnel_role(personnel.role),
        department=personnel.department or '',
        is_active=(personnel.status or 'Active') == 'Active',
        must_change_password=False,
    )
    user.password_hash = password_hash
    db.session.add(user)
    return user


def _sync_user_for_personnel(personnel, password=None, old_username=None):
    from models import User, db

    lookup = old_username or personnel.username
    user = User.query.filter_by(username=lookup).first() if lookup else None

    if not user:
        if personnel.password_hash:
            return _create_user_for_personnel(personnel, personnel.password_hash)
        if password:
            ph = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            personnel.password_hash = ph
            return _create_user_for_personnel(personnel, ph)
        return None

    email = _personnel_user_email(personnel.username, personnel.email)
    conflict = User.query.filter_by(email=email).first()
    if conflict and conflict.id != user.id:
        raise ValueError('Email already registered')

    first, last = _split_full_name(personnel.name)
    user.username = personnel.username
    user.first_name = first
    user.last_name = last
    user.email = email
    user.role = _map_personnel_role(personnel.role)
    user.department = personnel.department or ''
    user.is_active = (personnel.status or 'Active') == 'Active'

    if password:
        ph = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user.password_hash = ph
        personnel.password_hash = ph

    return user


def create_app(test_config=None):
    app = Flask(__name__, static_folder='../client/dist', static_url_path='/')
    
    # Configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-key-123'),
        JWT_SECRET_KEY=os.environ.get('JWT_SECRET_KEY', 'jwt-dev-key'),
        SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 'sqlite:///instance/epom_dev.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=16 * 1024 * 1024
    )

    if test_config:
        app.config.from_mapping(test_config)

    # Database configuration - Support both Railway and local development
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///instance/epom_dev.db')
    
    # Validate DATABASE_URL format
    if database_url and "host" in database_url and "password" in database_url:
        print("[!] DATABASE_URL contains placeholder values - using SQLite fallback")
        database_url = "sqlite:///instance/epom_dev.db"
    
    print(f"[*] Database URL: {database_url}")
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    
    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": os.environ.get('CORS_ORIGINS', '*')}})
    
    import sys
    sys.path.append(os.path.dirname(__file__))
    # Initialize extensions
    from models import db, User, Event, Document, Action, Personnel
    db.init_app(app)
    jwt = JWTManager(app)

    with app.app_context():
        # Initialize database tables if they don't exist
        try:
            print("[*] Initializing database...")
            
            # Force table creation with explicit metadata
            db.metadata.create_all(db.engine)
            print("[+] Tables created with metadata!")
            
            # Also try create_all as backup
            db.create_all()
            print("[+] Tables created with create_all!")

            # Automatically sync any missing columns from models to the DB tables
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            db_tables = inspector.get_table_names()
            for table_name, table_obj in db.metadata.tables.items():
                if table_name in db_tables:
                    db_cols = [c['name'] for c in inspector.get_columns(table_name)]
                    for col in table_obj.columns:
                        if col.name not in db_cols:
                            alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col.type}"
                            try:
                                with db.engine.begin() as conn:
                                    conn.execute(text(alter_query))
                                print(f"[+] Added column {table_name}.{col.name} ({col.type}) to database schema.")
                            except Exception as schema_err:
                                print(f"[!] Error auto-adding column {table_name}.{col.name}: {schema_err}")
            
            # Create default admin user if not exists
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                print("Creating default admin user...")
                admin_user = User(
                    username='admin',
                    email='admin@epom.local',
                    first_name='System',
                    last_name='Administrator',
                    role='Admin',
                    is_active=True,
                    must_change_password=True
                )
                admin_user.password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                db.session.add(admin_user)
                db.session.commit()
                print("[+] Default admin user created! Username: admin, Password: admin123")
                
                # Verify admin user was created
                verify_user = User.query.filter_by(username='admin').first()
                if verify_user:
                    print(f"[+] Admin user verified: {verify_user.username}")
                else:
                    print("[!] ERROR: Admin user verification failed!")
            else:
                print("[+] Admin user already exists")
                
            # List all tables to confirm creation
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()
            print(f"[+] Database tables verified: {existing_tables}")
            
        except Exception as e:
            print(f"[!] Database initialization error: {str(e)}")
            import traceback
            traceback.print_exc()

    # Debugging: Log the database URL being used
    print(f"Using database: {app.config['SQLALCHEMY_DATABASE_URI']}")

    @app.route('/api/stats', methods=['GET'])
    def overall_stats():
        try:
            from models import User, Action, Event, Document, Personnel
            
            # Action status counts
            pending_actions = Action.query.filter_by(status='Pending').count()
            in_progress_actions = Action.query.filter_by(status='In Progress').count()
            completed_actions = Action.query.filter_by(status='Completed').count()
            
            # Event priority counts
            low_priority = Event.query.filter_by(priority='Low').count()
            medium_priority = Event.query.filter_by(priority='Medium').count()
            high_priority = Event.query.filter_by(priority='High').count()
            critical_priority = Event.query.filter_by(priority='Critical').count()

            return jsonify({
                "personnel": Personnel.query.count(),
                "actions": Action.query.count(),
                "events": Event.query.count(),
                "documents": Document.query.count(),
                "action_stats": {
                    "pending": pending_actions,
                    "in_progress": in_progress_actions,
                    "completed": completed_actions,
                    "overdue": Action.query.filter(Action.status != 'Completed', Action.due_date < datetime.now(timezone.utc)).count()
                },
                "event_stats": {
                    "low": low_priority,
                    "medium": medium_priority,
                    "high": high_priority,
                    "critical": critical_priority
                }
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/health', methods=['GET'])
    def health_check():
        try:
            # Ensure database tables exist
            db.create_all()
            print("[+] Health check: Database tables ensured")
            
            # Check if admin user exists
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                print("Creating admin user from health check...")
                admin_user = User(
                    username='admin',
                    email='admin@epom.local',
                    first_name='System',
                    last_name='Administrator',
                    role='Admin',
                    is_active=True,
                    must_change_password=True
                )
                admin_user.password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                db.session.add(admin_user)
                db.session.commit()
                print("[+] Admin user created from health check")
            
            return jsonify({
                "status": "success", 
                "message": "e-POM Backend is running!",
                "api_version": "v2.2.0-MOBILE-READY",
                "environment": "Operational",
                "database": "connected"
            })
        except Exception as e:
            print(f"[!] Health check error: {str(e)}")
            return jsonify({
                "status": "error", 
                "message": f"Database setup failed: {str(e)}",
                "api_version": "v2.2.0-MOBILE-READY",
                "environment": "Error"
            }), 500

    @app.route('/api/test-db', methods=['GET'])
    def test_database_connection():
        try:
            print("Testing database connection...")
            
            # Test basic database connection
            result = db.engine.execute("SELECT 1")
            print("Database connection successful!")
            
            # Check if tables exist
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()
            print(f"Existing tables: {existing_tables}")
            
            # Check database URL
            print(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
            
            return jsonify({
                "status": "success",
                "message": "Database connection working",
                "database_url": app.config['SQLALCHEMY_DATABASE_URI'],
                "existing_tables": existing_tables,
                "connection_test": "PASSED"
            })
        except Exception as e:
            print(f"Database connection test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "status": "error",
                "message": f"Database connection failed: {str(e)}",
                "database_url": app.config.get('SQLALCHEMY_DATABASE_URI', 'NOT_SET'),
                "connection_test": "FAILED"
            }), 500

    @app.route('/api/create-admin', methods=['POST'])
    def create_admin_user():
        """Dedicated endpoint to force create admin user"""
        try:
            print("[*] Force creating admin user...")
            
            # Import User model
            from models import User
            
            # Check if admin user already exists and delete if it does
            existing_admin = User.query.filter_by(username='admin').first()
            if existing_admin:
                print("[*] Deleting existing admin user...")
                db.session.delete(existing_admin)
                db.session.commit()
                print("[+] Existing admin user deleted")
            
            # Create new admin user
            admin_user = User(
                username='admin',
                email='admin@epom.local',
                first_name='System',
                last_name='Administrator',
                role='Admin',
                is_active=True,
                must_change_password=True
            )
            admin_user.password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            db.session.add(admin_user)
            db.session.commit()
            print("[+] Admin user created successfully!")
            
            # Verify admin user was created
            verify_user = User.query.filter_by(username='admin').first()
            if verify_user:
                print(f"[+] Admin user verified: {verify_user.username}")
                return jsonify({
                    "status": "success",
                    "message": "Admin user created successfully!",
                    "admin_user": {
                        "username": "admin",
                        "password": "admin123"
                    }
                })
            else:
                print("[!] ERROR: Admin user verification failed!")
                return jsonify({
                    "status": "error",
                    "message": "Admin user creation verification failed"
                }), 500
                
        except Exception as e:
            print(f"[!] Admin creation error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "status": "error",
                "message": f"Admin user creation failed: {str(e)}"
            }), 500

    @app.route('/api/setup-database', methods=['POST'])
    def setup_database():
        try:
            print("[*] Manual database setup initiated...")
            
            # Use current database configuration (Railway PostgreSQL or fallback)
            print(f"[*] Using database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
            
            # Import all models to ensure they're registered
            from models import User, Event, Document, Action, Project, Notification, Resource, AttendanceRecord, DocumentAudit
            
            print("[+] Models imported successfully!")
            
            # Force table creation with explicit metadata
            print("[*] Creating tables with explicit metadata...")
            db.metadata.create_all(db.engine)
            print("[+] Tables created with metadata!")
            
            # Also try create_all as backup
            print("[*] Creating tables with create_all...")
            db.create_all()
            print("[+] Tables created with create_all!")
            
            # Create admin user
            print("[*] Checking for admin user...")
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                print("[*] Creating admin user...")
                admin_user = User(
                    username='admin',
                    email='admin@epom.local',
                    first_name='System',
                    last_name='Administrator',
                    role='Admin',
                    is_active=True,
                    must_change_password=True
                )
                admin_user.password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                db.session.add(admin_user)
                db.session.commit()
                print("[+] Admin user created!")
                
                # Verify admin user was created
                verify_user = User.query.filter_by(username='admin').first()
                if verify_user:
                    print(f"[+] Admin user verified: {verify_user.username}")
                else:
                    print("[!] ERROR: Admin user verification failed!")
                
                return jsonify({
                    "status": "success",
                    "message": "Database setup completed!",
                    "admin_user": {
                        "username": "admin",
                        "password": "admin123"
                    },
                    "tables_created": [table.name for table in db.metadata.tables.keys()],
                    "database_url": app.config['SQLALCHEMY_DATABASE_URI']
                })
            else:
                print("[+] Admin user already exists")
                return jsonify({
                    "status": "success",
                    "message": "Database already initialized",
                    "tables": [table.name for table in db.metadata.tables.keys()],
                    "database_url": app.config['SQLALCHEMY_DATABASE_URI']
                })
        except Exception as e:
            print(f"[!] Database setup error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                "status": "error",
                "message": f"Database setup failed: {str(e)}",
                "database_url": app.config['SQLALCHEMY_DATABASE_URI']
            }), 500

    # --- TACTICAL THIRD-PARTY INTEGRATION (EMAIL) ---
    class TacticalMailer:
        @staticmethod
        def send(subject, recipient, body, priority="Normal"):
            # Simulation of SMTP dispatch for mobile/web stakeholders
            # In production: from flask_mail import Message, mail; mail.send(Message(...))
            log_time = datetime.now(timezone.utc).strftime('%H:%M:%S')
            print(f"\n[TACTICAL DISPATCH] {log_time} | Priority: {priority}")
            print(f"TO: {recipient}")
            print(f"SUBJECT: {subject}")
            print(f"CONTENT: {body}\n")
            return True

    # AES 256 Encryption Helpers
    def get_encryption_key():
        key = os.getenv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef") # 32 bytes for AES 256
        return key.encode('utf-8')[:32]

    def encrypt_data(data: bytes):
        key = get_encryption_key()
        iv = os.urandom(16)
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(data) + padder.finalize()
        
        encrypted_content = encryptor.update(padded_data) + encryptor.finalize()
        return encrypted_content, base64.b64encode(iv).decode('utf-8')

    def decrypt_data(encrypted_content: bytes, iv_b64: str):
        key = get_encryption_key()
        iv = base64.b64decode(iv_b64)
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        decrypted_padded_data = decryptor.update(encrypted_content) + decryptor.finalize()
        
        unpadder = padding.PKCS7(128).unpadder()
        data = unpadder.update(decrypted_padded_data) + unpadder.finalize()
        return data

    # --- MIDDLEWARES/HELPERS ---
    def role_required(required_role):
        def decorator(fn):
            def wrapper(*args, **kwargs):
                current_user_id = get_jwt_identity()
                # JWT identity was stored as a string, but the ID in the DB is an integer
                user = db.session.get(User, int(current_user_id))
                # Administrators have master access to all role-protected features
                if not user or (user.role != required_role and user.role != 'Admin'):
                    return jsonify({"error": "Unauthorized role-based access"}), 403
                return fn(*args, **kwargs)
            wrapper.__name__ = fn.__name__
            return wrapper
        return decorator

    # --- AUTH ROUTES ---
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = request.json
        print("Registration Request Data:", data)
        if not data or not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({"error": "Missing required fields"}), 400
        
        if User.query.filter_by(username=data['username']).first() or User.query.filter_by(email=data['email']).first():
            return jsonify({"error": "User already exists"}), 400
            
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Check if this is the first user; if so, make them an Admin
        is_first_user = User.query.first() is None
        role = 'Admin' if is_first_user else data.get('role', 'Staff')

        new_user = User(
            username=data['username'],
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email=data['email'].lower(),
            password_hash=hashed_password,
            role=role,
            department=data.get('department')
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({"message": "User registered successfully"}), 201

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        try:
            # Ensure database tables exist
            try:
                db.create_all()
                print("[+] Database tables ensured to exist")
            except Exception as db_error:
                print(f"[!] Database table creation error: {db_error}")
            
            # Create admin user if not exists
            try:
                admin_user = User.query.filter_by(username='admin').first()
                if not admin_user:
                    print("Creating default admin user...")
                    admin_user = User(
                        username='admin',
                        email='admin@epom.local',
                        first_name='System',
                        last_name='Administrator',
                        role='Admin',
                        is_active=True,
                        must_change_password=True
                    )
                    admin_user.password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    db.session.add(admin_user)
                    db.session.commit()
                    print("[+] Default admin user created!")
            except Exception as admin_error:
                print(f"[!] Admin user creation error: {admin_error}")
            
            data = request.json or {}
            username = (data.get('username') or '').strip().lower()
            password = data.get('password', '')

            user = User.query.filter_by(username=username).first()

            if not user:
                from models import Personnel
                p = Personnel.query.filter_by(username=username).first()
                if (
                    p
                    and p.password_hash
                    and (p.status or 'Active') == 'Active'
                    and bcrypt.checkpw(password.encode('utf-8'), p.password_hash.encode('utf-8'))
                ):
                    try:
                        user = _create_user_for_personnel(p, p.password_hash)
                        db.session.commit()
                    except ValueError:
                        return jsonify({"error": "Invalid credentials"}), 401

            if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                return jsonify({"error": "Invalid credentials"}), 401

            if not user.is_active:
                return jsonify({"error": "This account has been deactivated. Contact Admin."}), 403

            if user.mfa_enabled:
                # Generate a temporary OTP for this demo (in real app, send via email/SMS)
                user.mfa_code = "123456" # Hardcoded for demo, normally os.urandom
                db.session.commit()
                return jsonify({
                    "mfa_required": True,
                    "user_id": user.id,
                    "message": "MFA Challenge: Enter the 6-digit code sent to your tactical device (Demo: 123456)"
                }), 200

            access_token = create_access_token(identity=str(user.id))
            return jsonify({
                "token": access_token, 
                "user": {
                    "id": user.id, 
                    "username": user.username, 
                    "role": user.role, 
                    "email": user.email, 
                    "first_name": user.first_name, 
                    "last_name": user.last_name,
                    "department": user.department,
                    "is_active": user.is_active,
                    "must_change_password": user.must_change_password
                }
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def get_current_user():
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "department": user.department,
            "is_active": user.is_active,
            "must_change_password": user.must_change_password,
        }), 200

    @app.route('/api/auth/mfa/verify', methods=['POST'])
    def mfa_verify():
        from models import User, db
        data = request.json
        user_id = data.get('user_id')
        code = data.get('code')
        
        user = db.session.get(User, int(user_id))
        if not user or user.mfa_code != code:
            return jsonify({"error": "Invalid MFA code"}), 401
            
        # Clear code after use
        user.mfa_code = None
        db.session.commit()
        
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "token": access_token, 
            "user": {
                "id": user.id, 
                "username": user.username, 
                "role": user.role, 
                "email": user.email, 
                "first_name": user.first_name, 
                "last_name": user.last_name,
                "department": user.department,
                "is_active": user.is_active,
                "must_change_password": user.must_change_password
            }
        }), 200


    @app.route('/api/users', methods=['GET', 'POST'])
    @jwt_required()
    @role_required('Admin')
    def handle_users():
        if request.method == 'GET':
            # Accessible to all users so they can see colleagues for task assignments
            users = User.query.all()
            return jsonify([{"id": u.id, "username": u.username, "first_name": u.first_name, "last_name": u.last_name, "role": u.role, "email": u.email, "is_active": u.is_active, "department": u.department} for u in users]), 200
        
        elif request.method == 'POST':
            # Admin can create new users
            data = request.json
            if not data or not all(k in data for k in ['username', 'email', 'first_name', 'last_name', 'role', 'password']):
                return jsonify({"error": "Missing required fields"}), 400
            
            # Check if username already exists
            existing_user = User.query.filter_by(username=data['username']).first()
            if existing_user:
                return jsonify({"error": "Username already exists"}), 400
            
            # Check if email already exists
            existing_email = User.query.filter_by(email=data['email'].lower()).first()
            if existing_email:
                return jsonify({"error": "Email already exists"}), 400
            
            # Create new user
            new_user = User(
                username=data['username'],
                email=data['email'].lower(),
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=data['role'],
                department=data.get('department', ''),
                is_active=True,
                must_change_password=False
            )
            new_user.password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            db.session.add(new_user)
            db.session.commit()
            
            return jsonify({
                "message": "User created successfully",
                "user": {
                    "id": new_user.id,
                    "username": new_user.username,
                    "first_name": new_user.first_name,
                    "last_name": new_user.last_name,
                    "role": new_user.role,
                    "email": new_user.email,
                    "is_active": new_user.is_active,
                    "department": new_user.department
                }
            }), 201

    @app.route('/api/users/<int:user_id>/status', methods=['PUT'])
    @jwt_required()
    @role_required('Admin')
    def update_user_status(user_id):
        # Admin can disable/enable users
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        data = request.json
        if 'is_active' in data:
            user.is_active = data['is_active']
        db.session.commit()
        return jsonify({"message": f"User {'enabled' if user.is_active else 'disabled'} successfully"}), 200

    @app.route('/api/users/<int:user_id>', methods=['PUT'])
    @jwt_required()
    def update_user(user_id):
        # Admin can update user details, or user can update their own details
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        
        if current_user.role != 'Admin' and current_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        data = request.json
        
        if 'username' in data:
            # Check if username is already taken by another user
            existing = User.query.filter_by(username=data['username']).first()
            if existing and existing.id != user_id:
                return jsonify({"error": "Username already exists"}), 400
            user.username = data['username']
            
        if 'email' in data:
            # Check if email is already taken by another user
            email_lower = data['email'].lower()
            existing = User.query.filter_by(email=email_lower).first()
            if existing and existing.id != user_id:
                return jsonify({"error": "Email already exists"}), 400
            user.email = email_lower
            
        if 'first_name' in data:
            user.first_name = data['first_name']
            
        if 'last_name' in data:
            user.last_name = data['last_name']
            
        if 'department' in data:
            user.department = data['department']
            
        if 'role' in data and current_user.role == 'Admin':
            user.role = data['role']
            
        if 'password' in data and data['password']:
            user.password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            # If user updates their own password, clear the flag. 
            # If admin updates another user's password, set the flag.
            if current_user_id == user_id:
                user.must_change_password = False
            else:
                user.must_change_password = True
            
        db.session.commit()
        return jsonify({"message": "User updated successfully"}), 200

    @app.route('/api/personnel', methods=['GET'])
    @jwt_required()
    def get_personnel():
        """Get all personnel"""
        from models import Personnel
        personnel = Personnel.query.order_by(Personnel.created_at.desc()).all()
        return jsonify([p.to_dict() for p in personnel]), 200

    @app.route('/api/personnel', methods=['POST'])
    @jwt_required()
    def create_personnel():
        """Create new personnel"""
        from models import Personnel
        data = request.json or {}
        if not data.get('name'):
            return jsonify({"error": "Name is required"}), 400
        username = (data.get('username') or '').strip().lower()
        if not username:
            return jsonify({"error": "Username is required"}), 400
        if len(username) < 3:
            return jsonify({"error": "Username must be at least 3 characters"}), 400
        from models import User

        if Personnel.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 400

        email = _personnel_user_email(username, data.get('email'))
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already exists"}), 400

        password = data.get('password', '')
        if not password:
            return jsonify({"error": "Password is required"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        p = Personnel(
            name=data.get('name'),
            username=username,
            email=data.get('email'),
            phone=data.get('phone'),
            department=data.get('department'),
            role=data.get('role', 'User'),
            status=data.get('status', 'Active'),
        )
        p.password_hash = password_hash
        db.session.add(p)

        try:
            _create_user_for_personnel(p, password_hash)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

        return jsonify(p.to_dict()), 201

    @app.route('/api/personnel/<int:person_id>', methods=['PUT'])
    @jwt_required()
    def update_personnel(person_id):
        """Update personnel"""
        from models import Personnel
        from models import User

        p = Personnel.query.get_or_404(person_id)
        data = request.json or {}
        old_username = p.username

        if 'name' in data:
            p.name = data.get('name')
        if 'username' in data:
            username = (data.get('username') or '').strip().lower()
            if not username:
                return jsonify({"error": "Username is required"}), 400
            if len(username) < 3:
                return jsonify({"error": "Username must be at least 3 characters"}), 400
            existing = Personnel.query.filter_by(username=username).first()
            if existing and existing.id != p.id:
                return jsonify({"error": "Username already exists"}), 400
            other_user = User.query.filter_by(username=username).first()
            if other_user and (not old_username or other_user.username != old_username):
                return jsonify({"error": "Username already exists"}), 400
            p.username = username
        if 'email' in data:
            p.email = data.get('email')
        if 'phone' in data:
            p.phone = data.get('phone')
        if 'department' in data:
            p.department = data.get('department')
        if 'role' in data:
            p.role = data.get('role')
        if 'status' in data:
            p.status = data.get('status')
        new_password = data.get('password') or None
        if new_password and len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        try:
            _sync_user_for_personnel(p, password=new_password, old_username=old_username)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

        return jsonify(p.to_dict()), 200

    @app.route('/api/personnel/<int:person_id>', methods=['DELETE'])
    @jwt_required()
    def delete_personnel(person_id):
        """Delete personnel"""
        from models import Personnel, User
        p = Personnel.query.get_or_404(person_id)
        if p.username:
            linked = User.query.filter_by(username=p.username).first()
            if linked and linked.username != 'admin':
                db.session.delete(linked)
        db.session.delete(p)
        db.session.commit()
        return jsonify({"status": "deleted"}), 200

    @app.route('/api/users/<int:user_id>', methods=['DELETE'])
    @jwt_required()
    @role_required('Admin')
    def delete_user(user_id):
        from models import Notification, DocumentAudit, Event, Action, Document
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        if user.role == 'Admin':
            return jsonify({"error": "Cannot delete root administrator"}), 400
        try:
            # 1. Delete notifications for this user
            Notification.query.filter_by(user_id=user_id).delete()
            # 2. Delete document audit logs for this user
            DocumentAudit.query.filter_by(user_id=user_id).delete()
            # 3. Delete calendar events created by this user
            Event.query.filter_by(user_id=user_id).delete()
            # 4. Nullify or reassign actions assigned to this user
            # Re-assign to admin (user_id=1) rather than delete operational history
            admin = User.query.filter(User.role == 'Admin', User.id != user_id).first()
            fallback_id = admin.id if admin else None
            if fallback_id:
                Action.query.filter_by(assigned_to=user_id).update({"assigned_to": fallback_id})
            else:
                Action.query.filter_by(assigned_to=user_id).delete()
            # 5. Update documents uploaded by this user
            if fallback_id:
                Document.query.filter_by(uploaded_by=user_id).update({"uploaded_by": fallback_id})
            else:
                Document.query.filter_by(uploaded_by=user_id).delete()
            db.session.flush()
            # 6. Finally delete the user
            db.session.delete(user)
            db.session.commit()
            return jsonify({"message": "User permanently removed"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"DELETE user error: {e}")
            return jsonify({"error": f"Failed to delete user: {str(e)}"}), 500

    # --- ATTENDANCE ROUTES ---
    @app.route('/api/attendance/clock', methods=['POST'])
    @jwt_required()
    def clock_attendance():
        from models import AttendanceRecord, db
        current_user_id = int(get_jwt_identity())
        data = request.json
        action = data.get('action') # 'in' or 'out'
        
        now = datetime.now(timezone.utc)
        today_str = now.strftime('%Y-%m-%d')
        
        if action == 'in':
            # Check if already clocked in today
            existing = AttendanceRecord.query.filter_by(user_id=current_user_id, date=today_str).first()
            if existing:
                return jsonify({"error": "Already clocked in today"}), 400
            
            record = AttendanceRecord(
                user_id=current_user_id,
                clock_in_time=now,
                date=today_str,
                status='Present'
            )
            db.session.add(record)
        elif action == 'out':
            record = AttendanceRecord.query.filter_by(user_id=current_user_id, date=today_str).first()
            if not record:
                return jsonify({"error": "No clock-in record found for today"}), 400
            record.clock_out_time = now
        else:
            return jsonify({"error": "Invalid action"}), 400
            
        db.session.commit()
        return jsonify({"message": f"Successfully clocked {action}"}), 200

    @app.route('/api/attendance', methods=['GET'])
    @jwt_required()
    @role_required('Admin')
    def get_attendance():
        from models import AttendanceRecord
        records = AttendanceRecord.query.order_by(AttendanceRecord.clock_in_time.desc()).all()
        return jsonify([{
            "id": r.id, "user_id": r.user_id, "clock_in_time": r.clock_in_time.isoformat(),
            "clock_out_time": r.clock_out_time.isoformat() if r.clock_out_time else None,
            "date": r.date, "status": r.status
        } for r in records]), 200

    # --- PROJECT MANAGEMENT ROUTES ---
    @app.route('/api/projects', methods=['GET'])
    @jwt_required()
    def get_projects():
        from models import Project
        projects = Project.query.order_by(Project.created_at.desc()).all()
        return jsonify([{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "created_by": p.created_by
        } for p in projects]), 200

    @app.route('/api/projects', methods=['POST'])
    @jwt_required()
    def create_project():
        from models import Project
        current_user_id = int(get_jwt_identity())
        data = request.json
        if not data or 'name' not in data:
            return jsonify({"error": "Project name is required"}), 400
        
        new_project = Project(
            name=data['name'],
            description=data.get('description', ''),
            status=data.get('status', 'Active'),
            created_by=current_user_id
        )
        db.session.add(new_project)
        db.session.commit()
        return jsonify({"message": "Project created", "id": new_project.id}), 201

    @app.route('/api/projects/<int:project_id>', methods=['PUT'])
    @jwt_required()
    def update_project(project_id):
        from models import Project
        project = db.session.get(Project, project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        data = request.json
        if 'name' in data:
            project.name = data['name']
        if 'description' in data:
            project.description = data['description']
        if 'status' in data:
            project.status = data['status']
        
        db.session.commit()
        return jsonify({"message": "Project updated"}), 200

    @app.route('/api/projects/<int:project_id>', methods=['DELETE'])
    @jwt_required()
    @role_required('Admin')
    def delete_project(project_id):
        from models import Project, Action
        project = db.session.get(Project, project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Dissociate actions
        Action.query.filter_by(project_id=project_id).update({"project_id": None})
        db.session.delete(project)
        db.session.commit()
        return jsonify({"message": "Project deleted"}), 200


    # --- RESOURCE ROUTES ---
    @app.route('/api/resources', methods=['GET'])
    @jwt_required()
    def get_resources():
        from models import Resource
        resources = Resource.query.all()
        return jsonify([{
            "id": r.id, "name": r.name, "type": r.type, 
            "capacity": r.capacity, "is_available": r.is_available
        } for r in resources]), 200

    @app.route('/api/resources', methods=['POST'])
    @jwt_required()
    @role_required('Admin')
    def create_resource():
        from models import Resource
        data = request.json
        new_resource = Resource(
            name=data['name'],
            type=data.get('type', 'Room'),
            capacity=data.get('capacity')
        )
        db.session.add(new_resource)
        db.session.commit()
        return jsonify({"message": "Resource added", "id": new_resource.id}), 201


    @app.route('/api/calendar', methods=['GET'])
    @jwt_required()
    def get_events():
        events = Event.query.all()
        return jsonify([{
            "id": e.id, "title": e.title, "description": e.description,
            "start_time": e.start_time.isoformat(), "end_time": e.end_time.isoformat(),
            "priority": e.priority,
            "type": e.type or 'meeting',
            "recurrence": e.recurrence or 'none',
            "mandatory_attendees": e.mandatory_attendees,
            "optional_attendees": e.optional_attendees,
            "location": e.location,
            "meeting_link": e.meeting_link,
            "resource_id": e.resource_id,
            "is_protected": e.is_protected,
            "is_strategic": e.is_strategic
        } for e in events]), 200

    @app.route('/api/calendar', methods=['POST'])
    @jwt_required()
    def create_event():
        data = request.json
        current_user_id = get_jwt_identity()
        try:
            start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
            
            # SMART SCHEDULING: Check for conflicts
            # If resource_id is provided, check for conflicts on that resource
            resource_id = data.get('resource_id')
            if resource_id and resource_id != "":
                resource_id = int(resource_id)
                resource_conflict = Event.query.filter(
                    (Event.resource_id == resource_id) &
                    (Event.start_time < end_time) & (Event.end_time > start_time)
                ).first()
                if resource_conflict:
                    return jsonify({"error": f"Resource Conflict: This room/resource is already booked for '{resource_conflict.title}'"}), 400
            else:
                resource_id = None

            import json
            new_event = Event(
                title=data['title'],
                description=data.get('description', ''),
                start_time=start_time,
                end_time=end_time,
                priority=data.get('priority', 'Medium'),
                type=data.get('type', 'meeting'),
                recurrence=data.get('recurrence', 'none'),
                user_id=int(current_user_id),
                mandatory_attendees=json.dumps(data.get('mandatory_attendees', [])),
                optional_attendees=json.dumps(data.get('optional_attendees', [])),
                resource_id=resource_id,
                location=data.get('location', ''),
                meeting_link=data.get('meeting_link', ''),
                is_protected=data.get('is_protected', False),
                is_strategic=data.get('is_strategic', False)
            )
            db.session.add(new_event)
            db.session.commit()
            return jsonify({"message": "Event created"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route('/api/calendar/<int:event_id>', methods=['PUT'])
    @jwt_required()
    def update_event(event_id):
        event = Event.query.get_or_404(event_id)
        data = request.json
        try:
            import json as _json
            if 'title' in data:
                event.title = data['title']
            if 'description' in data:
                event.description = data['description']
            if 'start_time' in data:
                event.start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
            if 'end_time' in data:
                event.end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
            if 'priority' in data:
                event.priority = data['priority']
            if 'type' in data:
                event.type = data['type']
            if 'recurrence' in data:
                event.recurrence = data['recurrence']
            if 'location' in data:
                event.location = data['location']
            if 'meeting_link' in data:
                event.meeting_link = data['meeting_link']
            if 'mandatory_attendees' in data:
                event.mandatory_attendees = _json.dumps(data['mandatory_attendees'])
            if 'optional_attendees' in data:
                event.optional_attendees = _json.dumps(data['optional_attendees'])
            if 'is_protected' in data:
                event.is_protected = data['is_protected']
            if 'is_strategic' in data:
                event.is_strategic = data['is_strategic']
            db.session.commit()
            return jsonify({"message": "Event updated successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    @app.route('/api/calendar/<int:event_id>', methods=['DELETE'])
    @jwt_required()
    def delete_event(event_id):
        event = Event.query.get_or_404(event_id)
        db.session.delete(event)
        db.session.commit()
        return jsonify({"message": "Event deleted successfully"}), 200


    # --- ACTIONS ROUTES ---
    @app.route('/api/actions/stats', methods=['GET'])
    @jwt_required()
    def get_actions_stats():
        from models import Action
        try:
            from datetime import timedelta
            now = datetime.now(timezone.utc)
            week_from_now = now + timedelta(days=7)
            
            pending = Action.query.filter_by(status='Pending').count()
            in_progress = Action.query.filter_by(status='In Progress').count()
            completed = Action.query.filter_by(status='Completed').count()
            overdue = Action.query.filter(
                Action.status != 'Completed',
                Action.due_date < now
            ).count()
            due_this_week = Action.query.filter(
                Action.status != 'Completed',
                Action.due_date >= now,
                Action.due_date <= week_from_now
            ).count()
            
            return jsonify({
                "pending": pending,
                "in_progress": in_progress,
                "completed": completed,
                "overdue": overdue,
                "due_this_week": due_this_week
            }), 200
        except Exception as e:
            print(f"Error in get_actions_stats: {str(e)}")
            return jsonify({"error": str(e)}), 500

    @app.route('/api/actions/report', methods=['GET'])
    @jwt_required()
    def get_exception_report():
        from models import Action, User
        try:
            now = datetime.now(timezone.utc)
            overdue_actions = Action.query.filter(
                Action.status != 'Completed',
                Action.due_date < now
            ).all()
            
            critical_pending = Action.query.filter(
                Action.status != 'Completed',
                Action.priority == 'Critical'
            ).all()
            
            report = {
                "generated_at": now.isoformat(),
                "overdue": [{
                    "id": a.id, "title": a.title, "due": a.due_date.isoformat(),
                    "owner": db.session.get(User, a.assigned_to).username if a.assigned_to else "Unassigned"
                } for a in overdue_actions],
                "critical_pending": [{
                    "id": a.id, "title": a.title, "priority": a.priority,
                    "owner": db.session.get(User, a.assigned_to).username if a.assigned_to else "Unassigned"
                } for a in critical_pending]
            }
            return jsonify(report), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/api/actions', methods=['GET'])
    @jwt_required()
    def get_actions():
        from models import Action, User, Document, Project, db
        try:
            # Simplified query to avoid 500 errors
            actions = db.session.query(Action).all()
            
            result_list = []
            for action in actions:
                # Get assigned user info
                assigned_user = None
                if action.assigned_to:
                    assigned_user = db.session.get(User, action.assigned_to)
                
                # Get document info
                doc_title = None
                if action.document_id:
                    doc = db.session.get(Document, action.document_id)
                    if doc:
                        doc_title = doc.title
                
                # Get project info
                project_name = None
                if action.project_id:
                    project = db.session.get(Project, action.project_id)
                    if project:
                        project_name = project.name
                
                result_list.append({
                    "id": action.id, 
                    "title": action.title, 
                    "status": action.status, 
                    "priority": action.priority, 
                    "due_date": action.due_date.isoformat() if action.due_date else None,
                    "due": action.due_date.strftime('%Y-%m-%d') if action.due_date else None,
                    "created_at": action.created_at.isoformat(),
                    "assigned_to": action.assigned_to,
                    "assigned_username": assigned_user.username if assigned_user else "Unassigned",
                    "owner": assigned_user.username if assigned_user else "Unassigned",
                    "assigned_first_name": assigned_user.first_name if assigned_user else None,
                    "assigned_last_name": assigned_user.last_name if assigned_user else None,
                    "document_id": action.document_id,
                    "document_title": doc_title,
                    "project_id": action.project_id,
                    "project_name": project_name
                })
            
            # Sort by created_at DESC to show newest first
            result_list.sort(key=lambda x: x['created_at'], reverse=True)
            
            return jsonify(result_list), 200
            
        except Exception as e:
            print(f"Error in get_actions: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": f"Failed to load actions: {str(e)}"}), 500


    @app.route('/api/actions', methods=['POST'])
    @jwt_required()
    def create_action():
        from datetime import datetime, timezone
        try:
            data = request.json
            if not data or 'title' not in data:
                return jsonify({"error": "Missing title"}), 400

            # Get assignee (assigned_to)
            assigned_to_id = None
            
            # If the frontend sent 'assigned_to', use it
            if 'assigned_to' in data and data['assigned_to']:
                try:
                    assigned_to_id = int(data['assigned_to'])
                except ValueError:
                    pass
            
            # Fallback to looking up 'owner' (e.g. from the raw Owner input)
            if not assigned_to_id and 'owner' in data and data['owner']:
                owner_str = str(data['owner']).strip()
                from models import User
                user = User.query.filter_by(username=owner_str).first()
                if not user:
                    user = User.query.filter((User.first_name == owner_str) | (User.last_name == owner_str)).first()
                if user:
                    assigned_to_id = user.id
                else:
                    assigned_to_id = int(get_jwt_identity())
            else:
                assigned_to_id = int(get_jwt_identity())

            due_date = None
            raw_due_date = data.get('due_date') or data.get('due')
            if raw_due_date and str(raw_due_date).strip():
                raw_due_str = str(raw_due_date).strip()
                try:
                    if 'T' in raw_due_str:
                        due_date = datetime.fromisoformat(raw_due_str.replace('Z', '+00:00'))
                    else:
                        due_date = datetime.strptime(raw_due_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
                except Exception:
                    try:
                        due_date = datetime.fromisoformat(raw_due_str)
                    except Exception:
                        pass
                
            doc_id = data.get('document_id')
            if doc_id == "" or doc_id is None:
                doc_id = None
            else:
                doc_id = int(doc_id)

            project_id = data.get('project_id')
            if project_id == "" or project_id is None:
                project_id = None
            else:
                project_id = int(project_id)

            new_action = Action(
                title=data['title'],
                assigned_to=assigned_to_id,
                description=data.get('description', ''),
                status=data.get('status', 'Pending'),
                priority=data.get('priority', 'Medium'),
                due_date=due_date,
                document_id=doc_id,
                project_id=project_id,
                created_by=int(get_jwt_identity())
            )
            db.session.add(new_action)
            db.session.commit()
            
            try:
                from models import Notification
                notif = Notification(
                    user_id=new_action.assigned_to,
                    message=f"New task assigned: {new_action.title}",
                    link="/actions"
                )
                db.session.add(notif)
                db.session.commit()
                
                # REST API Integration: Notify via email
                assignee = db.session.get(User, new_action.assigned_to)
                if assignee and assignee.email:
                    TacticalMailer.send(
                        subject=f"[e-POM] New Operational Directive: {new_action.title}",
                        recipient=assignee.email,
                        body=f"Directive: {new_action.title}\nPriority: {new_action.priority}\nDue Date: {new_action.due_date}\n\nPlease check the e-POM terminal for full tactical brief."
                    )
            except Exception as notif_e:
                db.session.rollback()
                print(f"DEBUG Error creating notification: {str(notif_e)}")
                
            assigned_user = db.session.get(User, new_action.assigned_to)
            response_data = {
                "id": new_action.id,
                "title": new_action.title,
                "status": new_action.status,
                "priority": new_action.priority,
                "due_date": new_action.due_date.isoformat() if new_action.due_date else None,
                "due": new_action.due_date.strftime('%Y-%m-%d') if new_action.due_date else None,
                "created_at": new_action.created_at.isoformat(),
                "assigned_to": new_action.assigned_to,
                "assigned_username": assigned_user.username if assigned_user else "Unassigned",
                "owner": assigned_user.username if assigned_user else "Unassigned",
                "assigned_first_name": assigned_user.first_name if assigned_user else None,
                "assigned_last_name": assigned_user.last_name if assigned_user else None,
                "document_id": new_action.document_id,
                "project_id": new_action.project_id
            }
            return jsonify(response_data), 201
        except Exception as e:
            db.session.rollback()
            print(f"DEBUG Error in create_action: {str(e)}")
            return jsonify({"error": f"Directive creation failure: {str(e)}"}), 500

    @app.route('/api/actions/<int:action_id>', methods=['PUT'])
    @jwt_required()
    def update_action(action_id):
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        action = db.session.get(Action, action_id)
        if not action:
            return jsonify({"error": "Action not found"}), 404
        
        # Task can be modified ONLY by the assigned person or an Admin
        if action.assigned_to != current_user_id and current_user.role != 'Admin':
            return jsonify({"error": "Unauthorized: Only the assigned user or an Admin can modify this directive."}), 403

        data = request.json
        if 'status' in data:
            action.status = data['status']
        if 'project_id' in data:
            pid = data.get('project_id')
            action.project_id = int(pid) if (pid and pid != "") else None
        if 'priority' in data:
            action.priority = data['priority']
        if 'assigned_to' in data and data['assigned_to'] and current_user.role == 'Admin':
            new_assignee = int(data['assigned_to'])
            if new_assignee != action.assigned_to:
                action.assigned_to = new_assignee
                try:
                    from models import Notification
                    notif = Notification(
                        user_id=new_assignee,
                        message=f"Task re-assigned to you: {action.title}",
                        link="/actions"
                    )
                    db.session.add(notif)
                except Exception as e:
                    pass
        if 'document_id' in data:
            doc_id = data['document_id']
            action.document_id = int(doc_id) if doc_id not in ("", None) else None
            
        db.session.commit()
        assigned_user = db.session.get(User, action.assigned_to)
        return jsonify({
            "id": action.id, 
            "title": action.title, 
            "status": action.status, 
            "priority": action.priority, 
            "due_date": action.due_date.isoformat() if action.due_date else None,
            "due": action.due_date.strftime('%Y-%m-%d') if action.due_date else None,
            "created_at": action.created_at.isoformat(),
            "assigned_to": action.assigned_to,
            "assigned_username": assigned_user.username if assigned_user else "Unassigned",
            "owner": assigned_user.username if assigned_user else "Unassigned",
            "assigned_first_name": assigned_user.first_name if assigned_user else None,
            "assigned_last_name": assigned_user.last_name if assigned_user else None,
            "document_id": action.document_id,
            "project_id": action.project_id
        }), 200


    @app.route('/api/notifications', methods=['GET'])
    @jwt_required()
    def get_notifications():
        from models import Notification
        current_user_id = int(get_jwt_identity())
        notifs = Notification.query.filter_by(user_id=current_user_id).order_by(Notification.created_at.desc()).limit(20).all()
        return jsonify([{
            "id": n.id,
            "message": n.message,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.isoformat()
        } for n in notifs]), 200

    @app.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
    @jwt_required()
    def mark_notification_read(notif_id):
        from models import Notification
        current_user_id = int(get_jwt_identity())
        notif = db.session.get(Notification, notif_id)
        if not notif or notif.user_id != current_user_id:
            return jsonify({"error": "Not found or unauthorized"}), 404
            
        notif.is_read = True
        db.session.commit()
        return jsonify({"message": "Marked as read"}), 200

    @app.route('/api/actions/<int:action_id>', methods=['DELETE'])
    @jwt_required()
    @role_required('Admin')
    def delete_action(action_id):
        action = db.session.get(Action, action_id)
        if not action:
            return jsonify({"error": "Action not found"}), 404
        db.session.delete(action)
        db.session.commit()
        return jsonify({"message": "Action deleted successfully"}), 200


    @app.route('/api/documents', methods=['GET'])
    @jwt_required()
    def get_documents():
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)
        
        # Use outerjoin to include documents even if uploader user is missing
        query = db.session.query(Document, User.username).outerjoin(User, Document.uploaded_by == User.id)
        
        if user.role != 'Admin':
            query = query.filter(Document.category != 'Restricted')
            
        # Ensure newest documents appear first
        query = query.order_by(Document.created_at.desc())
        docs = query.all()
        return jsonify([{
            "id": d.Document.id, 
            "title": d.Document.title, 
            "file_path": d.Document.file_path,
            "status": d.Document.status, 
            "category": d.Document.category, 
            "uploaded_by": d.Document.uploaded_by,
            "uploader_name": d.username or "Unknown",
            "doc_type": d.Document.doc_type,
            "content": d.Document.content,
            "upload_date": d.Document.created_at.isoformat(),
            "created": d.Document.created_at.isoformat()
        } for d in docs]), 200

    @app.route('/api/documents', methods=['POST'])
    @jwt_required()
    def create_document():
        from models import Document, User
        from werkzeug.utils import secure_filename
        import os
        current_user_id = int(get_jwt_identity())
        
        try:
            # Check if request has files (multipart/form-data) or JSON
            if request.is_json:
                data = request.json
                title = data.get('title')
                content = data.get('content', '')
                category = data.get('category', 'Internal')
                doc_type = data.get('doc_type', 'Briefing Note')
                file_path = 'digitized_note'
            else:
                title = request.form.get('title')
                content = request.form.get('content', '')
                category = request.form.get('category', 'Internal')
                doc_type = request.form.get('doc_type', 'Briefing Note')
                
                # Check for file upload
                if 'file' in request.files and request.files['file'].filename != '':
                    file = request.files['file']
                    upload_dir = 'uploads'
                    if not os.path.exists(upload_dir):
                        os.makedirs(upload_dir)
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(upload_dir, filename)
                    file.save(file_path)
                    doc_type = 'Uploaded File'
                    if not content:
                        content = f"Physical file uploaded: {filename}"
                else:
                    file_path = 'digitized_note'
                    
            if not title:
                return jsonify({"error": "Missing document title"}), 400
                
            new_doc = Document(
                title=title,
                category=category,
                doc_type=doc_type,
                content=content,
                file_path=file_path,
                status='Draft',
                uploaded_by=current_user_id
            )
            
            db.session.add(new_doc)
            db.session.commit()
            
            uploader = db.session.get(User, current_user_id)
            uploader_name = uploader.username if uploader else "Unknown"
            
            return jsonify({
                "id": new_doc.id,
                "title": new_doc.title,
                "file_path": new_doc.file_path,
                "status": new_doc.status,
                "category": new_doc.category,
                "uploaded_by": new_doc.uploaded_by,
                "uploader_name": uploader_name,
                "doc_type": new_doc.doc_type,
                "content": new_doc.content,
                "upload_date": new_doc.created_at.isoformat(),
                "created": new_doc.created_at.isoformat()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating document: {str(e)}")
            return jsonify({"error": f"Failed to create document: {str(e)}"}), 500

    @app.route('/api/documents/<int:doc_id>/audit', methods=['GET'])
    @jwt_required()
    def get_document_audit(doc_id):
        from models import DocumentAudit, User
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        
        # Only admins or document creators can view audit logs
        doc = db.session.get(Document, doc_id)
        if not doc or (current_user.role != 'Admin' and doc.uploaded_by != current_user_id):
            return jsonify({"error": "Unauthorized"}), 403
            
        audits = DocumentAudit.query.filter_by(document_id=doc_id).order_by(DocumentAudit.created_at.desc()).all()
        return jsonify([{
            "id": a.id,
            "action": a.action,
            "user_id": a.user_id,
            "username": User.query.get(a.user_id).username if User.query.get(a.user_id) else "Unknown",
            "created_at": a.created_at.isoformat()
        } for a in audits]), 200

    @app.route('/api/documents/template', methods=['POST'])
    @jwt_required()
    def create_document_template():
        from models import Document
        current_user_id = int(get_jwt_identity())
        
        try:
            data = request.json
            if not data or 'title' not in data:
                return jsonify({"error": "Missing document title"}), 400
            
            new_doc = Document(
                title=data['title'],
                category=data.get('category', 'Internal'),
                doc_type=data.get('doc_type', 'Briefing Note'),
                content=data.get('content', ''),
                file_path='digitized_note',
                status='Draft',
                uploaded_by=current_user_id
            )
            
            db.session.add(new_doc)
            db.session.commit()
            
            return jsonify({
                "message": "Document created successfully",
                "id": new_doc.id,
                "title": new_doc.title,
                "status": new_doc.status
            }), 201
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating document template: {str(e)}")
            return jsonify({"error": f"Failed to create document: {str(e)}"}), 500

    @app.route('/api/documents/upload', methods=['POST'])
    @jwt_required()
    def upload_document_file():
        from models import Document
        from werkzeug.utils import secure_filename
        import os
        current_user_id = int(get_jwt_identity())
        
        try:
            if 'file' not in request.files:
                return jsonify({"error": "No file provided"}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400
            
            # Create uploads directory if it doesn't exist
            upload_dir = 'uploads'
            if not os.path.exists(upload_dir):
                os.makedirs(upload_dir)
            
            # Secure filename and save
            filename = secure_filename(file.filename)
            file_path = os.path.join(upload_dir, filename)
            file.save(file_path)
            
            # Create document record
            new_doc = Document(
                title=request.form.get('title', filename),
                category=request.form.get('category', 'Internal'),
                doc_type=request.form.get('doc_type', 'Uploaded File'),
                content=f"Physical file uploaded: {filename}",
                file_path=file_path,
                status='Draft',
                uploaded_by=current_user_id
            )
            
            db.session.add(new_doc)
            db.session.commit()
            
            return jsonify({
                "message": "File uploaded successfully",
                "id": new_doc.id,
                "title": new_doc.title,
                "filename": filename,
                "status": new_doc.status
            }), 201
            
        except Exception as e:
            db.session.rollback()
            print(f"Error uploading file: {str(e)}")
            return jsonify({"error": f"Failed to upload file: {str(e)}"}), 500

    @app.route('/api/documents/download/<path:filename>', methods=['GET'])
    def download_document(filename):
        from flask import send_from_directory
        try:
            # For digitized notes, return content as text file
            if filename == 'digitized_note':
                # This should not happen here, but handle gracefully
                return jsonify({"error": "Invalid download request"}), 400
            
            # For uploaded files, serve from uploads directory
            return send_from_directory('uploads', filename, as_attachment=request.args.get('download', 'false') == 'true')
        except Exception as e:
            print(f"Error downloading file: {str(e)}")
            return jsonify({"error": "File not found"}), 404

    @app.route('/api/documents/<int:doc_id>', methods=['PUT'])
    @jwt_required()
    def update_document(doc_id):
        from models import Document
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        
        doc = db.session.get(Document, doc_id)
        if not doc:
            return jsonify({"error": "Document not found"}), 404
        
        # Only admins or document creators can update
        if current_user.role != 'Admin' and doc.uploaded_by != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        try:
            data = request.json
            if 'status' in data:
                doc.status = data['status']
            if 'title' in data:
                doc.title = data['title']
            if 'category' in data:
                doc.category = data['category']
            if 'content' in data:
                doc.content = data['content']
            
            db.session.commit()
            return jsonify({"message": "Document updated successfully"}), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating document: {str(e)}")
            return jsonify({"error": f"Failed to update document: {str(e)}"}), 500

    # ── Document Approval Workflow Routes ──────────────────────────────────────

    @app.route('/api/documents/<int:doc_id>/submit-approval', methods=['POST'])
    @jwt_required()
    def submit_document_for_approval(doc_id):
        """Submit a draft document for approval (owner or admin)."""
        from models import Document, DocumentAudit
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        doc = db.session.get(Document, doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        if current_user.role != 'Admin' and doc.uploaded_by != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        doc.status = 'Pending Approval'
        doc.category = 'Pending Approval'
        audit = DocumentAudit(document_id=doc_id, user_id=current_user_id,
                              action=f'Submitted for approval by {current_user.username}')
        db.session.add(audit)
        db.session.commit()
        return jsonify({
            'id': doc.id, 'status': doc.status, 'category': doc.category,
            'title': doc.title, 'content': doc.content,
            'created': doc.created_at.isoformat()
        }), 200

    @app.route('/api/documents/<int:doc_id>/approve', methods=['POST'])
    @jwt_required()
    def approve_document(doc_id):
        """Approve a pending document (Admin only)."""
        from models import Document, DocumentAudit
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        if current_user.role != 'Admin':
            return jsonify({'error': 'Admin access required'}), 403
        doc = db.session.get(Document, doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        doc.status = 'Approved'
        audit = DocumentAudit(document_id=doc_id, user_id=current_user_id,
                              action=f'Approved by {current_user.username}')
        db.session.add(audit)
        db.session.commit()
        return jsonify({
            'id': doc.id, 'status': doc.status, 'category': doc.category,
            'title': doc.title, 'content': doc.content,
            'created': doc.created_at.isoformat()
        }), 200

    @app.route('/api/documents/<int:doc_id>/reject', methods=['POST'])
    @jwt_required()
    def reject_document(doc_id):
        """Reject a pending document (Admin only)."""
        from models import Document, DocumentAudit
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        if current_user.role != 'Admin':
            return jsonify({'error': 'Admin access required'}), 403
        doc = db.session.get(Document, doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        doc.status = 'Rejected'
        doc.category = 'Draft Documents'
        audit = DocumentAudit(document_id=doc_id, user_id=current_user_id,
                              action=f'Rejected by {current_user.username}')
        db.session.add(audit)
        db.session.commit()
        return jsonify({
            'id': doc.id, 'status': doc.status, 'category': doc.category,
            'title': doc.title, 'content': doc.content,
            'created': doc.created_at.isoformat()
        }), 200

    @app.route('/api/documents/<int:doc_id>/archive', methods=['POST'])
    @jwt_required()
    def archive_document(doc_id):
        """Move an approved document to secure archive (Admin only)."""
        from models import Document, DocumentAudit
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        if current_user.role != 'Admin':
            return jsonify({'error': 'Admin access required'}), 403
        doc = db.session.get(Document, doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        doc.status = 'Archived'
        doc.category = 'Secure Archive'
        doc.is_encrypted = True
        audit = DocumentAudit(document_id=doc_id, user_id=current_user_id,
                              action=f'Securely archived by {current_user.username}')
        db.session.add(audit)
        db.session.commit()
        return jsonify({
            'id': doc.id, 'status': doc.status, 'category': doc.category,
            'title': doc.title, 'content': doc.content,
            'created': doc.created_at.isoformat()
        }), 200

    # ───────────────────────────────────────────────────────────────────────────

    @app.route('/api/documents/<int:doc_id>', methods=['DELETE'])
    @jwt_required()
    def delete_document(doc_id):
        from models import Document
        current_user_id = int(get_jwt_identity())
        current_user = db.session.get(User, current_user_id)
        
        doc = db.session.get(Document, doc_id)
        if not doc:
            return jsonify({"error": "Document not found"}), 404
        
        # Only admins or document creators can delete
        if current_user.role != 'Admin' and doc.uploaded_by != current_user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        try:
            # Delete uploaded file if it exists
            import os
            if doc.file_path and doc.file_path != 'digitized_note' and os.path.exists(doc.file_path):
                os.remove(doc.file_path)
            
            db.session.delete(doc)
            db.session.commit()
            return jsonify({"message": "Document deleted successfully"}), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting document: {str(e)}")
            return jsonify({"error": f"Failed to delete document: {str(e)}"}), 500

    @app.route('/api/documents/<int:doc_id>/audit', methods=['POST'])
    @jwt_required()
    def create_document_audit(doc_id):
        from models import DocumentAudit
        current_user_id = int(get_jwt_identity())
        data = request.json
        
        audit = DocumentAudit(
            document_id=doc_id,
            user_id=current_user_id,
            action=data.get('action', 'viewed')
        )
        db.session.add(audit)
        db.session.commit()
        return jsonify({"message": "Audit log created"}), 201

    # Serve frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    return app

# Create app instance for deployment
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
