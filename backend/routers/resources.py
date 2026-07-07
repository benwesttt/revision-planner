from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models.course import Course
from models.resource import Resource
from models.user import User
from schemas.resource import ResourceCreate, ResourceResponse, ResourceUpdate

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("/", response_model=List[ResourceResponse])
def list_resources(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Resource)
        .join(Course, Resource.course_id == Course.id)
        .filter(Course.user_id == current_user.id)
    )
    if course_id is not None:
        q = q.filter(Resource.course_id == course_id)
    return q.all()


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = (
        db.query(Resource)
        .join(Course, Resource.course_id == Course.id)
        .filter(Resource.id == resource_id, Course.user_id == current_user.id)
        .first()
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.post("/", response_model=ResourceResponse, status_code=201)
def create_resource(
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = (
        db.query(Course)
        .filter(Course.id == payload.course_id, Course.user_id == current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    resource = Resource(**payload.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: int,
    payload: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = (
        db.query(Resource)
        .join(Course, Resource.course_id == Course.id)
        .filter(Resource.id == resource_id, Course.user_id == current_user.id)
        .first()
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "course_id" in update_data:
        new_course = (
            db.query(Course)
            .filter(Course.id == update_data["course_id"], Course.user_id == current_user.id)
            .first()
        )
        if not new_course:
            raise HTTPException(status_code=404, detail="Course not found")

    for field, value in update_data.items():
        setattr(resource, field, value)
    db.commit()
    db.refresh(resource)
    return resource


@router.delete("/{resource_id}", status_code=204)
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resource = (
        db.query(Resource)
        .join(Course, Resource.course_id == Course.id)
        .filter(Resource.id == resource_id, Course.user_id == current_user.id)
        .first()
    )
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    db.delete(resource)
    db.commit()
