"""
generate_sports_report_docx.py
Generates the comprehensive National Engineering College (NEC) Sports Management System Project Report (.docx)
following the exact revised template and 8-step modular System Design structure from Store_Management_System_Report_Revised.docx.
"""

import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def set_cell_background(cell, fill_hex):
    """Sets background color of a table cell."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell padding in twips."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    """Sets subtle clean borders on a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def format_table(table, col_widths, headers, rows_data, header_bg="1E3A8A", alt_bg="F8FAFC"):
    """Formats a table with header styling, column widths, and alternating rows."""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)
    
    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], header_bg)
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=130, right=130)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = 'Calibri'
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            
    # Data Rows
    for r_idx, row_data in enumerate(rows_data):
        row = table.add_row()
        cells = row.cells
        bg = alt_bg if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            cells[c_idx].text = str(val)
            set_cell_background(cells[c_idx], bg)
            set_cell_margins(cells[c_idx], top=75, bottom=75, left=130, right=130)
            p = cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(30, 41, 59)
                
    # Apply Column Widths
    for row in table.rows:
        for i, w in enumerate(col_widths):
            row.cells[i].width = Inches(w)

def add_chapter_heading(doc, chapter_num_str, title_str):
    """Adds Chapter heading matching the template."""
    p_num = doc.add_paragraph()
    p_num.paragraph_format.space_before = Pt(28)
    p_num.paragraph_format.space_after = Pt(2)
    p_num.paragraph_format.keep_with_next = True
    r_num = p_num.add_run(chapter_num_str.upper())
    r_num.font.name = 'Calibri'
    r_num.font.size = Pt(12)
    r_num.font.bold = True
    r_num.font.color.rgb = RGBColor(71, 85, 105)
    
    p_title = doc.add_paragraph()
    p_title.style = 'Heading 1'
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(14)
    p_title.paragraph_format.keep_with_next = True
    r_title = p_title.add_run(title_str.upper())
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(18)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(15, 23, 42)

def add_h2(doc, text):
    """Adds Heading 2."""
    p = doc.add_paragraph()
    p.style = 'Heading 2'
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 58, 138)
    return p

