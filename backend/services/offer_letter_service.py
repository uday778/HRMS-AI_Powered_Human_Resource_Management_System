import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import smtplib
import logging
import io
from datetime import datetime, date
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from sqlalchemy.orm import Session

import models
from config import settings
from ai_service import groq_chat

logger = logging.getLogger(__name__)


# ─── AI Offer Letter Generation ──────────────────────────────────────────────

def generate_offer_letter_ai(
    candidate_name: str,
    role: str,
    department: str,
    salary: float,
    joining_date: str,
    company_name: str = "Our Company",
    template_content: Optional[str] = None,
) -> str:
    base_template = template_content or """
Dear {candidate_name},

We are pleased to extend this offer of employment for the position of {role} in our {department} department.

COMPENSATION & BENEFITS
- Annual Salary: {salary}
- Start Date: {joining_date}
- Employment Type: Full-Time

TERMS
This offer is contingent upon successful completion of background verification.
Please confirm acceptance within 5 business days.

We look forward to welcoming you to our team.

Warm regards,
HR Department
{company_name}
"""

    prompt = f"""Generate a professional, formal job offer letter.

Template:
{base_template}

Candidate Details:
- Candidate Name: {candidate_name}
- Role/Designation: {role}
- Department: {department}
- Annual Salary: ₹{salary:,.0f} per annum
- Joining Date: {joining_date}
- Company Name: {company_name}
- Letter Date: {datetime.today().strftime('%B %d, %Y')}

Requirements:
- Use formal HR tone throughout
- Replace ALL placeholders with actual values
- Add professional greeting and closing
- Include clear sections for compensation, terms, and next steps
- Make it warm yet professional
- Do NOT include any JSON, markdown, or code blocks
- Return ONLY the final formatted offer letter text
- Start directly with "Dear {candidate_name},"
"""
    return groq_chat([{"role": "user", "content": prompt}], temperature=0.4)


# ─── PDF Generation ──────────────────────────────────────────────────────────

