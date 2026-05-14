"""
Posture Analysis Microservice
Receives landmark data from frontend and returns posture score + feedback.
Uses angle-based analysis without requiring a live camera feed here
(MediaPipe runs in the browser via JS; this service does the math).
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import math

app = Flask(__name__)
CORS(app)


# ─── Helper: calculate angle between three points ───────────────────────────

def calc_angle(a, b, c):
    """
    Returns the angle (degrees) at point B given points A, B, C.
    Each point is a dict: {"x": float, "y": float}
    """
    ba = (a["x"] - b["x"], a["y"] - b["y"])
    bc = (c["x"] - b["x"], c["y"] - b["y"])

    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)

    if mag_ba == 0 or mag_bc == 0:
        return 0.0

    cos_angle = max(-1, min(1, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


# ─── Exercise-specific analysis functions ────────────────────────────────────

def analyze_sitting(lm):
    """
    Sitting posture: check neck, spine, shoulder symmetry.
    Landmarks: nose(0), left_shoulder(11), right_shoulder(12),
               left_hip(23), right_hip(24), left_ear(7), right_ear(8)
    """
    score = 100
    feedback = []

    # Shoulder balance: y-difference
    shoulder_diff = abs(lm[11]["y"] - lm[12]["y"])
    if shoulder_diff > 0.05:
        score -= 20
        feedback.append("Keep shoulders level")

    # Neck angle: ear → shoulder → hip
    neck_angle = calc_angle(lm[7], lm[11], lm[23])
    if neck_angle < 150:
        score -= 15
        feedback.append("Avoid leaning your neck forward")

    # Spine: left shoulder → left hip vertical alignment
    spine_lean = abs(lm[11]["x"] - lm[23]["x"])
    if spine_lean > 0.08:
        score -= 15
        feedback.append("Straighten your spine")

    return max(0, score), feedback


def analyze_standing(lm):
    """
    Standing posture: check hip alignment, shoulder level, overall balance.
    """
    score = 100
    feedback = []

    shoulder_diff = abs(lm[11]["y"] - lm[12]["y"])
    if shoulder_diff > 0.04:
        score -= 20
        feedback.append("Keep shoulders level")

    hip_diff = abs(lm[23]["y"] - lm[24]["y"])
    if hip_diff > 0.04:
        score -= 20
        feedback.append("Keep hips level")

    # Spine lean: nose → mid-hip horizontal offset
    mid_hip_x = (lm[23]["x"] + lm[24]["x"]) / 2
    spine_offset = abs(lm[0]["x"] - mid_hip_x)
    if spine_offset > 0.1:
        score -= 15
        feedback.append("Stand up straight, avoid leaning")

    return max(0, score), feedback


def analyze_squat(lm):
    """
    Squat: check knee alignment with toes, back straightness, squat depth.
    Landmarks used: hip(23/24), knee(25/26), ankle(27/28)
    """
    score = 100
    feedback = []

    # Left knee angle
    knee_angle_l = calc_angle(lm[23], lm[25], lm[27])
    # Right knee angle
    knee_angle_r = calc_angle(lm[24], lm[26], lm[28])

    # Good squat: knee angle ~90°
    avg_knee = (knee_angle_l + knee_angle_r) / 2
    if avg_knee > 130:
        score -= 15
        feedback.append("Go deeper — bend your knees more")
    elif avg_knee < 70:
        score -= 10
        feedback.append("Don't over-squat — reduce knee bend")

    # Knee-ankle alignment: knee x should be close to ankle x
    knee_ankle_diff_l = abs(lm[25]["x"] - lm[27]["x"])
    if knee_ankle_diff_l > 0.06:
        score -= 20
        feedback.append("Align knees with ankles — don't let them cave in")

    return max(0, score), feedback


def analyze_plank(lm):
    """
    Plank: body should form a straight line shoulder → hip → ankle.
    """
    score = 100
    feedback = []

    # Shoulder → hip → knee angle (should be ~180° for straight line)
    body_angle = calc_angle(lm[11], lm[23], lm[25])
    deviation = abs(180 - body_angle)

    if deviation > 15:
        score -= 25
        feedback.append("Keep your body in a straight line — don't sag your hips")
    elif deviation > 8:
        score -= 10
        feedback.append("Tighten your core to maintain plank alignment")

    # Head position: ear should align with shoulder
    head_forward = lm[7]["x"] - lm[11]["x"]
    if abs(head_forward) > 0.06:
        score -= 10
        feedback.append("Keep your head neutral — don't drop or lift it")

    return max(0, score), feedback


ANALYZERS = {
    "SITTING": analyze_sitting,
    "STANDING": analyze_standing,
    "SQUAT": analyze_squat,
    "PLANK": analyze_plank,
}


# ─── API Endpoint ─────────────────────────────────────────────────────────────

@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Expects JSON body:
    {
      "exerciseType": "SITTING",
      "landmarks": [ {"x": float, "y": float, "z": float, "visibility": float}, ... ]
    }
    Returns:
    {
      "score": float (0-100),
      "feedback": ["..."],
      "angles": { ... }
    }
    """
    body = request.get_json()
    exercise = body.get("exerciseType", "SITTING").upper()
    landmarks = body.get("landmarks", [])

    if len(landmarks) < 29:
        return jsonify({"error": "Insufficient landmarks"}), 400

    analyzer = ANALYZERS.get(exercise, analyze_sitting)
    score, feedback = analyzer(landmarks)

    # Calculate some angles for logging
    angles = {}
    if len(landmarks) >= 28:
        angles["left_knee"] = round(calc_angle(landmarks[23], landmarks[25], landmarks[27]), 1)
        angles["right_knee"] = round(calc_angle(landmarks[24], landmarks[26], landmarks[28]), 1)
        angles["neck"] = round(calc_angle(landmarks[7], landmarks[11], landmarks[23]), 1)

    return jsonify({
        "score": round(score, 1),
        "feedback": feedback if feedback else ["Good posture! Keep it up."],
        "angles": angles
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
