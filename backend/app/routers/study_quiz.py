"""研学打卡后的信阳毛尖答题、证书。"""

from __future__ import annotations

import json
import secrets
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.models import StudyCheckinRecord, StudyQuizAttempt, StudyQuizCertificate, StudySpot
from app.study_quiz_bank import grade_answers, max_score, questions_for_client

router = APIRouter(tags=["study-quiz"])


def _spot_display_name(db: Session, spot_id: str) -> str:
    row = db.query(StudySpot).filter(StudySpot.id == spot_id).first()
    if not row:
        return ""
    try:
        payload = json.loads(row.payload_json or "{}")
        return str(payload.get("name") or "")
    except Exception:
        return ""


class CheckinBody(BaseModel):
    spotId: str = Field(..., min_length=1)


@router.post("/api/study/checkin")
def study_checkin(body: CheckinBody, db: DbSession, user: CurrentUser) -> Any:
    spot = db.query(StudySpot).filter(StudySpot.id == body.spotId.strip()).first()
    if not spot:
        raise HTTPException(status_code=404, detail="打卡点不存在")
    spot_name = _spot_display_name(db, body.spotId.strip())
    existing = (
        db.query(StudyCheckinRecord)
        .filter(
            StudyCheckinRecord.user_id == user.id,
            StudyCheckinRecord.spot_id == body.spotId.strip(),
        )
        .first()
    )
    if existing:
        return {
            "checkinRecordId": existing.id,
            "spotId": existing.spot_id,
            "spotName": existing.spot_name or spot_name,
            "checkedAt": existing.checked_at.isoformat() + "Z",
            "alreadyRecorded": True,
        }
    rec = StudyCheckinRecord(
        user_id=user.id,
        spot_id=body.spotId.strip(),
        spot_name=spot_name,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {
        "checkinRecordId": rec.id,
        "spotId": rec.spot_id,
        "spotName": rec.spot_name or spot_name,
        "checkedAt": rec.checked_at.isoformat() + "Z",
        "alreadyRecorded": False,
    }


@router.get("/api/study/quiz/questions")
def study_quiz_questions_public() -> Any:
    """无需登录即可拉题（减轻首屏依赖）；提交仍需登录。"""
    return {"questions": questions_for_client(), "maxScore": max_score()}


class QuizSubmitBody(BaseModel):
    checkinRecordId: str = Field(..., min_length=1)
    answers: Dict[str, str] = Field(default_factory=dict)


def _gen_cert_no() -> str:
    d = datetime.utcnow().strftime("%Y%m%d")
    suf = secrets.token_hex(3).upper()
    return f"XYMJ-{d}-{suf}"


def _attempt_to_response(
    att: StudyQuizAttempt,
    cert: Optional[StudyQuizCertificate],
    pass_min: Optional[int] = None,
) -> Dict[str, Any]:
    try:
        results = json.loads(att.results_json or "[]")
    except Exception:
        results = []
    cert_out = None
    if cert:
        cert_out = {
            "id": cert.id,
            "certNo": cert.cert_no,
            "issuedAt": cert.issued_at.isoformat() + "Z",
        }
    out: Dict[str, Any] = {
        "attemptId": att.id,
        "score": att.score,
        "maxScore": att.max_score,
        "passed": att.passed,
        "results": results,
        "certificate": cert_out,
    }
    if pass_min is not None:
        out["passMinScore"] = pass_min
    return out


@router.post("/api/study/quiz/submit")
def study_quiz_submit(body: QuizSubmitBody, db: DbSession, user: CurrentUser) -> Any:
    settings = get_settings()
    pass_min = max(1, min(max_score(), int(settings.study_quiz_pass_min_score)))

    cin = db.query(StudyCheckinRecord).filter(StudyCheckinRecord.id == body.checkinRecordId.strip()).first()
    if not cin or cin.user_id != user.id:
        raise HTTPException(status_code=404, detail="打卡记录不存在")

    existing_att = (
        db.query(StudyQuizAttempt).filter(StudyQuizAttempt.checkin_record_id == cin.id).first()
    )
    if existing_att:
        cert = (
            db.query(StudyQuizCertificate)
            .filter(StudyQuizCertificate.quiz_attempt_id == existing_att.id)
            .first()
        )
        return _attempt_to_response(existing_att, cert, pass_min)

    score, results = grade_answers(body.answers)
    mx = max_score()
    passed = score >= pass_min

    att = StudyQuizAttempt(
        user_id=user.id,
        checkin_record_id=cin.id,
        answers_json=json.dumps(body.answers, ensure_ascii=False),
        score=score,
        max_score=mx,
        passed=passed,
        results_json=json.dumps(results, ensure_ascii=False),
    )
    db.add(att)
    db.flush()

    cert: Optional[StudyQuizCertificate] = None
    if passed:
        cert_no = _gen_cert_no()
        while db.query(StudyQuizCertificate).filter(StudyQuizCertificate.cert_no == cert_no).first():
            cert_no = _gen_cert_no()
        cert = StudyQuizCertificate(
            user_id=user.id,
            checkin_record_id=cin.id,
            quiz_attempt_id=att.id,
            cert_no=cert_no,
            nickname=user.nickname or "茶友",
            spot_id=cin.spot_id,
            spot_name=cin.spot_name or "",
        )
        db.add(cert)

    db.commit()
    db.refresh(att)
    if cert:
        db.refresh(cert)

    return _attempt_to_response(att, cert, pass_min)


@router.get("/api/study/quiz/attempt/{attempt_id}")
def study_quiz_attempt_detail(attempt_id: str, db: DbSession, user: CurrentUser) -> Any:
    settings = get_settings()
    pass_min = max(1, min(max_score(), int(settings.study_quiz_pass_min_score)))
    att = db.query(StudyQuizAttempt).filter(StudyQuizAttempt.id == attempt_id.strip()).first()
    if not att or att.user_id != user.id:
        raise HTTPException(status_code=404, detail="答题记录不存在")
    cert = (
        db.query(StudyQuizCertificate).filter(StudyQuizCertificate.quiz_attempt_id == att.id).first()
    )
    return _attempt_to_response(att, cert, pass_min)


@router.get("/api/study/certificate/{cert_id}")
def study_certificate_detail(cert_id: str, db: DbSession, user: CurrentUser) -> Any:
    c = db.query(StudyQuizCertificate).filter(StudyQuizCertificate.id == cert_id.strip()).first()
    if not c or c.user_id != user.id:
        raise HTTPException(status_code=404, detail="证书不存在")
    cin = db.query(StudyCheckinRecord).filter(StudyCheckinRecord.id == c.checkin_record_id).first()
    checked_at = cin.checked_at.isoformat() + "Z" if cin and cin.checked_at else ""
    return {
        "id": c.id,
        "certNo": c.cert_no,
        "nickname": c.nickname,
        "spotId": c.spot_id,
        "spotName": c.spot_name or (cin.spot_name if cin else ""),
        "checkinAt": checked_at,
        "issuedAt": c.issued_at.isoformat() + "Z",
        "title": "信阳毛尖文化研学 · 电子证书",
    }
