from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(50), default='Assistant') # Admin, Minister, Chief of staff, Advisor, Protocol, Assistant
    is_active = db.Column(db.Boolean, default=True)
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(100), nullable=True)
    mfa_code = db.Column(db.String(10), nullable=True)
    contact = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    must_change_password = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Resource(db.Model):
    __tablename__ = 'resources'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), default='Room') # Room, Vehicle, Equipment
    capacity = db.Column(db.Integer, nullable=True)
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Event(db.Model):
    __tablename__ = 'events'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_time = db.Column(db.DateTime(timezone=True), nullable=False)
    end_time = db.Column(db.DateTime(timezone=True), nullable=False)
    priority = db.Column(db.String(20), default='Medium') # High, Medium, Low
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    mandatory_attendees = db.Column(db.Text, nullable=True) 
    optional_attendees = db.Column(db.Text, nullable=True)
    resource_id = db.Column(db.Integer, db.ForeignKey('resources.id'), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    type = db.Column(db.String(50), default='meeting')  # meeting, briefing, travel, etc.
    recurrence = db.Column(db.String(50), nullable=True)  # e.g., daily, weekly, monthly
    meeting_link = db.Column(db.String(255), nullable=True)
    is_protected = db.Column(db.Boolean, default=False)
    is_strategic = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "type": self.type,
            "priority": self.priority,
            "user_id": self.user_id,
            "location": self.location,
            "meeting_link": self.meeting_link,
            "recurrence": self.recurrence,
            "is_protected": self.is_protected,
            "is_strategic": self.is_strategic,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Document(db.Model):
    __tablename__ = 'documents'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='Draft')
    category = db.Column(db.String(50), default='Internal')
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doc_type = db.Column(db.String(50), default='Official')
    content = db.Column(db.Text, nullable=True)
    is_encrypted = db.Column(db.Boolean, default=True)
    encryption_iv = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='Active') # Active, On Hold, Completed
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Action(db.Model):
    __tablename__ = 'actions'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='Pending') # Pending, In Progress, Completed
    priority = db.Column(db.String(20), default='Medium') # High, Medium, Low
    due_date = db.Column(db.DateTime(timezone=True), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    clock_in_time = db.Column(db.DateTime(timezone=True), nullable=False)
    clock_out_time = db.Column(db.DateTime(timezone=True), nullable=True)
    date = db.Column(db.String(20), nullable=False) # Format: YYYY-MM-DD
    status = db.Column(db.String(50), default='Present')
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class DocumentAudit(db.Model):
    __tablename__ = 'document_audits'
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Personnel(db.Model):
    __tablename__ = 'personnel'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    role = db.Column(db.String(100), default='User')
    status = db.Column(db.String(50), default='Active')  # Active, Inactive
    hire_date = db.Column(db.DateTime(timezone=True), nullable=True)
    password_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id, 
            "name": self.name,
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "department": self.department, 
            "role": self.role,
            "status": self.status,
            "hireDate": self.hire_date.isoformat() if self.hire_date else None,
            "created_at": self.created_at.isoformat()
        }
