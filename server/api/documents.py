from flask import Blueprint, jsonify, request
import os
import sys
from flask_jwt_extended import jwt_required, get_jwt_identity

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Document, DocumentVersion, Tag
from db import db

documents_bp = Blueprint('documents', __name__)


@documents_bp.route('', methods=['GET'])
@jwt_required()
def list_documents():
    q = (request.args.get('q') or '').lower()
    category = request.args.get('category')
    status = request.args.get('status')
    uploaded_by = request.args.get('uploaded_by')
    doc_type = request.args.get('doc_type')
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    tag_names = request.args.getlist('tags') # Get a list of tag names

    qs = Document.query

    if category:
        qs = qs.filter_by(category=category)
    if status:
        qs = qs.filter_by(status=status)
    if uploaded_by:
        qs = qs.filter_by(uploaded_by=uploaded_by)
    if doc_type:
        qs = qs.filter_by(doc_type=doc_type)
    
    if start_date_str:
        try:
            from datetime import datetime
            start_date = datetime.fromisoformat(start_date_str)
            qs = qs.filter(Document.created_at >= start_date)
        except ValueError:
            return jsonify({"error": "Invalid start_date format. Use ISO format (YYYY-MM-DD)."}), 400
    
    if end_date_str:
        try:
            from datetime import datetime
            end_date = datetime.fromisoformat(end_date_str)
            qs = qs.filter(Document.created_at <= end_date)
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Use ISO format (YYYY-MM-DD)."}), 400

    if tag_names:
        for tag_name in tag_names:
            qs = qs.filter(Document.tags.any(Tag.name == tag_name))

    if q:
        qs = qs.filter((Document.title.ilike(f"%{q}%")) | (Document.content.ilike(f"%{q}%")))
    
    res = qs.order_by(Document.created_at.desc()).all()
    return jsonify([d.to_dict() for d in res])


@documents_bp.route('', methods=['POST'])
@jwt_required()
def create_document():
    data = request.json or {}
    current_user_id = get_jwt_identity()

    d = Document(
        title=data.get('title'), 
        category=data.get('category', 'All Documents'), 
        status=data.get('status', 'draft'), 
        content=data.get('content', ''),
        uploaded_by=current_user_id
    )
    db.session.add(d)
    db.session.commit()

    # Handle initial tags if provided
    if 'tags' in data and isinstance(data['tags'], list):
        for tag_name in data['tags']:
            tag = Tag.query.filter_by(name=tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.session.add(tag)
            d.tags.append(tag)
        db.session.commit()

    return jsonify(d.to_dict()), 201


@documents_bp.route('/<int:doc_id>', methods=['PATCH'])
@jwt_required()
def update_document(doc_id):
    d = Document.query.get_or_404(doc_id)
    data = request.json or {}
    current_user_id = get_jwt_identity()

    # Store current state for versioning BEFORE updating the document
    old_file_path = d.file_path
    old_content = d.content
    
    # Update document fields
    if 'title' in data:
        d.title = data['title']
    if 'content' in data:
        d.content = data['content']
    if 'category' in data:
        d.category = data['category']
    if 'status' in data:
        d.status = data['status']
    if 'file_path' in data: # Explicitly handle file_path updates
        d.file_path = data['file_path']
    
    # Handle tags update
    if 'tags' in data and isinstance(data['tags'], list):
        # Clear existing tags and add new ones
        d.tags.clear()
        for tag_name in data['tags']:
            tag = Tag.query.filter_by(name=tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.session.add(tag)
            d.tags.append(tag)

    # Create a new version if content or file_path has changed
    if d.content != old_content or d.file_path != old_file_path:
        last_version = DocumentVersion.query.filter_by(document_id=d.id).order_by(DocumentVersion.version_number.desc()).first()
        new_version_number = (last_version.version_number + 1) if last_version else 1
        
        new_version = DocumentVersion(
            document_id=d.id,
            version_number=new_version_number,
            file_path=old_file_path, # Store the OLD file_path for the version
            content=old_content,     # Store the OLD content for the version
            uploaded_by=current_user_id
        )
        db.session.add(new_version)

    db.session.commit()
    return jsonify(d.to_dict())


@documents_bp.route('/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    d = Document.query.get_or_404(doc_id)
    db.session.delete(d)
    db.session.commit()
    return jsonify({'status': 'deleted'})


@documents_bp.route('/<int:document_id>/versions', methods=['GET'])
@jwt_required()
def list_document_versions(document_id):
    document = Document.query.get_or_404(document_id)
    versions = DocumentVersion.query.filter_by(document_id=document_id).order_by(DocumentVersion.created_at.desc()).all()
    return jsonify([v.to_dict() for v in versions])


@documents_bp.route('/<int:document_id>/versions/<int:version_number>', methods=['GET'])
@jwt_required()
def get_document_version(document_id, version_number):
    version = DocumentVersion.query.filter_by(document_id=document_id, version_number=version_number).first_or_404()
    return jsonify(version.to_dict())


# --- Tag Management Endpoints ---
@documents_bp.route('/tags', methods=['GET'])
@jwt_required()
def list_tags():
    tags = Tag.query.all()
    return jsonify([tag.to_dict() for tag in tags])


@documents_bp.route('/tags', methods=['POST'])
@jwt_required()
def create_tag():
    data = request.json or {}
    name = data.get('name')
    if not name:
        return jsonify({"error": "Tag name is required"}), 400
    
    existing_tag = Tag.query.filter_by(name=name).first()
    if existing_tag:
        return jsonify({"error": "Tag with this name already exists"}), 409

    new_tag = Tag(name=name)
    db.session.add(new_tag)
    db.session.commit()
    return jsonify(new_tag.to_dict()), 201


@documents_bp.route('/tags/<int:tag_id>', methods=['DELETE'])
@jwt_required()
def delete_tag(tag_id):
    tag = Tag.query.get_or_404(tag_id)
    db.session.delete(tag)
    db.session.commit()
    return jsonify({"message": "Tag deleted successfully"}), 200


@documents_bp.route('/<int:document_id>/tags', methods=['POST'])
@jwt_required()
def add_tag_to_document(document_id):
    document = Document.query.get_or_404(document_id)
    data = request.json or {}
    tag_id = data.get('tag_id')
    
    if not tag_id:
        return jsonify({"error": "Tag ID is required"}), 400
    
    tag = Tag.query.get_or_404(tag_id)
    
    if tag in document.tags:
        return jsonify({"message": "Document already has this tag"}), 200
        
    document.tags.append(tag)
    db.session.commit()
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<int:document_id>/tags/<int:tag_id>', methods=['DELETE'])
@jwt_required()
def remove_tag_from_document(document_id, tag_id):
    document = Document.query.get_or_404(document_id)
    tag = Tag.query.get_or_404(tag_id)
    
    if tag not in document.tags:
        return jsonify({"message": "Document does not have this tag"}), 200
        
    document.tags.remove(tag)
    db.session.commit()
    return jsonify(document.to_dict()), 200
