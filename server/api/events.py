from flask import Blueprint, jsonify, request
import os
import sys

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Event
from db import db
from datetime import datetime
from sqlalchemy import extract

events_bp = Blueprint('events', __name__)


@events_bp.route('', methods=['GET'])
def list_events():
    month = request.args.get('month')
    year = request.args.get('year')
    qs = Event.query
    if month and year:
        qs = qs.filter(extract('month', Event.start_time) == int(month)).filter(extract('year', Event.start_time) == int(year))
    res = qs.order_by(Event.start_time).all()
    return jsonify([e.to_dict() for e in res])


@events_bp.route('', methods=['POST'])
def create_event():
    data = request.json or {}
    ev = Event(
        title=data.get('title'),
        type=data.get('type', 'meeting'),
        description=data.get('description')
    )
    # Expect ISO datetime strings for start_time and end_time; fallback to date if provided
    start = data.get('start_time')
    end = data.get('end_time')
    if start:
        try:
            ev.start_time = datetime.fromisoformat(start)
        except Exception:
            pass
    if end:
        try:
            ev.end_time = datetime.fromisoformat(end)
        except Exception:
            pass
    # If only a date is supplied, set start/end to that date at midnight
    if not ev.start_time and not ev.end_time:
        date = data.get('date')
        if date:
            try:
                dt = datetime.fromisoformat(date)
                ev.start_time = dt
                ev.end_time = dt
            except Exception:
                pass
    db.session.add(ev)
    db.session.commit()
    return jsonify(ev.to_dict()), 201


@events_bp.route('/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    ev = Event.query.get_or_404(event_id)
    db.session.delete(ev)
    db.session.commit()
    return jsonify({'status': 'deleted'})

@events_bp.route('/<int:event_id>', methods=['PUT'])
def edit_event(event_id):
    ev = Event.query.get_or_404(event_id)
    data = request.json or {}
    ev.title = data.get('title', ev.title)
    ev.type = data.get('type', ev.type)
    ev.description = data.get('description', ev.description)
    start = data.get('start_time')
    end = data.get('end_time')
    if start:
        try:
            ev.start_time = datetime.fromisoformat(start)
        except Exception:
            pass
    if end:
        try:
            ev.end_time = datetime.fromisoformat(end)
        except Exception:
            pass
    db.session.commit()
    return jsonify(ev.to_dict()), 200


@events_bp.route('/stats', methods=['GET'])
def stats():
    total = Event.query.count()
    meetings = Event.query.filter_by(type='meeting').count()
    return jsonify({'total': total, 'meetings': meetings})
