import json
import re
from groq import Groq
from config import settings

def get_groq_client():
    return Groq(api_key=settings.GROQ_API_KEY)

def groq_chat(messages: list, model="llama-3.3-70b-versatile", temperature=0.3) -> str:
    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=1500,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"AI service error: {str(e)}"

def generate_employee_bio(name: str, designation: str, department: str, skills: str) -> str:
    prompt = f"""Generate a concise, professional employee bio (2-3 sentences) for:
Name: {name}
Role: {designation}
Department: {department}
Skills: {skills}

Return only the bio text, nothing else."""
    return groq_chat([{"role": "user", "content": prompt}])

def score_resume(resume_text: str, job_description: str, required_skills: str) -> dict:
    prompt = f"""You are an expert HR recruiter. Analyze this resume against the job description.

Job Description:
{job_description}

Required Skills: {required_skills}

Resume:
{resume_text[:3000]}

Return a JSON object with exactly these keys:
{{
  "match_percentage": <number 0-100>,
  "reasoning": "<brief explanation of the score>",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"]
}}

Return ONLY valid JSON, nothing else."""
    
    result = groq_chat([{"role": "user", "content": prompt}])
    try:
        clean = re.sub(r'```json|```', '', result).strip()
        return json.loads(clean)
    except:
        return {
            "match_percentage": 0,
            "reasoning": "Could not parse AI response",
            "strengths": [],
            "gaps": []
        }

def generate_interview_questions(job_title: str, jd: str, strengths: list, gaps: list) -> list:
    prompt = f"""Generate 5 tailored technical interview questions for:
Role: {job_title}
Job Description: {jd[:500]}
Candidate Strengths: {', '.join(strengths)}
Candidate Gaps: {', '.join(gaps)}

Return a JSON array of 5 question strings. ONLY return valid JSON array, nothing else.
Example: ["Question 1?", "Question 2?"]"""
    
    result = groq_chat([{"role": "user", "content": prompt}])
    try:
        clean = re.sub(r'```json|```', '', result).strip()
        questions = json.loads(clean)
        return questions if isinstance(questions, list) else []
    except:
        return ["Tell me about your background.", "What are your key technical skills?",
                "Describe a challenging project.", "How do you handle deadlines?",
                "Where do you see yourself in 5 years?"]

def analyze_leave_patterns(leave_data: list) -> str:
    if not leave_data:
        return "No leave data available to analyze."
    prompt = f"""Analyze these employee leave records and detect unusual patterns (e.g. repeated Mondays/Fridays, extended absences, patterns around holidays):

Leave Records: {json.dumps(leave_data)}

Provide a brief 2-3 sentence analysis. If no unusual patterns, say so clearly."""
    return groq_chat([{"role": "user", "content": prompt}])

def predict_capacity_risk(team_leaves: list, team_size: int) -> str:
    if not team_leaves:
        return "No pending leave requests."
    prompt = f"""Team size: {team_size} employees
Pending/approved leave requests: {json.dumps(team_leaves)}

Assess the capacity risk for the team. Is coverage adequate? Any critical gaps?
Provide a 2-sentence risk assessment."""
    return groq_chat([{"role": "user", "content": prompt}])

def generate_performance_summary(self_review: dict, manager_review: dict, employee_name: str) -> dict:
    self_avg = self_review.get("rating", 3)
    mgr_avg = (manager_review.get("quality", 3) + manager_review.get("delivery", 3) +
               manager_review.get("communication", 3) + manager_review.get("initiative", 3) +
               manager_review.get("teamwork", 3)) / 5

    mismatch = abs(self_avg - mgr_avg) > 1.5

    prompt = f"""Generate a professional performance review summary for {employee_name}.

Employee Self-Assessment:
- Achievements: {self_review.get('achievements', '')}
- Challenges: {self_review.get('challenges', '')}
- Goals for next period: {self_review.get('goals_next', '')}
- Self-rating: {self_avg}/5

Manager Assessment:
- Quality: {manager_review.get('quality')}/5
- Delivery: {manager_review.get('delivery')}/5
- Communication: {manager_review.get('communication')}/5
- Initiative: {manager_review.get('initiative')}/5
- Teamwork: {manager_review.get('teamwork')}/5
- Manager Average: {mgr_avg:.1f}/5
- Manager Comments: {manager_review.get('comments', '')}

Return a JSON object with:
{{
  "summary": "<2-3 paragraph balanced professional review summary>",
  "mismatch_flag": <true/false>,
  "mismatch_note": "<explain rating mismatch if any, else empty string>",
  "development_actions": ["action1", "action2", "action3"]
}}

Return ONLY valid JSON."""
    
    result = groq_chat([{"role": "user", "content": prompt}])
    try:
        clean = re.sub(r'```json|```', '', result).strip()
        return json.loads(clean)
    except:
        return {
            "summary": "Performance review generated. Please review manually.",
            "mismatch_flag": mismatch,
            "mismatch_note": "Rating mismatch detected." if mismatch else "",
            "development_actions": ["Continue professional development", "Set SMART goals", "Seek regular feedback"]
        }

def chatbot_answer(question: str, context_docs: str, hr_email: str) -> str:
    prompt = f"""You are an HR assistant chatbot. Answer ONLY using the provided context documents.
If the answer is not found in the context, respond exactly with: "I don't have information on that. Please contact HR at {hr_email}"

Context Documents:
{context_docs[:4000]}

Employee Question: {question}

Provide a helpful, concise answer based solely on the context above."""
    return groq_chat([{"role": "user", "content": prompt}], temperature=0.1)

def generate_hr_insights(stats: dict) -> str:
    prompt = f"""Generate a professional monthly HR insights report based on these metrics:

{json.dumps(stats, indent=2)}

Write a 3-4 paragraph executive summary covering:
1. Key highlights (headcount, growth)
2. Risks and concerns (attrition, leave utilization)
3. Recommended HR actions for next month

Keep it concise and actionable."""
    return groq_chat([{"role": "user", "content": prompt}])
