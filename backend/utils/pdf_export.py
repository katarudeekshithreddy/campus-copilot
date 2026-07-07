import os
from fpdf import FPDF
from datetime import datetime

class PDFReport(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 15)
        self.cell(0, 10, "Campus Copilot - Session Report", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("helvetica", "I", 10)
        self.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def generate_pdf_report(messages, metrics, output_path="campus_copilot_report.pdf"):
    pdf = PDFReport()
    pdf.add_page()
    
    # Dashboard Metrics Section
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Your Progress Dashboard", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, f"Roadmaps Generated: {metrics.get('roadmaps_generated', 0)}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Resumes Reviewed: {metrics.get('resumes_reviewed', 0)}", new_x="LMARGIN", new_y="NEXT")
    
    scores = metrics.get('interview_scores', [])
    avg_score = sum(scores)/len(scores) if scores else 0.0
    pdf.cell(0, 8, f"Avg Interview Score: {avg_score:.1f}/10", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    
    # Chat History Section
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Session Transcript", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    
    for msg in messages:
        role = "Student" if msg["role"] == "user" else "Copilot"
        
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(0, 102, 204) if role == "Copilot" else pdf.set_text_color(0, 153, 76)
        pdf.cell(0, 8, f"{role}:", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("helvetica", "", 11)
        pdf.set_text_color(0, 0, 0)
        
        # FPDF doesn't render raw markdown, so we encode and clean it simply
        content = msg["content"].replace('**', '').replace('*', '').replace('#', '')
        
        # Write content with word wrap
        pdf.multi_cell(0, 6, content)
        pdf.ln(4)
        
    pdf.output(output_path)
    return output_path
