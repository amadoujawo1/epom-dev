from flask import Blueprint, jsonify, request
import os
import sys

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Document
from db import db

documents_bp = Blueprint('documents', __name__)


@documents_bp.route('', methods=['GET'])
def list_documents():
    q = (request.args.get('q') or '').lower()
    category = request.args.get('category')
    qs = Document.query
    if category:
        qs = qs.filter_by(category=category)
    if q:
        qs = qs.filter((Document.title.ilike(f"%{q}%")) | (Document.content.ilike(f"%{q}%")))
    res = qs.order_by(Document.created.desc()).all()
    return jsonify([d.to_dict() for d in res])


@documents_bp.route('', methods=['POST'])
def create_document():
    data = request.json or {}
    d = Document(title=data.get('title'), category=data.get('category', 'All Documents'), status=data.get('status', 'draft'), content=data.get('content', ''))
    db.session.add(d)
    db.session.commit()
    return jsonify(d.to_dict()), 201


@documents_bp.route('/<int:doc_id>', methods=['PATCH'])
def update_document(doc_id):
    d = Document.query.get_or_404(doc_id)
    data = request.json or {}
    if 'title' in data:
        d.title = data['title']
    if 'content' in data:
        d.content = data['content']
    if 'category' in data:
        d.category = data['category']
    if 'status' in data:
        d.status = data['status']
    db.session.commit()
    return jsonify(d.to_dict())


@documents_bp.route('/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    d = Document.query.get_or_404(doc_id)
    db.session.delete(d)
    db.session.commit()
    return jsonify({'status': 'deleted'})
