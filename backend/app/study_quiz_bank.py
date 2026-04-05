"""信阳毛尖研学固定题库（判分与脱敏展示）。"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

# 完整题库（含答案与解析）；对外接口需 strip 答案
XYMJ_QUESTIONS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "type": "single",
        "question": "信阳毛尖属于哪一类茶？",
        "options": ["绿茶", "红茶", "乌龙茶", "黑茶"],
        "answer": "绿茶",
        "analysis": "信阳毛尖属于未发酵的绿茶，是中国十大名茶之一。",
    },
    {
        "id": 2,
        "type": "single",
        "question": "信阳毛尖的核心产区位于河南省哪个市？",
        "options": ["南阳市", "信阳市", "驻马店市", "洛阳市"],
        "answer": "信阳市",
        "analysis": "信阳毛尖因原产于河南省信阳市而得名，核心产区包括浉河港、董家河等乡镇。",
    },
    {
        "id": 3,
        "type": "single",
        "question": "以下哪一项是信阳毛尖的品质特征？",
        "options": ["红汤红叶", "清汤绿叶", "黄汤黄叶", "黑汤黑叶"],
        "answer": "清汤绿叶",
        "analysis": "信阳毛尖干茶细圆紧直、色泽翠绿，冲泡后汤色清澈明亮、叶底嫩绿匀整，具有清汤绿叶的典型特征。",
    },
]


def questions_for_client() -> List[Dict[str, Any]]:
    """不含标准答案与解析，供小程序展示。"""
    out: List[Dict[str, Any]] = []
    for q in XYMJ_QUESTIONS:
        out.append(
            {
                "id": q["id"],
                "type": q["type"],
                "question": q["question"],
                "options": list(q["options"]),
            }
        )
    return out


def max_score() -> int:
    return len(XYMJ_QUESTIONS)


def grade_answers(raw: Dict[str, Any]) -> Tuple[int, List[Dict[str, Any]]]:
    """
    raw: {"1": "绿茶", "2": "信阳市", ...} 键为题目 id 字符串。
    返回 (得分, 每题明细)。
    """
    results: List[Dict[str, Any]] = []
    score = 0
    for q in XYMJ_QUESTIONS:
        qid = str(q["id"])
        correct = str(q["answer"]).strip()
        user_val = raw.get(qid)
        if user_val is None:
            user_val = raw.get(q["id"])  # type: ignore[arg-type]
        user_ans = (str(user_val).strip() if user_val is not None else "")
        ok = user_ans == correct
        if ok:
            score += 1
        results.append(
            {
                "questionId": q["id"],
                "question": q["question"],
                "correct": ok,
                "yourAnswer": user_ans or "（未作答）",
                "correctAnswer": correct,
                "analysis": q.get("analysis", ""),
            }
        )
    return score, results