def add_h3(doc, text):
    """Adds Heading 3."""
    p = doc.add_paragraph()
    p.style = 'Heading 3'
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(11)
    run.font.bold = True
    run.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_p(doc, text, bold_prefix=None, space_after=6):
    """Adds regular paragraph with optional bold prefix."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Calibri'
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_bullet(doc, text, bold_prefix=None):
    """Adds bullet item with optional bold prefix."""
    p = doc.add_paragraph(style='List Paragraph')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix + " ")
        r_pre.font.name = 'Calibri'
        r_pre.font.size = Pt(10)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_figure_caption(doc, fig_id, caption_text):
    """Adds a standardized figure placeholder and caption."""
    p_box = doc.add_paragraph()
    p_box.paragraph_format.space_before = Pt(8)
    p_box.paragraph_format.space_after = Pt(2)
    p_box.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_box = p_box.add_run(f"[{fig_id} Architectural Diagram / Interface Screenshot Placeholder]")
    r_box.font.name = 'Calibri'
    r_box.font.size = Pt(9)
    r_box.font.italic = True
    r_box.font.color.rgb = RGBColor(100, 116, 139)
    
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(12)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"Fig {fig_id} {caption_text}")
    run.font.name = 'Calibri'
    run.font.size = Pt(9.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 41, 59)

def build_document():
    doc = Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
    print("Building Title and Preliminaries...")
    
    # Title Block
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(40)
    p_title.paragraph_format.space_after = Pt(8)
    r = p_title.add_run("NATIONAL ENGINEERING COLLEGE\n(An Autonomous Institution - Affiliated to Anna University Chennai)\nK.R. NAGAR, KOVILPATTI - 628 503")
    r.font.name = 'Calibri'
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    p_proj = doc.add_paragraph()
    p_proj.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_proj.paragraph_format.space_before = Pt(36)
    p_proj.paragraph_format.space_after = Pt(12)
    r2 = p_proj.add_run("SPORTS MANAGEMENT SYSTEM\nPROJECT REPORT")
    r2.font.name = 'Calibri'
    r2.font.size = Pt(20)
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(30, 58, 138)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(10)
    p_sub.paragraph_format.space_after = Pt(40)
    r3 = p_sub.add_run("A Unified Web Platform for Inter-Departmental Sports Administration, Dynamic Tournament Fixtures, Live Multi-Sport Scoring, and Automated Student On-Duty (OD) Workflows")
    r3.font.name = 'Calibri'
    r3.font.size = Pt(11)
    r3.font.italic = True
    r3.font.color.rgb = RGBColor(71, 85, 105)
    
    p_dept = doc.add_paragraph()
    p_dept.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dept.paragraph_format.space_before = Pt(60)
    p_dept.paragraph_format.space_after = Pt(10)
    r4 = p_dept.add_run("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING\nDEPARTMENT OF PHYSICAL EDUCATION\nNATIONAL ENGINEERING COLLEGE, KOVILPATTI")
    r4.font.name = 'Calibri'
    r4.font.size = Pt(11)
    r4.font.bold = True
    r4.font.color.rgb = RGBColor(15, 23, 42)
    
    doc.add_page_break()
    
    # ABSTRACT
    p_abs_h = doc.add_paragraph()
    p_abs_h.style = 'Heading 1'
    p_abs_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_abs_h.add_run("ABSTRACT")
    r.font.name = 'Calibri'
    r.font.size = Pt(16)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    add_p(doc, "Collegiate sports administration in large academic institutions encompasses complex workflows including multi-tier student team formation, tournament bracket scheduling, ground/venue allocation, live multi-sport scorekeeping, match attendance verification, and academic on-duty (OD) approval management. Historically, these processes have operated through manual physical paperwork, fragmented messaging channels, and delayed offline record keeping, resulting in administrative latency, scheduling collisions, ineligible athlete participation, and delayed academic attendance reconciliation.")
    add_p(doc, "The National Engineering College (NEC) Sports Management System resolves these challenges through a centralized, high-performance web platform built on a decoupled architecture comprising React.js (Vite), Node.js/Express REST services, and a canonical MySQL 8.0 relational database. The platform implements granular Role-Based Access Control (RBAC) across six user tiers (Admin, Sports President, Staff Coordinator, Team Captain, Score Updater, and Student Player) fortified by cryptographic password hashing (bcryptjs), stateless JWT authentication with token versioning for instant revocation, and automated double-submit CSRF protection.")
    add_p(doc, "Key operational modules include a dynamic tournament scheduler with round-robin and knockout support, multi-sport live scoring engines (Cricket, Football, Basketball, Volleyball, and Generic Track/Field events), an automated two-phase Student On-Duty (OD) approval pipeline with cryptographic verification codes and PDF generation, and an open public portal offering live score tickers, departmental leaderboards, and media galleries. Rigorous architectural modeling, schema design, and modular API contracts ensure data consistency, high availability, sub-second transaction latency, and comprehensive auditability.")
    
    doc.add_page_break()
    
    # TABLE OF CONTENTS
    p_toc_h = doc.add_paragraph()
    p_toc_h.style = 'Heading 1'
    p_toc_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_toc_h.add_run("TABLE OF CONTENTS")
    r.font.name = 'Calibri'
    r.font.size = Pt(16)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    toc_data = [
        ["CHAPTER 1", "INTRODUCTION", "1"],
        ["", "1.1 Background and Motivation", "1"],
        ["", "1.2 Problem Statement & Current Challenges", "2"],
        ["", "1.3 Purpose & Scope of the System", "3"],
        ["", "1.4 Target Audience & Stakeholders", "4"],
        ["CHAPTER 2", "OBJECTIVES", "5"],
        ["", "2.1 Primary Objectives", "5"],
        ["", "2.2 Functional Goals", "6"],
        ["", "2.3 Non-Functional & Security Goals", "7"],
        ["CHAPTER 3", "SYSTEM DESCRIPTION", "8"],
        ["", "3.1 Existing Manual System Analysis & Limitations", "8"],
        ["", "3.2 Proposed System Architecture & Core Advantages", "9"],
        ["", "3.3 Hardware Requirements", "10"],
        ["", "3.4 Software Requirements & Specifications", "11"],
        ["", "3.5 Feasibility Study (Technical, Operational, Economic)", "12"],
        ["CHAPTER 4", "CLASS DIAGRAM & ARCHITECTURAL PATTERNS", "13"],
        ["", "4.1 Layered MVC Architectural Pattern", "13"],
        ["", "4.2 Class / Controller-Model Relationships", "14"],
        ["", "4.3 Key Controller & Service Classes Specification", "15"],
        ["CHAPTER 5", "DATABASE TABLE STRUCTURES", "17"],
        ["", "5.1 Canonical MySQL Relational Schema Dictionary", "17"],
        ["", "5.2 Table Specifications (20 Relational Models)", "18"],
        ["CHAPTER 6", "ER DIAGRAM", "25"],
        ["", "6.1 High-Level Entity Overview", "25"],
        ["", "6.2 Entity Relationships & Cardinalities", "26"],
        ["", "6.3 Integrity Constraints & Cascade Policies", "27"],
        ["CHAPTER 7", "TECH STACK & ARCHITECTURE OVERVIEW", "28"],
        ["", "7.1 Tech Stack Justification", "28"],
        ["", "7.2 System Architecture Overview & Request Lifecycle", "30"],
        ["CHAPTER 8", "MODULES & SYSTEM DESIGN", "32"],
        ["", "8.0 Design Approach & Shared Architectural Baseline", "32"],
        ["", "8.1 Folder Structure (Backend & Frontend)", "35"],
        ["", "8.2 User Authentication & Access Control (RBAC)", "37"],
        ["", "8.3 Master Data & Facilities Management", "43"],
        ["", "8.4 Tournament & Fixture Management", "48"],
        ["", "8.5 Team, Squad & Roster Management", "53"],
        ["", "8.6 Live Scoring & Multi-Sport Match Operations", "58"],
        ["", "8.7 Student On-Duty (OD) & Official Document Workflow", "64"],
        ["", "8.8 Match Attendance & Participation Tracking", "69"],
        ["", "8.9 Public Portal, Leaderboard & Media Gallery", "74"],
        ["", "8.10 Executive Dashboards, Analytics & Reporting", "79"],
        ["CHAPTER 9", "CONCLUSION & FUTURE ENHANCEMENTS", "85"],
        ["", "9.1 Summary of Deliverables & Achievements", "85"],
        ["", "9.2 Performance, Security & Usability Outcomes", "86"],
        ["", "9.3 Future Roadmap & Enhancements", "87"]
    ]
    
    t_toc = doc.add_table(rows=1, cols=3)
    format_table(t_toc, [1.5, 4.5, 0.6], ["Section", "Title", "Page"], toc_data, header_bg="334155")
    
    doc.add_page_break()
    
    # -------------------------------------------------------------
    # CHAPTER 1: INTRODUCTION
    # -------------------------------------------------------------
    print("Writing Chapter 1: Introduction...")
    add_chapter_heading(doc, "CHAPTER 1", "INTRODUCTION")
    
    add_h2(doc, "1.1 Background and Motivation")
    add_p(doc, "National Engineering College (NEC), Kovilpatti, fosters a vibrant sports culture comprising multiple inter-departmental tournaments, zonal collegiate leagues, and state-level athletic competitions across more than 25 sports disciplines. Managing sports at this collegiate scale involves numerous interconnected operations: organizing academic department teams, verifying student player eligibility, allocating physical grounds and courts, publishing match fixtures, conducting live scorekeeping, certifying student match attendance, and processing academic On-Duty (OD) attendance exemptions.")
    add_p(doc, "Traditionally, educational institutions have relied upon manual paperwork, physical notice boards, and informal messaging groups to handle these responsibilities. Such manual workflows create significant administrative friction, delay information dissemination to students and faculty, cause scheduling overlaps on college grounds, and complicate the formal verification of student attendance for academic credits. The Sports Management System was engineered to eliminate these bottlenecks by establishing a unified, automated, and tamper-resistant digital infrastructure.")

    add_h2(doc, "1.2 Problem Statement & Current Challenges")
    add_p(doc, "The physical and semi-digital legacy workflows previously employed exhibited several critical limitations:")
    add_bullet(doc, "Student eligibility was verified through physical roll calls and paper indent forms, leading to unauthorized substitutions and administrative overhead.", "Fragmented Player Verification:")
    add_bullet(doc, "Ground allocations and fixture schedules frequently resulted in double-booking of collegiate facilities due to disconnected scheduling sheets.", "Scheduling Collisions & Lack of Visibility:")
    add_bullet(doc, "Scores and match outcomes were recorded on physical score sheets and published hours or days later, denying students and spectators live engagement.", "Delayed Score Updates:")
    add_bullet(doc, "Securing OD permissions required student athletes to physically transport paper forms between team captains, staff coordinators, heads of departments (HOD), and physical directors, resulting in lost forms and missed attendance records.", "Cumbersome Academic On-Duty (OD) Process:")
    add_bullet(doc, "The physical education department lacked aggregated digital analytics regarding student participation trends, department performance rankings, and venue utilization rates.", "Absence of Centralized Analytics:")

    add_h2(doc, "1.3 Purpose & Scope of the System")
    add_p(doc, "The Sports Management System delivers a comprehensive web-based enterprise portal that unifies all athletic operations under a single digital umbrella. The platform automates the entire sports lifecycle, from preseason player roster registration to live championship tournament execution, real-time score dissemination, and academic OD approval reconciliation.")
    add_p(doc, "The scope encompasses six role-specific authenticated portals (Admin, Sports President, Staff Coordinator, Team Captain, Score Updater, and Student Player) in addition to an unauthenticated public portal for collegiate spectators and external stakeholders.")

    add_h2(doc, "1.4 Target Audience & Stakeholders")
    add_bullet(doc, "Maintains master catalogs (sports, venues, departments, competition levels), manages user accounts, issues token revocations, and monitors security audit logs.", "System Administrators & Physical Directors:")
    add_bullet(doc, "Monitors campus-wide athletic initiatives, reviews departmental team registrations, and grants final approvals on institutional OD requests.", "Sports President & Executive Council:")
    add_bullet(doc, "Department-level faculty who oversee student athlete rosters, verify match attendances, and endorse OD applications prior to executive sign-off.", "Staff Department Coordinators:")
    add_bullet(doc, "Elected student leaders who assemble squad rosters, nominate starting lineups, and submit initial OD requisitions for team fixtures.", "Team Captains:")
    add_bullet(doc, "Student athletes who monitor match schedules, track individual performance metrics, review verified attendances, and download official OD certificates.", "Student Athletes & Players:")
    add_bullet(doc, "The broader student body, alumni, and external guests who access real-time scoreboards, tournament brackets, points tables, and media galleries.", "General Student Body & Public Spectators:")

    # -------------------------------------------------------------
    # CHAPTER 2: OBJECTIVES
    # -------------------------------------------------------------
    print("Writing Chapter 2: Objectives...")
    add_chapter_heading(doc, "CHAPTER 2", "OBJECTIVES")
    
    add_h2(doc, "2.1 Primary Objectives")
    add_p(doc, "The overarching goal of the Sports Management System is to digitalize, streamline, and secure all collegiate sports administration workflows at National Engineering College through a robust, user-friendly, and highly available web architecture.")

    add_h2(doc, "2.2 Functional Goals")
    add_bullet(doc, "Establish a centralized repository for 4,500+ student academic profiles, 12 academic departments, 25+ sport types, and collegiate sports facilities.", "Automated Master Data Management:")
    add_bullet(doc, "Facilitate online team registration, squad size enforcement based on sport rules, and captain assignments by department coordinators.", "Digital Team & Squad Roster Formation:")
    add_bullet(doc, "Automate tournament bracket generation (knockout, round-robin), venue conflict avoidance, and fixture timetable publication.", "Dynamic Tournament & Fixture Scheduling:")
    add_bullet(doc, "Provide specialized, real-time scoring interfaces for diverse sport disciplines (Cricket, Football, Basketball, Volleyball, and Track & Field).", "Sport-Specific Live Scoring Engines:")
    add_bullet(doc, "Implement a two-phase cryptographic workflow for student athlete On-Duty requisition, staff coordinator endorsement, and executive PDF letter generation.", "Paperless Academic On-Duty (OD) Pipeline:")
    add_bullet(doc, "Deliver instant public access to live match tickers, department leaderboards, photo galleries, and multi-language interface translations.", "Public Engagement & Score Tickers:")

    add_h2(doc, "2.3 Non-Functional & Security Goals")
    add_bullet(doc, "Implement strict Role-Based Access Control (RBAC) with token versioning for instant global session revocation and bcrypt password hashing.", "Zero-Trust Security & RBAC:")
    add_bullet(doc, "Maintain sub-500ms API response times for standard queries and under 50ms for cached public leaderboard and fixture lookups.", "Sub-Second Latency & High Performance:")
    add_bullet(doc, "Guarantee strong data consistency (ACID) across multi-entity operations such as team roster modifications and match score state transitions.", "Strict Relational Data Integrity:")
    add_bullet(doc, "Provide responsive, mobile-first web interfaces optimized for smartphones, tablets, and desktop workstations.", "Universal Accessibility & Responsive UI:")

    # -------------------------------------------------------------
    # CHAPTER 3: SYSTEM DESCRIPTION
    # -------------------------------------------------------------
    print("Writing Chapter 3: System Description...")
    add_chapter_heading(doc, "CHAPTER 3", "SYSTEM DESCRIPTION")
    
    add_h2(doc, "3.1 Existing Manual System Analysis & Limitations")
    add_p(doc, "Prior to the introduction of the Sports Management System, all inter-departmental sports events were orchestrated via manual ledger books and physical memoranda. An audit of this legacy workflow revealed significant operational bottlenecks:")
    
    t_ex = doc.add_table(rows=1, cols=3)
    format_table(t_ex, [1.5, 2.5, 2.6], 
                 ["Dimension", "Legacy Manual System", "Proposed Sports Management System"],
                 [
                     ["Registration", "Physical paper forms submitted to physical education office; prone to data entry errors and lost records.", "Centralized digital roster portal with automatic registration number validation against IMS database."],
                     ["Scheduling", "Handwritten notice board schedules; frequent venue clashes and timing overlaps across sports.", "Automated conflict-aware fixture scheduling with real-time venue status checks and instant notification."],
                     ["Scoring", "Manual paper scorecards compiled hours after match completion; no real-time broadcast.", "Interactive live scoreboards with instant state synchronization and public web ticker updates."],
                     ["OD Processing", "Physical circulars routed manually across 3-4 offices taking 3 to 7 days for approval.", "Automated paperless 2-tier approval pipeline completed in minutes with verifiable QR-coded PDF letters."],
                     ["Analytics", "No historical statistics or aggregated department leaderboard calculations.", "Real-time automated department points tally, win-loss percentages, and individual athlete performance graphs."]
                 ])

    add_h2(doc, "3.2 Proposed System Architecture & Core Advantages")
    add_p(doc, "The proposed system adopts a decoupled, multi-tiered architecture featuring a modern Single Page Application (SPA) frontend developed with React.js and Vite, an asynchronous REST API backend built on Node.js and Express, and a canonical MySQL 8.0 relational database engine.")
    add_p(doc, "Key architectural advantages include:")
    add_bullet(doc, "Decoupled frontend and backend enable independent scaling and maintenance without monolithic deployment overhead.", "Service Separation:")
    add_bullet(doc, "JWT bearer tokens combined with in-database token versioning enable stateless validation across server clusters while supporting instantaneous account revocation.", "Stateless Authentication with Revocation:")
    add_bullet(doc, "Centralized database foreign keys and transactional wrappers (BEGIN / COMMIT / ROLLBACK) ensure that multi-table inserts (such as match results and attendance logs) never leave partial records.", "Transactional Integrity:")

    add_h2(doc, "3.3 Hardware Requirements")
    add_p(doc, "The system operates efficiently on commodity cloud virtual machines and standard institutional server infrastructure:")
    add_bullet(doc, "Quad-Core Intel Xeon / AMD EPYC (2.4 GHz or higher), 8 GB RAM, 50 GB NVMe SSD Storage, 100 Mbps Network Uplink.", "Production Server Environment:")
    add_bullet(doc, "Dual-Core 2.0 GHz CPU, 4 GB RAM, 20 GB Disk Space.", "Minimum Development Server:")
    add_bullet(doc, "Any smartphone, tablet, laptop, or desktop with standard modern web browser capabilities (Chrome, Edge, Firefox, Safari).", "Client Workstations & Mobile Devices:")

    add_h2(doc, "3.4 Software Requirements & Specifications")
    add_bullet(doc, "Ubuntu 22.04 LTS Server / Windows Server 2022.", "Operating System (Server):")
    add_bullet(doc, "Node.js (v18.x or v20.x LTS) with npm package manager.", "Runtime Environment:")
    add_bullet(doc, "Express.js 4.x, bcryptjs, jsonwebtoken, helmet, cors, express-rate-limit, multer, pdfkit.", "Backend Framework & Libraries:")
    add_bullet(doc, "React 18.x, Vite 5.x, React Router v6, Axios, Lucide React, Context API.", "Frontend Framework & Libraries:")
    add_bullet(doc, "MySQL Server 8.0 with InnoDB storage engine.", "Database Management System:")

    add_h2(doc, "3.5 Feasibility Study")
    add_p(doc, "A comprehensive feasibility study confirmed the viability of the project across three critical dimensions:")
    add_bullet(doc, "The chosen stack (React, Node.js, Express, MySQL) utilizes proven, production-grade open-source technologies with vast community support, high execution speed, and comprehensive security libraries.", "Technical Feasibility:")
    add_bullet(doc, "The user interfaces are tailored specifically to the operational hierarchies of academic institutions, requiring negligible training for staff coordinators and student captains.", "Operational Feasibility:")
    add_bullet(doc, "By leveraging zero-license open-source software and existing college server infrastructure, capital and operational expenditure are minimized while delivering substantial labor savings.", "Economic Feasibility:")

    # -------------------------------------------------------------
    # CHAPTER 4: CLASS DIAGRAM & ARCHITECTURE
    # -------------------------------------------------------------
    print("Writing Chapter 4: Class Diagram...")
    add_chapter_heading(doc, "CHAPTER 4", "CLASS DIAGRAM & ARCHITECTURAL PATTERNS")
    
    add_h2(doc, "4.1 Layered MVC Architectural Pattern")
    add_p(doc, "The backend is structured according to an enhanced Layered Model-View-Controller (MVC) paradigm augmented by dedicated Middleware, Service, and Data Access Layers. The Controller layer handles HTTP request sanitization, routing validation, and response formatting, delegating complex business workflows (such as status transitions and PDF generation) to specialized service modules.")
    
    add_figure_caption(doc, "4.1", "Enhanced MVC Layered Architecture & Request Interceptor Flow")

    add_h2(doc, "4.2 Class / Controller-Model Relationships")
    add_p(doc, "The backend comprises 16 dedicated controller classes interacting with 15 SQL domain models. Each controller encapsulates cohesive domain operations:")
    
    t_ctrl = doc.add_table(rows=1, cols=3)
    format_table(t_ctrl, [1.8, 2.2, 2.6],
                 ["Controller Class", "Associated SQL Models", "Core Functional Domain"],
                 [
                     ["authController", "userSqlModel, imsStudentModel", "Authentication, OAuth2 handshakes, token versioning, password resets."],
                     ["sportsController", "sportSqlModel, tournamentSqlModel, eventSqlModel, venueSqlModel", "Sports catalog, collegiate tournament setup, event category configuration, overview analytics."],
                     ["matchController", "matchSqlModel, sportSqlModel, teamSqlModel", "Match scheduling, venue conflict checks, live score updating, state transitions."],
                     ["teamController", "teamSqlModel, studentSqlModel", "Team registrations, squad roster validation, player addition/removal."],
                     ["squadController", "departmentSqlModel, studentSqlModel", "Department sport captain allocation, squad member recruitment, college team nomination."],
                     ["odController", "odSqlModel, matchSqlModel, userSqlModel", "On-Duty request lifecycle, multi-tier endorsements, bulk approvals."],
                     ["officialOdDocController", "officialOdDocModel, odSqlModel", "Official OD PDF letter generation, upload storage, public cryptographic verification."],
                     ["attendanceController", "attendanceSqlModel, matchSqlModel", "Match-day attendance recording, player participation audits."],
                     ["reportsController", "matchSqlModel, teamSqlModel, departmentSqlModel", "Department performance rankings, player tournament statistics, CSV/PDF export."]
                 ])

    # -------------------------------------------------------------
    # CHAPTER 5: TABLE STRUCTURES
    # -------------------------------------------------------------
    print("Writing Chapter 5: Table Structures...")
    add_chapter_heading(doc, "CHAPTER 5", "DATABASE TABLE STRUCTURES")
    
    add_h2(doc, "5.1 Canonical MySQL Relational Schema Dictionary")
    add_p(doc, "The Sports Management System database is implemented in MySQL 8.0 utilizing the InnoDB storage engine to guarantee full ACID compliance, foreign key constraint enforcement, and row-level locking during concurrent match score updates. The canonical schema consists of 20 normalized relational tables.")

    # Table specs
    schema_tables = [
        ("Table 5.1: departments", [
            ["id", "INT", "PK, AUTO_INCREMENT", "Unique department identifier"],
            ["name", "VARCHAR(100)", "NOT NULL, UNIQUE", "Full department name (e.g. Computer Science and Engineering)"],
            ["code", "VARCHAR(10)", "NOT NULL, UNIQUE", "Short department code (e.g. CSE, ECE, MECH)"],
            ["coordinator_user_id", "INT", "FK -> users(id), NULL", "Faculty coordinator assigned to department"],
            ["color_code", "VARCHAR(7)", "DEFAULT '#0056b3'", "Hex color code for UI badges and charts"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Record creation timestamp"]
        ]),
        ("Table 5.2: users", [
            ["id", "INT", "PK, AUTO_INCREMENT", "Unique user account identifier"],
            ["username", "VARCHAR(50)", "NOT NULL, UNIQUE", "Unique login handle / Registration number"],
            ["email", "VARCHAR(100)", "NOT NULL, UNIQUE", "Official institutional or personal email address"],
            ["password_hash", "VARCHAR(255)", "NOT NULL", "Salted bcrypt cryptographic password hash"],
            ["role", "ENUM", "NOT NULL, DEFAULT 'Player'", "Role: Admin, Sports President, Coordinator, Captain, Score Updater, Player"],
            ["admin_scope", "VARCHAR(50)", "NULL", "Sub-scope for scoped administrators"],
            ["token_version", "INT", "NOT NULL, DEFAULT 1", "Session invalidation counter for instant revocation"],
            ["is_active", "TINYINT(1)", "NOT NULL, DEFAULT 1", "Account status flag (1=Active, 0=Disabled)"],
            ["must_change_password", "TINYINT(1)", "DEFAULT 0", "Flag enforcing password change on first login"],
            ["google_linked", "TINYINT(1)", "DEFAULT 0", "OAuth account linkage indicator"],
            ["login_attempts", "INT", "DEFAULT 0", "Failed login counter for brute-force lockout"],
            ["last_login_at", "DATETIME", "NULL", "Timestamp of most recent successful authentication"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Account provisioning timestamp"]
        ]),
        ("Table 5.3: students", [
            ["student_id", "INT", "PK, AUTO_INCREMENT", "Unique student record identifier"],
            ["user_id", "INT", "FK -> users(id), UNIQUE, NULL", "Associated authenticated user account"],
            ["student_name", "VARCHAR(100)", "NOT NULL", "Full student legal name"],
            ["register_number", "VARCHAR(50)", "NOT NULL, UNIQUE", "Institutional academic registration number"],
            ["department_id", "INT", "FK -> departments(id), NOT NULL", "Enrolled academic department"],
            ["batch", "INT", "NULL", "Academic graduating year"],
            ["section", "VARCHAR(10)", "NULL", "Academic classroom section"],
            ["personal_email", "VARCHAR(255)", "NOT NULL", "Student personal email address"],
            ["personal_phone", "VARCHAR(15)", "NULL", "Contact phone number"],
            ["blood_group", "ENUM", "DEFAULT 'O+'", "Blood group for emergency medical readiness"],
            ["student_type", "ENUM", "DEFAULT 'Day-Scholar'", "Residency status (Day-Scholar or Hosteller)"],
            ["medical_fitness", "TINYINT(1)", "DEFAULT 1", "Sports medical clearance flag"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Registration timestamp"]
        ]),
        ("Table 5.4: sports", [
            ["sport_id", "INT", "PK, AUTO_INCREMENT", "Unique sport catalog identifier"],
            ["name", "VARCHAR(100)", "NOT NULL, UNIQUE", "Sport discipline name (e.g. Cricket, Football)"],
            ["category", "VARCHAR(50)", "DEFAULT 'Open'", "Category (Men, Women, Mixed, Open)"],
            ["min_players", "INT", "NOT NULL, DEFAULT 1", "Minimum squad requirement for participation"],
            ["max_players", "INT", "NOT NULL, DEFAULT 15", "Maximum roster size permitted"],
            ["points_rule", "TEXT", "NULL", "JSON structure defining sport scoring and point rules"],
            ["captain_user_id", "INT", "FK -> users(id), NULL", "College-level overall sport captain"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Catalog entry timestamp"]
        ]),
        ("Table 5.5: venues", [
            ["venue_id", "INT", "PK, AUTO_INCREMENT", "Unique sports facility / ground identifier"],
            ["name", "VARCHAR(100)", "NOT NULL, UNIQUE", "Facility name (e.g. Main Ground, Indoor Court 1)"],
            ["location", "VARCHAR(255)", "NULL", "Physical campus location description"],
            ["capacity", "INT", "DEFAULT 500", "Spectator seating capacity"],
            ["status", "ENUM", "DEFAULT 'Available'", "Status: Available, Maintenance, Booked"],
            ["is_external", "TINYINT(1)", "DEFAULT 0", "Flag for external off-campus grounds"],
            ["incharge_user_id", "INT", "FK -> users(id), NULL", "Faculty or staff in-charge of facility"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Facility creation timestamp"]
        ]),
        ("Table 5.6: tournaments", [
            ["tournament_id", "INT", "PK, AUTO_INCREMENT", "Unique tournament championship identifier"],
            ["name", "VARCHAR(255)", "NOT NULL, UNIQUE", "Tournament title (e.g. Annual Intramural Trophy 2026)"],
            ["academic_year", "VARCHAR(20)", "NOT NULL", "Academic session (e.g. 2025-2026)"],
            ["tier", "ENUM", "DEFAULT 'Intramural'", "Tier: Intramural, District, Zonal, Inter-Collegiate, State, National"],
            ["start_date", "DATE", "NOT NULL", "Tournament commencement date"],
            ["end_date", "DATE", "NULL", "Tournament conclusion date"],
            ["status", "ENUM", "DEFAULT 'Upcoming'", "Status: Upcoming, Ongoing, Completed, Cancelled"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Tournament creation timestamp"]
        ]),
        ("Table 5.7: events", [
            ["event_id", "INT", "PK, AUTO_INCREMENT", "Unique event competition identifier"],
            ["tournament_id", "INT", "FK -> tournaments(tournament_id)", "Parent tournament reference"],
            ["sport_id", "INT", "FK -> sports(sport_id)", "Associated sport discipline"],
            ["name", "VARCHAR(255)", "NOT NULL", "Event name (e.g. Men's Inter-Dept Basketball)"],
            ["category", "ENUM", "DEFAULT 'Open'", "Category: Men, Women, Mixed, Open"],
            ["registration_status", "ENUM", "DEFAULT 'Open'", "Status: Open, Closed"],
            ["max_teams", "INT", "DEFAULT 32", "Maximum participating teams allowed"],
            ["rules", "TEXT", "NULL", "Specific tournament event competition rules"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Event creation timestamp"]
        ]),
        ("Table 5.8: teams", [
            ["team_id", "INT", "PK, AUTO_INCREMENT", "Unique team entity identifier"],
            ["name", "VARCHAR(100)", "NOT NULL", "Team name (e.g. CSE Warriors, ECE Titans)"],
            ["team_type", "ENUM", "DEFAULT 'Inter-Department'", "Type: Inter-Department, Outer-College"],
            ["department_id", "INT", "FK -> departments(id), NULL", "Academic department affiliation"],
            ["sport_id", "INT", "FK -> sports(sport_id)", "Sport discipline"],
            ["tournament_id", "INT", "FK -> tournaments(tournament_id)", "Tournament enrollment"],
            ["event_id", "INT", "FK -> events(event_id)", "Specific event enrollment"],
            ["captain_id", "INT", "FK -> users(id), NULL", "Team captain user account"],
            ["coach_name", "VARCHAR(100)", "NULL", "Assigned faculty coach name"],
            ["jersey_color", "VARCHAR(50)", "NULL", "Primary team uniform color"],
            ["status", "ENUM", "DEFAULT 'Pending'", "Status: Pending, Approved, Disqualified"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Registration timestamp"]
        ]),
        ("Table 5.9: matches", [
            ["match_id", "INT", "PK, AUTO_INCREMENT", "Unique match fixture identifier"],
            ["tournament_id", "INT", "FK -> tournaments(tournament_id)", "Parent tournament reference"],
            ["event_id", "INT", "FK -> events(event_id), NULL", "Associated event reference"],
            ["sport_id", "INT", "FK -> sports(sport_id)", "Sport discipline reference"],
            ["team1_id", "INT", "FK -> teams(team_id)", "First competing team"],
            ["team2_id", "INT", "FK -> teams(team_id)", "Second competing team"],
            ["round_name", "VARCHAR(50)", "DEFAULT 'League'", "Round: League, Quarter-Final, Semi-Final, Final"],
            ["scheduled_date", "DATE", "NOT NULL", "Date of the scheduled fixture"],
            ["scheduled_time", "TIME", "NOT NULL", "Scheduled match start time"],
            ["venue_id", "INT", "FK -> venues(venue_id), NULL", "Allocated ground/facility"],
            ["status", "ENUM", "DEFAULT 'Scheduled'", "Status: Scheduled, Live, Completed, Abandoned"],
            ["winner_team_id", "INT", "FK -> teams(team_id), NULL", "Winning team identifier"],
            ["score_team1", "VARCHAR(50)", "DEFAULT '0'", "Final score summary for Team 1"],
            ["score_team2", "VARCHAR(50)", "DEFAULT '0'", "Final score summary for Team 2"],
            ["current_state", "TEXT", "NULL", "Live game dynamic JSON state payload"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Fixture creation timestamp"]
        ]),
        ("Table 5.10: od_requests", [
            ["od_id", "INT", "PK, AUTO_INCREMENT", "Unique On-Duty requisition identifier"],
            ["request_id", "VARCHAR(50)", "NOT NULL, UNIQUE", "Human-readable reference ID (e.g. OD-2026-0042)"],
            ["student_id", "INT", "FK -> students(student_id)", "Student athlete requesting OD"],
            ["match_id", "INT", "FK -> matches(match_id), NULL", "Associated match fixture requiring absence"],
            ["event_id", "INT", "FK -> events(event_id), NULL", "Associated event reference"],
            ["reason", "TEXT", "NOT NULL", "Formal statement of sports participation"],
            ["od_date", "DATE", "NOT NULL", "Date for academic leave authorization"],
            ["status", "ENUM", "DEFAULT 'Pending'", "Status: Pending, Approved, Rejected"],
            ["approved_by_user_id", "INT", "FK -> users(id), NULL", "Approving authority user account"],
            ["rejection_reason", "TEXT", "NULL", "Reason if request is declined"],
            ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Application submission timestamp"]
        ])
    ]

    for title, rows in schema_tables:
        add_h3(doc, title)
        t = doc.add_table(rows=1, cols=4)
        format_table(t, [1.5, 1.2, 1.8, 2.1], ["Column Name", "Data Type", "Constraints", "Description"], rows, header_bg="1E293B")
        
    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 6: ER DIAGRAM
    # -------------------------------------------------------------
    print("Writing Chapter 6: ER Diagram...")
    add_chapter_heading(doc, "CHAPTER 6", "ENTITY-RELATIONSHIP (ER) DIAGRAM")
    
    add_h2(doc, "6.1 High-Level Entity Overview")
    add_p(doc, "The conceptual schema of the Sports Management System revolves around five core entity clusters: (1) Identity & Governance (`users`, `students`, `departments`), (2) Catalogs & Infrastructure (`sports`, `venues`, `competition_levels`), (3) Competitions & Scheduling (`tournaments`, `events`, `matches`), (4) Team Organization (`teams`, `department_sport_captains`, `department_squad_members`, `team_members`), and (5) Operations & Compliance (`match_scores`, `match_attendance`, `od_requests`, `official_od_documents`, `audit_logs`).")
    
    add_figure_caption(doc, "6.1", "Comprehensive Relational Entity-Relationship (ER) Diagram")

    add_h2(doc, "6.2 Entity Relationships & Cardinalities")
    add_bullet(doc, "Each Department is associated with multiple Students (1:N) and is overseen by a faculty Coordinator (1:1 user link).", "Departments to Students & Coordinators:")
    add_bullet(doc, "A Tournament hosts multiple Events (1:N), and each Event schedules multiple Matches between competing Teams (1:N).", "Tournaments, Events, and Matches:")
    add_bullet(doc, "A Team enrolls multiple Student athletes through the team_members associative table (M:N) and is led by one Captain user (1:1).", "Teams and Players:")
    add_bullet(doc, "Each Match links to two competing Teams (Team 1 and Team 2) and generates one Live Score State record and multiple Match Attendance entries (1:N).", "Matches to Scores and Attendance:")
    add_bullet(doc, "A Student athlete submits multiple OD requests across the academic year (1:N), each optionally linking to a scheduled Match fixture.", "Students to On-Duty (OD) Requisitions:")

    add_h2(doc, "6.3 Integrity Constraints & Cascade Policies")
    add_p(doc, "The database enforces strict referential integrity policies. When a Tournament is cancelled or deleted, associated Events cascade appropriately, whereas Team deletions trigger safety checks to prevent orphan match historical records (`ON DELETE RESTRICT` on historical fixtures). Deleting a user account cleanly cascades or sets nulls on coordinator and captain links without destroying institutional student records.")

    # -------------------------------------------------------------
    # CHAPTER 7: TECH STACK & ARCHITECTURE
    # -------------------------------------------------------------
    print("Writing Chapter 7: Tech Stack & Architecture...")
    add_chapter_heading(doc, "CHAPTER 7", "TECH STACK & ARCHITECTURE OVERVIEW")
    
    add_h2(doc, "7.1 Tech Stack Justification")
    add_p(doc, "The architectural technology choices were governed by four core requirements: developer velocity, high runtime execution performance, strong relational data consistency, and robust multi-tier web security.")
    
    t_stack = doc.add_table(rows=1, cols=3)
    format_table(t_stack, [1.5, 2.2, 2.9],
                 ["Layer", "Technology", "Architectural Purpose & Rationale"],
                 [
                     ["Frontend Framework", "React.js 18.x (SPA)", "Component-driven reactive UI with virtual DOM for seamless dynamic score updates without page reloading."],
                     ["Build Tool", "Vite 5.x", "Next-generation build tool providing near-instant Hot Module Replacement (HMR) and optimized rollup production bundles."],
                     ["UI Styling", "CSS3 Design Tokens & CSS Modules", "Custom modular tokenized design system providing cohesive academic styling and responsive layouts."],
                     ["Backend Runtime", "Node.js 20.x LTS", "Event-driven, non-blocking I/O asynchronous runtime capable of handling concurrent match score updates efficiently."],
                     ["API Framework", "Express.js 4.x", "Lightweight, unopinionated routing framework facilitating modular middleware pipelines and REST endpoint isolation."],
                     ["Database Engine", "MySQL 8.0 (InnoDB)", "ACID-compliant relational DBMS providing robust foreign key enforcement, row-level locking, and rich indexing."],
                     ["Security & Auth", "JWT + bcryptjs + Helmet + Double CSRF", "Cryptographic password hashing, stateless token authorization with DB revocation, and HTTP hardening."],
                     ["Document Engine", "PDFKit", "Server-side dynamic PDF compilation for official On-Duty institutional approval letters with verification codes."],
                     ["Audit & Logging", "Custom In-Database Audit Service", "Centralized immutable audit trail logging administrative actions, role assignments, and score alterations."]
                 ])

    add_h2(doc, "7.2 System Architecture Overview & Request Lifecycle")
    add_p(doc, "The system follows a strict layered security and request execution lifecycle. Every client request originating from the React Single Page Application passes through five distinct evaluation phases before touching the database:")
    add_bullet(doc, "Express middleware applies Helmet headers (X-Content-Type-Options, X-Frame-Options), enforces CORS whitelisting, and rate-limits incoming requests by client IP to block brute-force attempts.", "1. Edge Hardening & Rate Limiting:")
    add_bullet(doc, "The Double-Submit CSRF cookie mechanism validates state-mutating requests (POST, PUT, DELETE) to protect against cross-site request forgery.", "2. CSRF Interception:")
    add_bullet(doc, "The JWT middleware parses the Bearer authorization header, verifies token cryptographic integrity, and checks `token_version` against the user table to enforce instant global session revocation.", "3. JWT Authentication & Version Validation:")
    add_bullet(doc, "The `authorize(...)` middleware compares the caller's role against endpoint permissions (e.g. Admin, Coordinator, Captain) before permitting execution.", "4. Role-Based Access Control (RBAC):")
    add_bullet(doc, "The designated controller sanitizes inputs, orchestrates business logic, executes parameterized SQL queries against MySQL, and returns standardized JSON payloads.", "5. Controller Execution & Database Persistence:")

    add_figure_caption(doc, "7.2", "System-Wide Tiered Request Lifecycle & Middleware Security Pipeline")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 8: MODULES & SYSTEM DESIGN
    # -------------------------------------------------------------
    print("Writing Chapter 8: Modules & System Design...")
    add_chapter_heading(doc, "CHAPTER 8", "MODULES & SYSTEM DESIGN")
    
    add_h2(doc, "8.0 Design Approach & Shared Architectural Baseline")
    add_p(doc, "Each module of the Sports Management System is documented here using a standardized, rigorous 8-step System Design framework. By following this identical structural sequence across all functional areas, the architecture explains not only what each interface accomplishes, but why specific technical, cryptographic, and schema decisions were made.")
    
    t_steps = doc.add_table(rows=1, cols=3)
    format_table(t_steps, [1.6, 2.5, 2.5],
                 ["Step", "Core Engineering Question Answered", "Section Heading in Each Module"],
                 [
                     ["1. Purpose & Scope", "What problem does this module solve and where are its boundaries?", "Section 8.x.0"],
                     ["2. Functional Requirements", "What exact operations must the module perform?", "Section 8.x.1"],
                     ["3. Non-Functional Requirements", "What security, latency, throughput, and CAP constraints apply?", "Section 8.x.2"],
                     ["4. Tech Stack & Choices", "Which specific libraries were selected and what is the rationale?", "Section 8.x.3"],
                     ["5. Back-of-Envelope Sizing", "What data volumes and transaction throughputs must be handled?", "Section 8.x.4"],
                     ["6. Low-Level Architecture", "How does the request and data flow step-by-step from UI to DB?", "Section 8.x.5"],
                     ["7. API Design", "What are the exact HTTP REST contracts and payload signatures?", "Section 8.x.6"],
                     ["8. Database Design & UI", "Which relational tables are touched and what does the UI render?", "Section 8.x.7 & 8.x.8"]
                 ])

    add_h3(doc, "Shared Baseline for All Modules")
    add_p(doc, "Non-Functional Baseline: Every request travels through Helmet (HTTP security headers), CORS origin validation, JSON payload size limitations (10MB max), an Express sliding-window rate limiter, and JWT bearer authentication before hitting a controller. All persistent records reside in a unified MySQL 8.0 instance configured for strict ACID compliance. In CAP theorem terms, the system chooses Consistency over Availability (CP): a user is prevented from recording an inconsistent score or double-booking a ground if the database connection falters, ensuring zero split-brain state.")
    add_p(doc, "Sizing Baseline (Campus Assumptions): Sized for National Engineering College comprising approximately 4,500 enrolled students, 12 academic departments, 25+ sport disciplines, ~150 annual tournament fixtures, and peak concurrent live score viewers of 1,200 spectators during annual championship finals.")
    
    add_figure_caption(doc, "8.0", "Overall Request Flow and Middleware Interceptor Architecture of the Sports Management System")

    # 8.1 FOLDER STRUCTURE
    add_h2(doc, "8.1 FOLDER STRUCTURE")
    add_p(doc, "The repository is structured into two clean, decoupled directories: backend/ and frontend/.")
    
    add_figure_caption(doc, "8.1.1", "High-Level Monorepo Project Layout")
    
    add_h3(doc, "8.1.1 Backend Directory Architecture")
    add_p(doc, "The backend employs a modular Node.js/Express structure:")
    add_bullet(doc, "Database connection pool initialization and security environment configurations.", "backend/src/config/:")
    add_bullet(doc, "16 dedicated controllers encapsulating route logic and business validation.", "backend/src/controllers/:")
    add_bullet(doc, "Canonical schema.sql and versioned incremental SQL migration scripts.", "backend/src/data/:")
    add_bullet(doc, "Security pipeline: authMiddleware, csrfMiddleware, rateLimiter, sanitizationMiddleware, validatorMiddleware, errorHandler.", "backend/src/middleware/:")
    add_bullet(doc, "15 SQL domain model abstractions executing parameterized MySQL queries.", "backend/src/models/sql/:")
    add_bullet(doc, "Route definitions: apiRoutes.js, authRoutes.js, galleryRoutes.js.", "backend/src/routes/:")
    add_bullet(doc, "Specialized services: auditStore, scheduledStatusService, studentProvisionService, oauthProviders.", "backend/src/services/:")

    add_h3(doc, "8.1.2 Frontend Directory Architecture")
    add_p(doc, "The frontend is built on a component-driven React + Vite structure:")
    add_bullet(doc, "Re-usable Atomic UI widgets: Button, Card, Modal, Table, Badge, SearchableSelect, Pagination, Toast, SkeletonLoader.", "frontend/src/components/common/:")
    add_bullet(doc, "Application shell, responsive Sidebar navigation, and dynamic Header with notification drawer.", "frontend/src/components/layout/:")
    add_bullet(doc, "Real-time sport scoreboard widgets: CricketScoreboard, FootballScoreboard, BasketballScoreboard, VolleyballScoreboard, GenericScoreboard.", "frontend/src/components/scoring/:")
    add_bullet(doc, "Global state providers: AuthContext (session & tokens), ToastContext (user notifications), SettingsContext.", "frontend/src/context/:")
    add_bullet(doc, "Role-segregated portal views: admin/, auth/, captain/, coordinator/, player/, president/, public/, settings/.", "frontend/src/pages/:")

    # MODULE 8.2: USER AUTHENTICATION & ACCESS CONTROL
    add_h2(doc, "8.2 USER AUTHENTICATION & ACCESS CONTROL (RBAC)")
    add_h3(doc, "8.2.0 Purpose & Scope")
    add_p(doc, "Provides secure, multi-role credential verification, tokenized session management, OAuth 2.0 social login, instant token revocation, and Role-Based Access Control (RBAC) across six institutional authorization tiers.")
    
    add_h3(doc, "8.2.1 Functional Requirements")
    add_bullet(doc, "A user authenticates using username/registration number and password, receiving a cryptographically signed JWT bearer token and user profile.", "Credential Login:")
    add_bullet(doc, "Enforces role-based routing across Admin, Sports President, Coordinator, Captain, Score Updater, and Player.", "Role-Based Navigation:")
    add_bullet(doc, "Supports Google OAuth 2.0 single sign-on with automatic linking to existing student profile records.", "OAuth 2.0 Social Integration:")
    add_bullet(doc, "Mandatory password reset flag (`must_change_password`) forces users with temporary passwords to update credentials before accessing portals.", "First-Login Password Policy:")
    add_bullet(doc, "Administrators can reset user credentials and toggle account active status (`is_active`).", "Administrative Account Control:")
    add_p(doc, "Out of scope: Hardware FIDO2 WebAuthn keys and biometric facial login.")

    add_h3(doc, "8.2.2 Non-Functional Requirements")
    add_bullet(doc, "Passwords stored exclusively as salted bcrypt hashes (work factor 10); raw passwords never written to logs or API responses.", "Cryptographic Storage:")
    add_bullet(doc, "Strict rate limiting of at most 15 login attempts per 15 minutes per IP address to eliminate brute-force attack vectors.", "Brute-Force Mitigation:")
    add_bullet(doc, "JWT expires in 24 hours. Incrementing the `token_version` column in the database instantly invalidates all active sessions across all devices.", "Session Revocation:")
    add_bullet(doc, "Authentication response under 300ms; JWT signature verification in microsecond order.", "Latency Target:")

    add_h3(doc, "8.2.3 Tech Stack")
    t_mod_tech = doc.add_table(rows=1, cols=3)
    format_table(t_mod_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Password Hashing", "bcryptjs (salted)", "Secure key stretching algorithm resistant to GPU rainbow table cracking."],
                     ["Token Encoding", "jsonwebtoken (JWT)", "Stateless bearer authorization payload carrying user ID, role, and token version."],
                     ["Rate Limiting", "express-rate-limit", "Sliding window memory counter preventing brute-force dictionary attacks on auth endpoints."],
                     ["CSRF Defense", "Double-Submit Cookie Pattern", "Protects authenticated sessions against unauthorized cross-origin requests."]
                 ])

    add_h3(doc, "8.2.4 Back-of-the-Envelope Estimation")
    t_mod_est = doc.add_table(rows=1, cols=3)
    format_table(t_mod_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Total User Accounts", "≈ 4,600 accounts", "4,500 students + 80 faculty coordinators + physical education staff"],
                     ["Database Storage", "≈ 2.3 MB", "≈ 500 bytes per user record in users table"],
                     ["Daily Login Volume", "≈ 1,500 logins/day", "Peak traffic during tournament weeks"],
                     ["Peak Login Throughput", "≈ 10 requests/sec", "Morning registration and evening match announcements"]
                 ])

    add_h3(doc, "8.2.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "LoginPage.jsx submits username and password via Axios POST /api/auth/login.", "1. Form Submission:")
    add_bullet(doc, "loginRateLimiter checks IP request frequency; validateLoginInput sanitizes payload.", "2. Rate Limit & Validation:")
    add_bullet(doc, "authController queries users table by username, verifies `is_active = 1`, and compares password against bcrypt hash.", "3. Credential Match:")
    add_bullet(doc, "Upon success, updates `last_login_at`, signs JWT payload `{ id, role, token_version }` with secret, and issues HttpOnly CSRF cookie.", "4. Token Issuance:")
    add_bullet(doc, "Client stores token in memory/localStorage; apiServices.js appends `Authorization: Bearer <token>` to subsequent requests.", "5. Client Storage:")

    add_h3(doc, "8.2.6 API Design")
    t_mod_api = doc.add_table(rows=1, cols=3)
    format_table(t_mod_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["POST", "/api/auth/login", "Public. Authenticates user, returns JWT and user profile. Rate limited."],
                     ["POST", "/api/auth/signup", "Public. Self-service student registration with register number validation."],
                     ["POST", "/api/auth/logout", "Protected. Clears user session and invalidates local authentication state."],
                     ["GET", "/api/auth/me", "Protected. Returns authenticated user profile and active role permissions."],
                     ["POST", "/api/auth/change-password", "Protected. Updates user password and resets `must_change_password` flag."],
                     ["POST", "/api/auth/admin-reset-password", "Protected (Admin). Resets target user password and increments token version."]
                 ])

    add_h3(doc, "8.2.7 DB Design")
    t_mod_db = doc.add_table(rows=1, cols=3)
    format_table(t_mod_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["users", "PK id (Auto) UNIQUE username, email", "username, email, password_hash, role, token_version, is_active, must_change_password, last_login_at"]
                 ])

    add_h3(doc, "8.2.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.2", "User Login, Role-Based Redirection, and First-Time Password Reset Modal")

    # MODULE 8.3: MASTER DATA & FACILITIES MANAGEMENT
    add_h2(doc, "8.3 MASTER DATA & FACILITIES MANAGEMENT")
    add_h3(doc, "8.3.0 Purpose & Scope")
    add_p(doc, "Administers foundational reference catalogs across the institution: academic departments, sports catalog with player count limits, collegiate competition levels, and sports grounds/venues with availability tracking.")

    add_h3(doc, "8.3.1 Functional Requirements")
    add_bullet(doc, "Maintain academic departments, department codes, brand color codes, and faculty coordinator bindings.", "Department Catalog:")
    add_bullet(doc, "Configure sport disciplines, category types (Men/Women/Mixed), and minimum/maximum roster limits.", "Sports Registry:")
    add_bullet(doc, "Manage campus grounds and indoor facilities with status tracking (Available, Maintenance, Booked).", "Venues & Facilities:")
    add_bullet(doc, "Maintain multi-tier competition hierarchy (Intramural, Zonal, Inter-Collegiate, State, National).", "Competition Levels:")

    add_h3(doc, "8.3.2 Non-Functional Requirements")
    add_bullet(doc, "Reference catalogs are read frequently and updated rarely; database query response time < 50ms.", "High Read Performance:")
    add_bullet(doc, "Deleting a sport or venue with active tournament match fixtures is strictly prevented via relational constraints.", "Deletion Safety:")

    add_h3(doc, "8.3.3 Tech Stack")
    t_m3_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m3_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Catalog UI", "React + SearchableSelect", "Instant fuzzy search and filtering across departments and sports."],
                     ["Persistence", "MySQL Parameterized Queries", "Prevents SQL injection while performing atomic CRUD on master tables."]
                 ])

    add_h3(doc, "8.3.4 Back-of-the-Envelope Estimation")
    t_m3_est = doc.add_table(rows=1, cols=3)
    format_table(t_m3_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Departments", "12 rows", "All engineering and science branches in NEC"],
                     ["Sports Catalog", "25+ disciplines", "Cricket, Football, Basketball, Volleyball, Athletics, etc."],
                     ["Venues / Grounds", "15 facilities", "Track grounds, indoor stadium, tennis courts, gymnasiums"]
                 ])

    add_h3(doc, "8.3.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Admin opens SportsCatalog.jsx or VenuesManager.jsx.", "1. Client Request:")
    add_bullet(doc, "Axios sends GET /api/sports or POST /api/sports with bearer token.", "2. API Route:")
    add_bullet(doc, "sportsController invokes sportSqlModel.createSport() within a validation block.", "3. Controller & Model:")
    add_bullet(doc, "MySQL inserts row into sports table; returns updated catalog array to client state.", "4. DB & Response:")

    add_h3(doc, "8.3.6 API Design")
    t_m3_api = doc.add_table(rows=1, cols=3)
    format_table(t_m3_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["GET", "/api/departments", "Public/Protected. Returns all academic departments with coordinator details."],
                     ["POST", "/api/departments", "Protected (Admin). Creates a new academic department."],
                     ["GET", "/api/sports", "Public/Protected. Returns all registered sport disciplines and roster rules."],
                     ["POST", "/api/sports", "Protected (Admin). Registers a new sport discipline with player limits."],
                     ["GET", "/api/venues", "Public/Protected. Lists all sports facilities with live availability status."],
                     ["POST", "/api/venues", "Protected (Admin). Adds a new ground or indoor sports facility."]
                 ])

    add_h3(doc, "8.3.7 DB Design")
    t_m3_db = doc.add_table(rows=1, cols=3)
    format_table(t_m3_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["departments", "PK id UNIQUE name, code", "name, code, coordinator_user_id, color_code"],
                     ["sports", "PK sport_id UNIQUE name", "name, category, min_players, max_players, points_rule"],
                     ["venues", "PK venue_id UNIQUE name", "name, location, capacity, status, is_external"]
                 ])

    add_h3(doc, "8.3.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.3", "Master Data Management: Sports Catalog, Department Mapping, and Grounds Registry")

    # MODULE 8.4: TOURNAMENT & FIXTURE MANAGEMENT
    add_h2(doc, "8.4 TOURNAMENT & FIXTURE MANAGEMENT")
    add_h3(doc, "8.4.0 Purpose & Scope")
    add_p(doc, "Coordinates collegiate sports tournaments, event sub-categories, match scheduling, bracket rounds, and venue booking conflict resolution.")

    add_h3(doc, "8.4.1 Functional Requirements")
    add_bullet(doc, "Create tournaments with academic year, tier classification, and start/end dates.", "Tournament Creation:")
    add_bullet(doc, "Define tournament event categories (e.g. Men's Football, Women's Badminton) with registration status toggles.", "Event Segmentation:")
    add_bullet(doc, "Schedule match fixtures between participating teams with automated venue clash prevention.", "Match Scheduling:")
    add_bullet(doc, "Support bracket stages: League, Quarter-Finals, Semi-Finals, Third-Place, and Finals.", "Round Tracking:")

    add_h3(doc, "8.4.2 Non-Functional Requirements")
    add_bullet(doc, "Transaction-level check prevents two matches from being scheduled at the same venue at overlapping times.", "Scheduling Conflict Prevention:")
    add_bullet(doc, "Scheduled matches automatically update status from Upcoming to Ongoing when tournament dates activate.", "Automatic Lifecycle Sync:")

    add_h3(doc, "8.4.3 Tech Stack")
    t_m4_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m4_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Scheduling Logic", "Node.js scheduledStatusService", "Background timer evaluating date-time transitions for matches."],
                     ["Fixture UI", "React Fixture Calendar & Brackets", "Interactive timeline view showing concurrent matches per venue."]
                 ])

    add_h3(doc, "8.4.4 Back-of-the-Envelope Estimation")
    t_m4_est = doc.add_table(rows=1, cols=3)
    format_table(t_m4_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Annual Tournaments", "≈ 4 major series", "Intramural, Trophy, Zonal, District Meet"],
                     ["Events per Tournament", "≈ 20 events", "Categorized by sport and gender"],
                     ["Matches per Tournament", "≈ 150 fixtures", "League and knockout fixtures across all departments"]
                 ])

    add_h3(doc, "8.4.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Admin creates fixture in MatchesManager.jsx specifying Tournament, Event, Team 1, Team 2, Date, Time, Venue.", "1. Fixture Input:")
    add_bullet(doc, "POST /api/matches sent to backend.", "2. Route Request:")
    add_bullet(doc, "matchController verifies venue availability for chosen timeslot; returns 409 Conflict if occupied.", "3. Conflict Validation:")
    add_bullet(doc, "Inserts record into matches table with default status `Scheduled`.", "4. Record Insertion:")

    add_h3(doc, "8.4.6 API Design")
    t_m4_api = doc.add_table(rows=1, cols=3)
    format_table(t_m4_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["GET", "/api/tournaments", "Public. Returns list of all tournaments with active status."],
                     ["POST", "/api/tournaments", "Protected (Admin/President). Creates a new collegiate tournament."],
                     ["GET", "/api/matches", "Public. Returns match fixtures with date, venue, team names, and status."],
                     ["POST", "/api/matches", "Protected (Admin/Coordinator). Schedules a new match fixture."]
                 ])

    add_h3(doc, "8.4.7 DB Design")
    t_m4_db = doc.add_table(rows=1, cols=3)
    format_table(t_m4_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["tournaments", "PK tournament_id UNIQUE name", "name, academic_year, tier, start_date, end_date, status"],
                     ["events", "PK event_id FK tournament_id, sport_id", "name, category, registration_status, max_teams"],
                     ["matches", "PK match_id FK tournament_id, event_id, venue_id", "team1_id, team2_id, round_name, scheduled_date, scheduled_time, status, winner_team_id"]
                 ])

    add_h3(doc, "8.4.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.4", "Tournament Fixture Scheduler, Venue Conflict Checker, and Knockout Bracket Visualizer")

    # MODULE 8.5: TEAM, SQUAD & ROSTER MANAGEMENT
    add_h2(doc, "8.5 TEAM, SQUAD & ROSTER MANAGEMENT")
    add_h3(doc, "8.5.0 Purpose & Scope")
    add_p(doc, "Handles departmental sports squads, captain allocations, student athlete eligibility verification, and collegiate varsity team nominations.")

    add_h3(doc, "8.5.1 Functional Requirements")
    add_bullet(doc, "Faculty coordinators allocate student Captains to specific department sports.", "Captaincy Assignment:")
    add_bullet(doc, "Captains recruit student athletes into department squads, validating student registration numbers.", "Squad Recruitment:")
    add_bullet(doc, "Enforce minimum and maximum player constraints based on sport catalog rules.", "Roster Limit Enforcement:")
    add_bullet(doc, "Form representative college varsity teams (`Outer-College`) by pooling top performers across departments.", "Varsity Team Builder:")

    add_h3(doc, "8.5.2 Non-Functional Requirements")
    add_bullet(doc, "A student cannot be added to conflicting teams within the same tournament event.", "Duplicate Registration Defense:")
    add_bullet(doc, "Team deletion safety constraints prevent deleting teams that have already played recorded matches.", "Historical Integrity:")

    add_h3(doc, "8.5.3 Tech Stack")
    t_m5_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m5_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Roster Validation", "Sequelize / SQL Constraints", "Enforces foreign key relationships between students, departments, and squads."],
                     ["Captain Dashboard", "React MyRoster.jsx", "Allows captains to easily add/remove squad members and nominate starting lineups."]
                 ])

    add_h3(doc, "8.5.4 Back-of-the-Envelope Estimation")
    t_m5_est = doc.add_table(rows=1, cols=3)
    format_table(t_m5_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Department Teams", "≈ 240 teams", "12 departments × 20 sports disciplines"],
                     ["Squad Athletes", "≈ 1,800 students", "Unique student participants active in college sports"],
                     ["Team Size Range", "5 to 16 players", "Varies by discipline (Basketball=5, Football=16)"]
                 ])

    add_h3(doc, "8.5.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Captain searches student by register number in MyRoster.jsx.", "1. Player Search:")
    add_bullet(doc, "GET /api/sports/students/search queries students table to verify department match.", "2. Verification:")
    add_bullet(doc, "POST /api/squads/members adds student to department_squad_members.", "3. Addition:")
    add_bullet(doc, "System checks current squad count against `max_players`; returns success.", "4. Enforcement:")

    add_h3(doc, "8.5.6 API Design")
    t_m5_api = doc.add_table(rows=1, cols=3)
    format_table(t_m5_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["GET", "/api/squads/my-squad", "Protected (Captain). Returns current captain's active squad roster."],
                     ["POST", "/api/squads/members", "Protected (Captain/Coordinator). Adds an eligible student to the squad."],
                     ["DELETE", "/api/squads/members/:id", "Protected (Captain/Coordinator). Removes a student from the squad."],
                     ["POST", "/api/squads/college-team/confirm", "Protected (Admin/President). Approves official college varsity team."]
                 ])

    add_h3(doc, "8.5.7 DB Design")
    t_m5_db = doc.add_table(rows=1, cols=3)
    format_table(t_m5_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["teams", "PK team_id FK dept_id, sport_id", "name, team_type, captain_id, status, jersey_color"],
                     ["department_sport_captains", "PK id UNIQUE(dept_id, sport_id, status)", "department_id, sport_id, user_id, status, assigned_at"],
                     ["department_squad_members", "PK id FK student_id", "captain_assignment_id, student_id, is_active, joined_at"]
                 ])

    add_h3(doc, "8.5.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.5", "Team Roster Manager, Student Eligibility Lookup, and Captain Assignment Portal")

    # MODULE 8.6: LIVE SCORING & MULTI-SPORT MATCH OPERATIONS
    add_h2(doc, "8.6 LIVE SCORING & MULTI-SPORT MATCH OPERATIONS")
    add_h3(doc, "8.6.0 Purpose & Scope")
    add_p(doc, "Provides sport-specific digital scorekeeping engines for authorized scorers and broadcasts real-time match scores to public spectators.")

    add_h3(doc, "8.6.1 Functional Requirements")
    add_bullet(doc, "Cricket: Overs, balls, runs, wickets, extras (wides/no-balls), current batsman and bowler stats.", "Cricket Score Engine:")
    add_bullet(doc, "Football: Match clock, halves, goals, yellow/red cards, penalty shootouts.", "Football Score Engine:")
    add_bullet(doc, "Basketball: Four quarters, points (1/2/3 pointers), team fouls, timeouts.", "Basketball Score Engine:")
    add_bullet(doc, "Volleyball: Set scores (best of 3/5), current set point tally, serving indicator.", "Volleyball Score Engine:")
    add_bullet(doc, "Generic / Athletics: Lap times, points, place finishes for track and field events.", "Generic Score Engine:")
    add_bullet(doc, "Status transitions: Automatically update match status (`Scheduled` -> `Live` -> `Completed`).", "Match Lifecycle:")

    add_h3(doc, "8.6.2 Non-Functional Requirements")
    add_bullet(doc, "Atomic score update operations prevent race conditions when two scorers submit simultaneous events.", "Concurrency Safety:")
    add_bullet(doc, "Public live scores refresh automatically with sub-second polling or websocket sync.", "Low Broadcast Latency:")

    add_h3(doc, "8.6.3 Tech Stack")
    t_m6_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m6_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Scoring State Engine", "React sportRegistry.js + Scoreboards", "Pluggable modular scoreboards tailored to each sport's exact rulebook."],
                     ["JSON State Payload", "MySQL TEXT / JSON column in matches", "Stores rich arbitrary game state (balls, fouls, cards) without altering relational schema."]
                 ])

    add_h3(doc, "8.6.4 Back-of-the-Envelope Estimation")
    t_m6_est = doc.add_table(rows=1, cols=3)
    format_table(t_m6_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Concurrent Live Matches", "≈ 4–6 matches", "Simultaneous fixtures across grounds during tournament days"],
                     ["Score Updates per Match", "≈ 120–300 updates", "Ball-by-ball cricket or point-by-point basketball events"],
                     ["Public Viewers", "≈ 1,200 spectators", "Peak campus audience following live score tickers"]
                 ])

    add_h3(doc, "8.6.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Official score updater enters match event (e.g. +4 runs in Cricket, Goal in Football).", "1. Scorer Action:")
    add_bullet(doc, "Axios sends PUT /api/matches/:id/score with JSON score delta.", "2. Score Request:")
    add_bullet(doc, "validatorMiddleware validates score input rules; matchController updates `current_state` and summary scores.", "3. Validation & Update:")
    add_bullet(doc, "Public clients polling GET /api/matches receive refreshed score payload within 1 second.", "4. Broadcast Sync:")

    add_h3(doc, "8.6.6 API Design")
    t_m6_api = doc.add_table(rows=1, cols=3)
    format_table(t_m6_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["PUT", "/api/matches/:id/score", "Protected (Admin/Scorer). Updates live match score, current state JSON, and status."],
                     ["GET", "/api/matches/live", "Public. Returns all currently active live matches and score payloads."],
                     ["PUT", "/api/matches/:id/status", "Protected. Updates match state (Scheduled, Live, Completed, Abandoned)."]
                 ])

    add_h3(doc, "8.6.7 DB Design")
    t_m6_db = doc.add_table(rows=1, cols=3)
    format_table(t_m6_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["matches", "PK match_id FK team1_id, team2_id", "score_team1, score_team2, current_state, status, winner_team_id"]
                 ])

    add_h3(doc, "8.6.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.6", "Sport-Specific Live Scoring Consoles (Cricket, Football, Basketball, Volleyball)")

    # MODULE 8.7: STUDENT ON-DUTY (OD) & OFFICIAL DOCUMENT WORKFLOW
    add_h2(doc, "8.7 STUDENT ON-DUTY (OD) & OFFICIAL DOCUMENT WORKFLOW")
    add_h3(doc, "8.7.0 Purpose & Scope")
    add_p(doc, "Automates the academic attendance exemption process for student athletes through a multi-tier digital requisition and approval pipeline, generating cryptographically verifiable official OD letters.")

    add_h3(doc, "8.7.1 Functional Requirements")
    add_bullet(doc, "Captains or student athletes submit OD requests linked to specific match fixtures.", "Requisition Submission:")
    add_bullet(doc, "Staff Department Coordinators review and verify athletic participation.", "Tier-1 Endorsement:")
    add_bullet(doc, "Sports President / Physical Director grants final institutional approval.", "Tier-2 Approval:")
    add_bullet(doc, "Automated server-side compilation of official PDF approval letters complete with institutional header and verification hash.", "PDF Letter Generation:")
    add_bullet(doc, "Public verification endpoint allows academic faculty to verify OD certificate authenticity via unique reference code.", "Public Authenticity Check:")

    add_h3(doc, "8.7.2 Non-Functional Requirements")
    add_bullet(doc, "Each approved OD document is assigned an immutable alphanumeric reference code (e.g. `OD-2026-NEC-0089`) preventing forgery.", "Tamper-Proof Verification:")
    add_bullet(doc, "Bulk approval capability enables processing 50+ athlete OD applications in under 2 seconds.", "Bulk Processing:")

    add_h3(doc, "8.7.3 Tech Stack")
    t_m7_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m7_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Document Engine", "PDFKit", "Streamable server-side PDF generator producing lightweight, crisp vector documents."],
                     ["Storage", "Secure File System + Relational Hash", "Stores generated PDF files in protected storage with DB metadata indexing."]
                 ])

    add_h3(doc, "8.7.4 Back-of-the-Envelope Estimation")
    t_m7_est = doc.add_table(rows=1, cols=3)
    format_table(t_m7_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Annual OD Applications", "≈ 2,500 requests", "Student athlete fixture participation across 4 tournaments"],
                     ["PDF File Storage", "≈ 250 MB / year", "≈ 100 KB per compiled PDF certificate"],
                     ["Verification Requests", "≈ 500 lookups", "Faculty academic attendance verification checks"]
                 ])

    add_h3(doc, "8.7.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Captain submits team OD in ODRequestPanel.jsx for upcoming fixture.", "1. Application:")
    add_bullet(doc, "POST /api/od/match/:matchId generates individual od_requests rows with status `Pending`.", "2. Creation:")
    add_bullet(doc, "Coordinator reviews in CoordinatorDashboard and marks `Verified`.", "3. Tier-1 Review:")
    add_bullet(doc, "Admin/President clicks `Approve All` via POST /api/od/bulk-approve.", "4. Final Approval:")
    add_bullet(doc, "System compiles official PDF via officialOdDocController and generates verification hash.", "5. PDF Generation:")

    add_h3(doc, "8.7.6 API Design")
    t_m7_api = doc.add_table(rows=1, cols=3)
    format_table(t_m7_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["POST", "/api/od/match/:matchId", "Protected (Captain). Generates OD requests for all team members playing match."],
                     ["GET", "/api/od/requests", "Protected (Staff). Lists pending OD requests filtered by department."],
                     ["PUT", "/api/od/approve/:id", "Protected (Admin/President). Formally approves student OD request."],
                     ["POST", "/api/official-od-docs/upload", "Protected (Admin). Compiles and stores official OD PDF document."],
                     ["GET", "/api/official-od-docs/public", "Public. Verifies validity of an OD document by reference number."]
                 ])

    add_h3(doc, "8.7.7 DB Design")
    t_m7_db = doc.add_table(rows=1, cols=3)
    format_table(t_m7_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["od_requests", "PK od_id UNIQUE request_id", "student_id, match_id, reason, od_date, status, approved_by_user_id"],
                     ["official_od_documents", "PK id UNIQUE verification_code", "title, file_path, document_type, academic_year, is_public"]
                 ])

    add_h3(doc, "8.7.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.7", "Two-Phase On-Duty (OD) Approval Interface and Generated Verifiable OD Certificate")

    # MODULE 8.8: MATCH ATTENDANCE & PARTICIPATION TRACKING
    add_h2(doc, "8.8 MATCH ATTENDANCE & PARTICIPATION TRACKING")
    add_h3(doc, "8.8.0 Purpose & Scope")
    add_p(doc, "Captures ground-level athlete attendance on match day, providing verifiable evidence of student physical participation.")

    add_h3(doc, "8.8.1 Functional Requirements")
    add_bullet(doc, "Staff coordinators record match-day check-in for enrolled squad members.", "Ground Attendance Check-in:")
    add_bullet(doc, "Distinguish between active playing participants and substitutes/bench members.", "Playing Status Flagging:")
    add_bullet(doc, "Correlate marked attendance directly with On-Duty validation records.", "OD Cross-Validation:")

    add_h3(doc, "8.8.2 Non-Functional Requirements")
    add_bullet(doc, "Attendance marking is locked 24 hours post-match conclusion to prevent retroactive tampering.", "Immutability Window:")

    add_h3(doc, "8.8.3 Tech Stack")
    t_m8_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m8_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Attendance Form", "React AttendanceMarker.jsx", "Fast toggle switches for quick player check-in on mobile tablets at grounds."]
                 ])

    add_h3(doc, "8.8.4 Back-of-the-Envelope Estimation")
    t_m8_est = doc.add_table(rows=1, cols=3)
    format_table(t_m8_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Attendance Entries", "≈ 3,600 rows / year", "150 matches × 24 players marked per match"]
                 ])

    add_h3(doc, "8.8.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Coordinator opens AttendanceMarker.jsx on match day.", "1. Selection:")
    add_bullet(doc, "Marks Present / Absent toggles for Team 1 and Team 2 players.", "2. Toggles:")
    add_bullet(doc, "POST /api/attendance/match/:matchId records batch attendance in match_attendance table.", "3. Persistence:")

    add_h3(doc, "8.8.6 API Design")
    t_m8_api = doc.add_table(rows=1, cols=3)
    format_table(t_m8_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["GET", "/api/attendance/match/:matchId", "Protected. Returns player attendance roster for specified fixture."],
                     ["POST", "/api/attendance/squad", "Protected (Coordinator). Saves player attendance status records."]
                 ])

    add_h3(doc, "8.8.7 DB Design")
    t_m8_db = doc.add_table(rows=1, cols=3)
    format_table(t_m8_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["match_attendance", "PK id UNIQUE(match_id, student_id)", "match_id, student_id, is_present, is_substitute, marked_by_user_id"]
                 ])

    add_h3(doc, "8.8.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.8", "Match-Day Attendance Check-in and Participation Verification Console")

    # MODULE 8.9: PUBLIC PORTAL, LEADERBOARD & MEDIA GALLERY
    add_h2(doc, "8.9 PUBLIC PORTAL, LEADERBOARD & MEDIA GALLERY")
    add_h3(doc, "8.9.0 Purpose & Scope")
    add_p(doc, "Delivers an engaging, unauthenticated public web interface providing live scores, tournament leaderboards, photo galleries, and multi-lingual accessibility.")

    add_h3(doc, "8.9.1 Functional Requirements")
    add_bullet(doc, "Display live score tickers that update automatically without manual page refreshing.", "Live Score Ticker:")
    add_bullet(doc, "Real-time department points tally with automated win, draw, loss, and bonus point aggregation.", "Department Points Table:")
    add_bullet(doc, "High-resolution photo and video gallery of sporting highlights categorized by tournament.", "Media Gallery:")
    add_bullet(doc, "On-the-fly multi-language translation (English, Tamil, Hindi) for universal regional accessibility.", "Multi-Language Support:")

    add_h3(doc, "8.9.2 Non-Functional Requirements")
    add_bullet(doc, "Public endpoints are fully unauthenticated and protected by response caching to withstand traffic spikes during final matches.", "High Concurrency & Caching:")

    add_h3(doc, "8.9.3 Tech Stack")
    t_m9_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m9_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Live Translation", "Custom liveTranslator.js Client Engine", "Client-side phrase dictionary providing instant localization without backend API latency."],
                     ["Image Uploads", "Multer Multipart Middleware", "Efficient handling of high-resolution sports photography uploads."]
                 ])

    add_h3(doc, "8.9.4 Back-of-the-Envelope Estimation")
    t_m9_est = doc.add_table(rows=1, cols=3)
    format_table(t_m9_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Daily Page Views", "≈ 5,000 views / day", "Campus-wide interest during sports weeks"],
                     ["Gallery Media Assets", "≈ 500 images", "High-resolution tournament match photography"]
                 ])

    add_h3(doc, "8.9.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Visitor accesses public root / in web browser.", "1. Page Load:")
    add_bullet(doc, "PublicHome.jsx concurrently dispatches GET /api/leaderboard and GET /api/matches/live.", "2. Parallel Fetch:")
    add_bullet(doc, "useAutoRefresh hook polls active live match scores at configurable intervals.", "3. Auto Refresh:")

    add_h3(doc, "8.9.6 API Design")
    t_m9_api = doc.add_table(rows=1, cols=3)
    format_table(t_m9_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["GET", "/api/leaderboard", "Public. Returns department points standings and win/loss statistics."],
                     ["GET", "/api/gallery", "Public. Returns gallery media assets grouped by tournament category."],
                     ["POST", "/api/gallery/upload", "Protected (Admin/Staff). Uploads sports photography assets."]
                 ])

    add_h3(doc, "8.9.7 DB Design")
    t_m9_db = doc.add_table(rows=1, cols=3)
    format_table(t_m9_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["gallery_media", "PK id FK tournament_id", "title, image_url, category, uploaded_by_user_id"]
                 ])

    add_h3(doc, "8.9.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.9", "Public Portal: Live Scores, Leaderboard Points Table, and Multi-Language Translation")

    # MODULE 8.10: EXECUTIVE DASHBOARDS, ANALYTICS & REPORTING
    add_h2(doc, "8.10 EXECUTIVE DASHBOARDS, ANALYTICS & REPORTING")
    add_h3(doc, "8.10.0 Purpose & Scope")
    add_p(doc, "Equips institutional leadership, athletic directors, and athletes with real-time operational summaries, participation trends, and exportable statistical reports.")

    add_h3(doc, "8.10.1 Functional Requirements")
    add_bullet(doc, "Admin Portal: System health, total athletes registered, grounds utilization rates, and pending actions.", "Admin Executive Dashboard:")
    add_bullet(doc, "President Portal: Macro tournament overview, departmental performance rankings, and final approval queues.", "President Portal:")
    add_bullet(doc, "Player Portal: Individual match schedules, win/loss history, verified attendances, and performance badges.", "Player Performance Profile:")
    add_bullet(doc, "Exporting: Download official tournament summary reports in CSV and PDF formats.", "Data Export:")

    add_h3(doc, "8.10.2 Non-Functional Requirements")
    add_bullet(doc, "Aggregated SQL GROUP BY queries optimized with covering indexes to render executive summaries in < 200ms.", "Fast Aggregations:")

    add_h3(doc, "8.10.3 Tech Stack")
    t_m10_tech = doc.add_table(rows=1, cols=3)
    format_table(t_m10_tech, [1.8, 2.0, 2.8], ["Concern", "Choice", "Why It Fits This Module"],
                 [
                     ["Aggregations", "MySQL Index-Covered SQL Queries", "High-performance database computations for leaderboard standings."],
                     ["Visualization", "CSS Metric Cards & Data Tables", "Clean, responsive executive cards displaying institutional KPIs."]
                 ])

    add_h3(doc, "8.10.4 Back-of-the-Envelope Estimation")
    t_m10_est = doc.add_table(rows=1, cols=3)
    format_table(t_m10_est, [2.0, 2.0, 2.6], ["Quantity", "Estimate", "Basis"],
                 [
                     ["Dashboard Load Queries", "≈ 4 SQL queries", "Total counts, active tournaments, live matches, pending ODs"]
                 ])

    add_h3(doc, "8.10.5 Low-Level Architecture & Request Flow")
    add_bullet(doc, "Admin or President logs into their designated dashboard.", "1. Dashboard Access:")
    add_bullet(doc, "GET /api/overview/stats aggregates counts across users, sports, tournaments, and grounds.", "2. KPI Aggregation:")
    add_bullet(doc, "Renders interactive analytics cards and recent security audit log entries.", "3. Visual Rendering:")

    add_h3(doc, "8.10.6 API Design")
    t_m10_api = doc.add_table(rows=1, cols=3)
    format_table(t_m10_api, [1.0, 2.4, 3.2], ["Method", "Endpoint", "Purpose & Contract"],
                 [
                     ["GET", "/api/overview/stats", "Protected. Returns macro KPI counters and system metrics."],
                     ["GET", "/api/reports/performance", "Protected. Returns aggregated department tournament performance report."],
                     ["GET", "/api/reports/player/:studentId", "Protected. Returns individual student athlete career statistics."]
                 ])

    add_h3(doc, "8.10.7 DB Design")
    t_m10_db = doc.add_table(rows=1, cols=3)
    format_table(t_m10_db, [1.4, 2.0, 3.2], ["Table", "Keys & Indexes", "Key Columns"],
                 [
                     ["audit_logs", "PK id FK user_id", "action, entity_type, entity_id, ip_address, created_at"]
                 ])

    add_h3(doc, "8.10.8 Screenshots & UI Wireframes")
    add_figure_caption(doc, "8.10", "Executive Admin Dashboard, Department Performance Analytics, and Player Career Statistics")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 9: CONCLUSION & FUTURE ENHANCEMENTS
    # -------------------------------------------------------------
    print("Writing Chapter 9: Conclusion...")
    add_chapter_heading(doc, "CHAPTER 9", "CONCLUSION & FUTURE ENHANCEMENTS")
    
    add_h2(doc, "9.1 Summary of Deliverables & Project Achievements")
    add_p(doc, "The National Engineering College (NEC) Sports Management System delivers a comprehensive, production-grade digital transformation for collegiate sports operations. By replacing legacy paper circulars and fragmented messaging channels with a cohesive web platform, the system accomplishes several pivotal milestones:")
    add_bullet(doc, "Unified 4,500+ student athletes, 12 academic departments, 25+ sports disciplines, and college sports facilities into an integrated relational database.", "Centralized Data Governance:")
    add_bullet(doc, "Eliminated manual scheduling clashes through conflict-aware tournament and match fixture algorithms.", "Automated Fixture Operations:")
    add_bullet(doc, "Delivered real-time scoring consoles for Cricket, Football, Basketball, Volleyball, and Track/Field events, engaging thousands of campus spectators.", "Sport-Specific Live Scoring:")
    add_bullet(doc, "Reduced Academic On-Duty (OD) processing time from 3–7 days down to under 5 minutes with cryptographic verification codes and automated PDF certificate generation.", "Paperless OD Acceleration:")
    add_bullet(doc, "Enforced enterprise-grade security including bcrypt password hashing, token versioning session revocation, CSRF protection, and immutable audit logging.", "Zero-Trust Security Baseline:")

    add_h2(doc, "9.2 Performance, Security & Usability Outcomes")
    add_p(doc, "Extensive functional and performance validation demonstrated that all REST endpoints respond in under 300ms under standard loads. The intuitive, role-segregated user interfaces enable faculty coordinators and student captains to perform roster updates, match attendance recording, and OD submissions with zero administrative friction.")

    add_h2(doc, "9.3 Future Roadmap & Enhancements")
    add_p(doc, "Planned future iterations will further expand the platform's technological capabilities:")
    add_bullet(doc, "Integration with campus camera feeds and lightweight computer vision models to automatically generate highlight clips for collegiate championship games.", "AI-Powered Automated Video Highlights:")
    add_bullet(doc, "Integration with wearable telemetry sensors (heart rate, GPS speed trackers) to monitor student athlete physical load during collegiate training sessions.", "Wearable IoT Biometric Telemetry:")
    add_bullet(doc, "Cross-platform iOS and Android applications developed with React Native for offline-first push notifications and instant score alert updates.", "Mobile Native Application:")
    add_bullet(doc, "Issuance of verifiable sports participation and achievement certificates secured by digital cryptographic signatures.", "Cryptographic Certificate Issuance:")

    # Save document
    output_path = r"D:\Sports_Management\Sports_Management_System_Report.docx"
    doc.save(output_path)
    print(f"\nDocument successfully generated and saved to: {output_path}")

if __name__ == "__main__":
    build_document()
