from flask import Blueprint, jsonify, request
import os
import sys

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Action
from db import db
from datetime import datetime, timedelta

actions_bp = Blueprint('actions', __name__)


@actions_bp.route('', methods=['GET'])
def list_actions():
    q = (request.args.get('q') or '').lower()
    qs = Action.query
    if q:
        qs = qs.filter((Action.title.ilike(f"%{q}%")) | (Action.owner.ilike(f"%{q}%")))
    res = qs.order_by(Action.id.desc()).all()
    return jsonify([a.to_dict() for a in res])


@actions_bp.route('/stats', methods=['GET'])
def stats():
    now = datetime.utcnow().date()
    in_progress = Action.query.filter_by(status='in_progress').count()
    completed = Action.query.filter_by(status='completed').count()
    overdue = Action.query.filter(Action.due != None, Action.due < now, Action.status != 'completed').count()
    due_this_week = Action.query.filter(Action.due != None, Action.due >= now, Action.due <= (now + timedelta(days=7))).count()
    return jsonify({'in_progress': in_progress, 'completed': completed, 'overdue': overdue, 'due_this_week': due_this_week})


@actions_bp.route('', methods=['POST'])
def create_action():
    data = request.json or {}
    a = Action(title=data.get('title'), owner=data.get('owner'), timeline=data.get('timeline'), status=data.get('status', 'pending'))
    due = data.get('due')
    if due:
        try:
            a.due = datetime.fromisoformat(due).date()
        except Exception:
            pass
    db.session.add(a)
    db.session.commit()
    return jsonify(a.to_dict()), 201


@actions_bp.route('/<int:action_id>', methods=['PATCH'])
def update_action(action_id):
    a = Action.query.get_or_404(action_id)
    data = request.json or {}
    if 'status' in data:
        a.status = data['status']
    if 'title' in data:
        a.title = data['title']
    if 'owner' in data:
        a.owner = data['owner']
    if 'due' in data:
        try:
            a.due = datetime.fromisoformat(data['due']).date()
        except Exception:
            pass
    db.session.commit()
    return jsonify(a.to_dict())


@actions_bp.route('/<int:action_id>', methods=['DELETE'])
def delete_action(action_id):
    a = Action.query.get_or_404(action_id)
    db.session.delete(a)
    db.session.commit()
    return jsonify({'status': 'deleted'})
