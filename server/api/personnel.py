from flask import Blueprint, jsonify, request
import os
import sys
from datetime import datetime, timezone

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Personnel
from db import db

personnel_bp = Blueprint('personnel', __name__)


@personnel_bp.route('', methods=['GET'])
def list_personnel():
    people = Personnel.query.order_by(Personnel.created_at.desc()).all()
    return jsonify([p.to_dict() for p in people])


@personnel_bp.route('', methods=['POST'])
def add_person():
    data = request.json or {}
    hire_date = None
    if data.get('hireDate'):
        try:
            hire_date = datetime.fromisoformat(data.get('hireDate').replace('Z', '+00:00'))
        except:
            hire_date = None
    
    p = Personnel(
        name=data.get('name'),
        email=data.get('email'),
        phone=data.get('phone'),
        department=data.get('department'),
        role=data.get('role', 'User'),
        status=data.get('status', 'Active'),
        hire_date=hire_date
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@personnel_bp.route('/<int:person_id>', methods=['PUT'])
def update_person(person_id):
    p = Personnel.query.get_or_404(person_id)
    data = request.json or {}
    
    # Update fields if provided
    if 'name' in data:
        p.name = data.get('name')
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
    if 'hireDate' in data:
        if data.get('hireDate'):
            try:
                p.hire_date = datetime.fromisoformat(data.get('hireDate').replace('Z', '+00:00'))
            except:
                p.hire_date = None
        else:
            p.hire_date = None
    
    db.session.commit()
    return jsonify(p.to_dict())


@personnel_bp.route('/<int:person_id>', methods=['DELETE'])
def delete_person(person_id):
    p = Personnel.query.get_or_404(person_id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'status': 'deleted'})