def generate_pdf(content: str, candidate_name: str, company_name: str = "HRMS Company") -> bytes:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.8 * inch,
            leftMargin=0.8 * inch,
            topMargin=0.8 * inch,
            bottomMargin=0.8 * inch,
        )

        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Normal'],
            fontSize=18,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#6366f1'),
            alignment=TA_CENTER,
            spaceAfter=4,
        )
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            textColor=colors.HexColor('#64748b'),
            alignment=TA_CENTER,
            spaceAfter=2,
        )
        heading_style = ParagraphStyle(
            'Heading',
            parent=styles['Normal'],
            fontSize=13,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#1e1b4b'),
            alignment=TA_CENTER,
            spaceBefore=12,
            spaceAfter=8,
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            textColor=colors.HexColor('#334155'),
            leading=16,
            alignment=TA_JUSTIFY,
            spaceBefore=4,
            spaceAfter=4,
        )
        date_style = ParagraphStyle(
            'Date',
            parent=styles['Normal'],
            fontSize=9,
            fontName='Helvetica',
            textColor=colors.HexColor('#64748b'),
            alignment=TA_LEFT,
            spaceAfter=12,
        )

        story = []

        # Header
        story.append(Paragraph(company_name.upper(), title_style))
        story.append(Paragraph("Human Resources Department", subtitle_style))
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#6366f1')))
        story.append(Spacer(1, 6))
        story.append(Paragraph("OFFER OF EMPLOYMENT", heading_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"Date: {datetime.today().strftime('%B %d, %Y')}", date_style))

        # Content paragraphs
        paragraphs = content.strip().split('\n')
        for para in paragraphs:
            para = para.strip()
            if not para:
                story.append(Spacer(1, 6))
                continue
            if para.isupper() and len(para) < 60:
                story.append(Spacer(1, 6))
                section_style = ParagraphStyle(
                    'Section',
                    parent=styles['Normal'],
                    fontSize=10,
                    fontName='Helvetica-Bold',
                    textColor=colors.HexColor('#6366f1'),
                    spaceBefore=8,
                    spaceAfter=4,
                )
                story.append(Paragraph(para, section_style))
            elif para.startswith('-') or para.startswith('•'):
                bullet_style = ParagraphStyle(
                    'Bullet',
                    parent=body_style,
                    leftIndent=20,
                    bulletIndent=10,
                )
                story.append(Paragraph(f"• {para.lstrip('-•').strip()}", bullet_style))
            else:
                story.append(Paragraph(para.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'), body_style))

        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        story.append(Spacer(1, 6))

        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#94a3b8'),
            alignment=TA_CENTER,
        )
        story.append(Paragraph(f"This is an official document issued by {company_name} HR Department", footer_style))
        story.append(Paragraph(f"Generated on {datetime.today().strftime('%B %d, %Y')} | Confidential", footer_style))

        doc.build(story)
        return buffer.getvalue()

    except ImportError:
        # Fallback: simple text-based PDF using fpdf2
        try:
            from fpdf import FPDF
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font('Helvetica', 'B', 16)
            pdf.set_text_color(99, 102, 241)
            pdf.cell(0, 10, company_name.upper(), ln=True, align='C')
            pdf.set_font('Helvetica', '', 10)
            pdf.set_text_color(100, 116, 139)
            pdf.cell(0, 6, 'OFFER OF EMPLOYMENT', ln=True, align='C')
            pdf.ln(4)
            pdf.set_draw_color(99, 102, 241)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(6)
            pdf.set_font('Helvetica', '', 10)
            pdf.set_text_color(51, 65, 85)
            for line in content.split('\n'):
                if line.strip():
                    pdf.multi_cell(0, 6, line.strip())
                else:
                    pdf.ln(3)
            return pdf.output(dest='S').encode('latin-1')
        except ImportError:
            # Pure bytes fallback
            return content.encode('utf-8')


# ─── Email Sending ────────────────────────────────────────────────────────────

def send_offer_email(
    to_email: str,
    candidate_name: str,
    role: str,
    company_name: str,
    offer_content: str,
    pdf_bytes: Optional[bytes] = None,
    joining_date: str = "",
):
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping offer letter email")
        return False

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f0f4ff;
    padding: 30px 10px;
    color: #334155;
  }}
  .wrapper {{
    max-width: 620px;
    margin: auto;
  }}
  .header {{
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 16px 16px 0 0;
    padding: 40px 40px 30px;
    text-align: center;
  }}
  .header .logo {{
    font-size: 28px;
    font-weight: 800;
    color: white;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }}
  .header .tagline {{
    font-size: 13px;
    color: rgba(255,255,255,0.7);
  }}
  .badge {{
    display: inline-block;
    background: rgba(255,255,255,0.15);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 14px;
    border-radius: 20px;
    margin-top: 14px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }}
  .body {{
    background: white;
    padding: 40px;
  }}
  .greeting {{
    font-size: 22px;
    font-weight: 700;
    color: #1e1b4b;
    margin-bottom: 6px;
  }}
  .greeting span {{
    color: #6366f1;
  }}
  .sub {{
    font-size: 14px;
    color: #64748b;
    margin-bottom: 28px;
  }}
  .divider {{
    border: none;
    border-top: 2px solid #f1f5f9;
    margin: 24px 0;
  }}
  .info-card {{
    background: linear-gradient(135deg, #f5f3ff, #ede9fe);
    border: 1px solid #ddd6fe;
    border-radius: 12px;
    padding: 24px;
    margin: 24px 0;
  }}
  .info-card h3 {{
    font-size: 13px;
    font-weight: 700;
    color: #7c3aed;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }}
  .info-row {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(139,92,246,0.15);
    font-size: 14px;
  }}
  .info-row:last-child {{ border-bottom: none; }}
  .info-label {{ color: #64748b; font-weight: 500; }}
  .info-value {{ color: #1e1b4b; font-weight: 600; }}
  .cta {{
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    text-align: center;
    padding: 16px 32px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    margin: 28px 0;
    display: block;
    text-decoration: none;
  }}
  .steps {{
    margin: 20px 0;
  }}
  .step {{
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 14px;
  }}
  .step-num {{
    background: #6366f1;
    color: white;
    font-size: 12px;
    font-weight: 700;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }}
  .step-text {{
    font-size: 14px;
    color: #475569;
    line-height: 1.5;
  }}
  .step-text strong {{ color: #1e1b4b; }}
  .message-box {{
    background: #f8fafc;
    border-left: 4px solid #6366f1;
    border-radius: 0 8px 8px 0;
    padding: 16px 20px;
    font-size: 13px;
    color: #475569;
    line-height: 1.7;
    margin: 20px 0;
    font-style: italic;
  }}
  .footer {{
    background: #1e1b4b;
    border-radius: 0 0 16px 16px;
    padding: 28px 40px;
    text-align: center;
  }}
  .footer p {{
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    line-height: 1.7;
  }}
  .footer .company {{
    font-size: 14px;
    font-weight: 700;
    color: white;
    margin-bottom: 8px;
  }}
  .highlight {{
    color: #6366f1;
    font-weight: 700;
  }}
</style>
</head>
<body>
<div class="wrapper">
  <!-- Header -->
  <div class="header">
    <div class="logo">🏢 {company_name}</div>
    <div class="tagline">Human Resources Department</div>
    <div class="badge">✉️ Offer of Employment</div>
  </div>

  <!-- Body -->
  <div class="body">
    <div class="greeting">Congratulations, <span>{candidate_name}!</span> 🎉</div>
    <div class="sub">We are thrilled to extend this offer of employment to you.</div>

    <hr class="divider" />

    <!-- Info Card -->
    <div class="info-card">
      <h3>📋 Your Offer Details</h3>
      <div class="info-row">
        <span class="info-label">👤 Full Name</span>
        <span class="info-value">{candidate_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">💼 Position</span>
        <span class="info-value">{role}</span>
      </div>
      <div class="info-row">
        <span class="info-label">🏢 Company</span>
        <span class="info-value">{company_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📅 Joining Date</span>
        <span class="info-value">{joining_date}</span>
      </div>
    </div>

    <!-- Message -->
    <div class="message-box">
      Please find your detailed offer letter attached as a PDF to this email. 
      Kindly review all the terms carefully and confirm your acceptance at the earliest.
    </div>

    <!-- Next Steps -->
    <div class="steps">
      <p style="font-size:13px; font-weight:700; color:#1e1b4b; margin-bottom:14px; text-transform:uppercase; letter-spacing:0.5px;">📌 Next Steps</p>
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text"><strong>Review the attached offer letter</strong> carefully, including compensation, benefits, and terms of employment.</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text"><strong>Reply to this email</strong> with your acceptance or any questions within 5 business days.</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text"><strong>Prepare your documents</strong> for onboarding: ID proof, educational certificates, and experience letters.</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-text"><strong>Join us on {joining_date}</strong> — our HR team will reach out with onboarding details soon.</div>
      </div>
    </div>

    <hr class="divider" />

    <p style="font-size:14px; color:#475569; line-height:1.7;">
      We believe you will be a fantastic addition to our team and look forward to working with you. 
      If you have any questions, please don't hesitate to reach out to us at 
      <span class="highlight">{settings.HR_EMAIL}</span>.
    </p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="company">{company_name}</div>
    <p>
      This is an official offer letter from {company_name}.<br/>
      Please treat this communication as confidential.<br/>
      © {datetime.today().year} {company_name}. All rights reserved.
    </p>
  </div>
</div>
</body>
</html>
"""

    msg = MIMEMultipart('mixed')
    msg['Subject'] = f"🎉 Congratulations! Your Offer Letter — {role} at {company_name}"
    msg['From'] = f"{company_name} HR <{settings.SMTP_EMAIL}>"
    msg['To'] = to_email

    # HTML body
    msg_alternative = MIMEMultipart('alternative')
    msg_alternative.attach(MIMEText(f"Congratulations {candidate_name}! Please find your offer letter attached.", 'plain'))
    msg_alternative.attach(MIMEText(html_body, 'html'))
    msg.attach(msg_alternative)

    # Attach PDF
    if pdf_bytes:
        pdf_part = MIMEBase('application', 'pdf')
        pdf_part.set_payload(pdf_bytes)
        encoders.encode_base64(pdf_part)
        pdf_part.add_header(
            'Content-Disposition',
            f'attachment; filename="Offer_Letter_{candidate_name.replace(" ", "_")}.pdf"'
        )
        msg.attach(pdf_part)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())
        logger.info(f"Offer letter email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send offer letter to {to_email}: {e}")
        return False


# ─── DB Operations ────────────────────────────────────────────────────────────

def save_offer_letter(
    db: Session,
    candidate_id: int,
    template_id: Optional[int],
    generated_content: str,
    salary: float,
    role: str,
    joining_date: str,
    pdf_path: Optional[str] = None,
) -> models.OfferLetter:
    letter = models.OfferLetter(
        candidate_id=candidate_id,
        template_id=template_id,
        generated_content=generated_content,
        salary=salary,
        role=role,
        joining_date=date.fromisoformat(joining_date) if joining_date else date.today(),
        status=models.OfferLetterStatus.draft,
        pdf_path=pdf_path,
    )
    db.add(letter)
    db.commit()
    db.refresh(letter)
    return letter