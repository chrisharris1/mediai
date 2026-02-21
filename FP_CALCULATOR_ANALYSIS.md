# 📊 MediAI - Function Point (FP) Calculator Analysis

**Project Name:** MediAI - AI-Powered Telemedicine Platform  
**Analysis Date:** January 16, 2026  
**Project Type:** Full-Stack Healthcare Application with AI/ML Integration

---

## 📋 PART 1: DOMAIN CHARACTERISTIC TABLE

### 1. Number of User Inputs
**Count: 47**  
**Weighting Factor: Average**

#### Input Forms & Data Entry Points:
1. **Authentication Inputs (8)**
   - Login form (email, password)
   - Registration form (firstName, lastName, email, password, role, terms)
   - Doctor registration form (name, email, phone, specialization, experience, qualifications, license, languages)
   - OAuth callbacks (Google, LinkedIn)

2. **Medicine Tracker Inputs (7)**
   - Add medicine form (name, dosage, frequency, schedule times, start date, end date)
   - Edit medicine form (same fields)
   - Log dose form (status, notes, actual time)
   - Medicine scanner OCR input (image capture)
   - Manual medicine name correction

3. **Profile Management Inputs (6)**
   - Basic profile (age, gender, phone)
   - Medical history (allergies array, chronic conditions array)
   - Current medications list
   - Profile image upload
   - Notification preferences
   - Doctor profile edit request

4. **Symptom Checker Inputs (5)**
   - Symptom selection (multi-select from 50+ symptoms)
   - Symptom duration
   - Symptom severity
   - Additional notes
   - Follow-up consultation booking

5. **Consultation System Inputs (6)**
   - Consultation request (doctor selection, reason, preferred date/time)
   - Consultation acceptance form
   - Consultation rejection reason
   - Doctor response notes
   - Meeting link input
   - Consultation completion notes

6. **AI Chatbot Inputs (3)**
   - Chat message text
   - Chat session metadata
   - Conversation context

7. **Drug Interaction Checker Inputs (4)**
   - Drug 1 name and category
   - Drug 2 name and category
   - Additional patient context (optional)

8. **Side Effect Predictor Inputs (6)**
   - Medicine name
   - Patient age, weight, gender
   - Current medications list
   - Chronic conditions list

9. **Bug Report Inputs (4)**
   - Bug title, description
   - Priority level
   - Screenshot upload
   - Contact info

10. **Admin Panel Inputs (5)**
    - Doctor approval decision (approve/reject + reason)
    - Bug report status update
    - User block/unblock
    - Report review notes
    - Complaint resolution

11. **Other Inputs (3)**
    - Search filters (date ranges, status filters)
    - Notification settings
    - Export/download requests

---

### 2. Number of User Outputs
**Count: 52**  
**Weighting Factor: Average**

#### Output Reports & Display Screens:

1. **Dashboard Outputs (8)**
   - Patient dashboard (medicine list, adherence stats, upcoming doses)
   - Doctor dashboard (consultation queue, patient history, stats)
   - Admin dashboard (user stats, bug reports, doctor applications)
   - Today's doses widget
   - Adherence charts (Chart.js visualizations)
   - Medicine calendar view
   - Notification list
   - Profile summary card

2. **Medicine Tracker Outputs (6)**
   - Medicine list with adherence rates
   - Dose history logs (taken/missed/pending)
   - PDF medication report (jsPDF generated)
   - Adherence statistics graph
   - Missed doses summary
   - Medicine details view

3. **AI/ML Outputs (8)**
   - Drug interaction prediction result (severity, probability, warnings)
   - Side effect prediction scores (8 probabilities)
   - Symptom analysis report (possible conditions, severity, advice)
   - Home remedies list
   - Suggested medicines
   - Warning signs list
   - OCR extracted text and medicine name
   - AI chatbot responses with medical context

4. **Consultation Outputs (6)**
   - Available doctors list (with ratings, specialization, availability)
   - Consultation request status
   - Consultation history
   - Doctor profile details
   - Meeting information
   - Consultation summary report

5. **Notification Outputs (5)**
   - Email notifications (SendGrid templates)
   - SMS notifications (Twilio)
   - In-app notification list
   - Push notification messages
   - Dose reminder alerts

6. **Admin Reports (7)**
   - User list with filters
   - Doctor applications table
   - Bug reports dashboard
   - System statistics (total users, consultations, medicines)
   - Complaint management view
   - Doctor edit requests list
   - User activity logs

7. **Profile & Authentication Outputs (5)**
   - User profile display (with medical history)
   - Doctor profile card
   - Authentication status messages
   - Session information
   - OAuth redirect responses

8. **Search & Query Results (4)**
   - Medicine search results
   - Doctor search/filter results
   - Symptom search suggestions
   - Report history queries

9. **Error & Status Messages (3)**
   - Validation error messages
   - Success/failure notifications
   - API error responses

---

### 3. Number of User Inquiries
**Count: 38**  
**Weighting Factor: Average**

#### Interactive Queries & Real-time Data Retrieval:

1. **Authentication Queries (4)**
   - Check user session (GET /api/auth/me)
   - Verify credentials (POST /api/auth/login)
   - OAuth callback validation
   - Role-based access check

2. **Medicine Tracker Queries (7)**
   - Get user's medicines (GET /api/medicines/tracker)
   - Get today's doses (GET /api/medicines/todays-doses)
   - Get dose history (GET /api/medicines/log-dose)
   - Get adherence statistics (GET /api/medicines/adherence-stats)
   - Get medicine by ID
   - Check missed doses (cron job query)
   - Search medicine database

3. **Consultation Queries (6)**
   - Get available doctors (GET /api/consultations/available-doctors)
   - Get my consultations (GET /api/consultations/my-consultations)
   - Get doctor consultations (GET /api/doctor/consultations)
   - Get consultation details by ID
   - Get doctor statistics (GET /api/doctor/stats)
   - Get patient statistics (GET /api/patient/stats)

4. **Profile Queries (4)**
   - Get user profile (GET /api/profile)
   - Get comprehensive profile (GET /api/profile/comprehensive)
   - Get doctor profile details
   - Check profile completion status

5. **AI/ML Queries (4)**
   - Check drug interactions (POST /api/ai/check-interactions)
   - Predict side effects (POST /api/ai/predict-side-effects)
   - Analyze symptoms (POST /api/symptoms/analyze)
   - Get symptom history (GET /api/symptoms/analyze)

6. **Chatbot Queries (3)**
   - Send chat message (POST /api/chat)
   - Get chat history (GET /api/chat/history)
   - Process chat actions (POST /api/chat/actions)

7. **Notification Queries (2)**
   - Get user notifications (GET /api/notifications)
   - Check unread notification count

8. **Admin Queries (6)**
   - Get all users (GET /api/admin/users)
   - Get doctor applications (GET /api/admin/doctor-applications)
   - Get bug reports (GET /api/admin/bug-reports)
   - Get admin statistics (GET /api/admin/stats)
   - Get user details (GET /api/admin/user-details)
   - Get doctor details (GET /api/admin/doctor-details)

9. **Bug Report Queries (2)**
   - Get user's bug reports (GET /api/bug-reports)
   - Get bug report by ID

---

### 4. Number of Files (Database Tables/Collections)
**Count: 16**  
**Weighting Factor: Average**

#### MongoDB Collections (Mongoose Schemas):

1. **User** - User accounts (patients, doctors, admins) with profile data
2. **Doctor** - Doctor profiles with specialization, availability, ratings
3. **MedicineTracker** - Patient medication schedules with adherence tracking
4. **MedicineLog** - Individual dose logs (taken/missed/pending)
5. **MedicineReport** - Generated PDF medication reports
6. **Medicine** - Drug database (14,000+ medicines from DrugBank)
7. **DrugInteraction** - ML-predicted drug-drug interactions
8. **SideEffectPrediction** - Personalized side effect predictions
9. **ConsultationRequest** - Patient-doctor consultation bookings
10. **SymptomCheck** - Symptom analysis session history
11. **SymptomReport** - Detailed symptom assessment reports
12. **ChatHistory** - AI chatbot conversation logs
13. **Notification** - Multi-channel notification records
14. **BugReport** - Issue tracking and bug reports
15. **DoctorEditRequest** - Doctor profile edit requests (pending approval)
16. **DoctorComplaint** - User complaints about doctors

#### Additional Data Files:
- Environment configuration (.env)
- AI model files (.pkl, .h5)
- Uploaded images (Cloudinary)

---

### 5. Number of External Interfaces
**Count: 12**  
**Weighting Factor: Average**

#### External System Integrations:

1. **MongoDB Atlas** - Cloud database service (primary data storage)
2. **NextAuth.js** - Authentication framework with session management
3. **Google OAuth 2.0** - Google sign-in integration
4. **LinkedIn OAuth** - LinkedIn authentication
5. **SendGrid API** - Email delivery service
6. **Twilio API** - SMS notification service
7. **Cloudinary API** - Image upload and storage
8. **Flask AI API** - Separate Python microservice for ML predictions
9. **Tesseract OCR** - Medicine scanning OCR engine
10. **Google Gemini AI** - Chatbot NLP processing
11. **Groq SDK** - Alternative AI processing
12. **Chart.js** - Data visualization library

---

## 🔧 PART 2: COMPLEXITY ADJUSTMENT TABLE

### Scale Ratings (0-5):
- **0** = No influence
- **1** = Incidental
- **2** = Moderate
- **3** = Average
- **4** = Significant
- **5** = Essential

---

### 1. Does the system require reliable backup and recovery?
**Rating: 5 (Essential)**

**Justification:**
- MongoDB Atlas automatic backups (daily snapshots)
- Cloudinary image backup
- Critical medical data requires high availability
- Medicine adherence logs must be recoverable
- Consultation history preservation
- Patient safety depends on data integrity

---

### 2. Are data communications required?
**Rating: 5 (Essential)**

**Justification:**
- Real-time notifications (email, SMS)
- API communications (REST endpoints)
- WebSocket connections for live chat
- OAuth provider communication
- AI API microservice calls
- Database queries over network
- Third-party API integrations (SendGrid, Twilio, Cloudinary)

---

### 3. Are there distributed processing functions?
**Rating: 4 (Significant)**

**Justification:**
- Next.js API routes (separate Node.js processes)
- Flask AI API (Python microservice)
- OCR server (separate Flask instance)
- MongoDB Atlas (distributed database)
- Cloudinary CDN (distributed file storage)
- Background cron jobs for dose reminders
- AI model inference on separate server

---

### 4. Is performance critical?
**Rating: 4 (Significant)**

**Justification:**
- Real-time dose reminders (time-sensitive)
- Quick symptom analysis for emergency cases
- Fast drug interaction checks before prescribing
- Responsive dashboard loading (<2 seconds)
- OCR processing speed (3-5 seconds)
- AI prediction latency (<1 second)
- Chart.js rendering optimization

---

### 5. Will the system run in an existing, heavily utilized operational environment?
**Rating: 3 (Average)**

**Justification:**
- Cloud deployment (Vercel/AWS)
- Shared MongoDB Atlas cluster
- NextAuth session management overhead
- Multiple concurrent user sessions
- Background cron jobs competing for resources
- AI API resource contention during peak hours

---

### 6. Does the system require on-line data entry?
**Rating: 5 (Essential)**

**Justification:**
- All forms require online submission
- Real-time medicine logging
- Live chat messages
- OCR image upload and processing
- Symptom checker requires immediate input
- Consultation booking is online
- Admin actions are real-time

---

### 7. Does the on-line data entry require the input transaction to be built over multiple screens or operations?
**Rating: 4 (Significant)**

**Justification:**
- Doctor registration (5-step wizard)
- Medicine tracker setup (3-step form)
- Symptom checker (multi-page assessment)
- Consultation booking (doctor selection → details → confirmation)
- Profile completion (multiple sections)
- AI chat interactions (multi-turn conversations)

---

### 8. Are the master files updated on-line?
**Rating: 5 (Essential)**

**Justification:**
- Medicine database real-time updates
- User profiles updated instantly
- Dose logs recorded immediately
- Consultation status changes propagate
- Notification records created on-the-fly
- Chat history appended continuously

---

### 9. Are the inputs, outputs, files or inquiries complex?
**Rating: 4 (Significant)**

**Justification:**
- Complex AI outputs (multi-label predictions)
- Nested data structures (consultation history with patient data)
- PDF report generation (multiple tables, charts)
- OCR image processing (binary → text → structured data)
- Medicine tracker with calculated adherence rates
- Symptom analyzer with 50+ condition mappings
- Chart.js visualizations from aggregated data

---

### 10. Is the internal processing complex?
**Rating: 5 (Essential)**

**Justification:**
- Machine Learning models (Random Forest, Neural Network)
- Adherence rate calculations (complex date logic)
- Symptom matching algorithm (rule-based engine)
- Drug interaction severity classification
- Side effect probability adjustments (age, weight, conditions)
- Missed dose detection (cron job logic)
- PDF generation with dynamic tables
- OCR pattern matching and extraction
- Chat context management
- Notification routing logic

---

### 11. Is the code to be designed reusable?
**Rating: 4 (Significant)**

**Justification:**
- React components (15+ reusable)
- API route utilities (authService, notificationService)
- Mongoose models (16 schemas)
- TypeScript interfaces (type safety)
- Shared symptom analyzer library
- Notification templates
- Authentication guards (ProtectedRoute)
- Medicine scheduler utilities

---

### 12. Are conversion and installation included in the design?
**Rating: 3 (Average)**

**Justification:**
- Environment variable configuration
- MongoDB schema migrations
- Python virtual environment setup
- AI model deployment scripts
- Next.js build process
- Docker containerization (planned)
- Database seed scripts
- OCR Tesseract installation

---

### 13. Is the system designed for multiple installations in different organizations?
**Rating: 4 (Significant)**

**Justification:**
- Multi-tenant architecture (user isolation)
- Configurable environment variables
- White-label ready (branding customization)
- Role-based access control (patient/doctor/admin)
- Scalable database design
- Cloud deployment compatibility
- Open-source potential

---

### 14. Is the application designed to facilitate change and ease of use by the user?
**Rating: 5 (Essential)**

**Justification:**
- Responsive UI (mobile, tablet, desktop)
- Intuitive dashboard layouts
- Real-time validation feedback
- OCR for quick medicine entry (reduces manual typing)
- AI chatbot for guided interactions
- Search and filter capabilities
- Comprehensive error messages
- Undo/edit capabilities for medicine logs
- Profile customization options
- Notification preferences

---

## 📊 FUNCTION POINT CALCULATION

### Domain Characteristic Counts:
| Measurement Parameter | Count | Weighting | Weighted FP |
|----------------------|-------|-----------|-------------|
| Number of User Inputs | 47 | Average (×4) | **188** |
| Number of User Outputs | 52 | Average (×5) | **260** |
| Number of User Inquiries | 38 | Average (×4) | **152** |
| Number of Files | 16 | Average (×10) | **160** |
| Number of External Interfaces | 12 | Average (×7) | **84** |

**Unadjusted Function Points (UFP) = 188 + 260 + 152 + 160 + 84 = 844**

---

### Complexity Adjustment Factor (CAF):
Total Degree of Influence (TDI) = Sum of all 14 ratings  
TDI = 5 + 5 + 4 + 4 + 3 + 5 + 4 + 5 + 4 + 5 + 4 + 3 + 4 + 5 = **60**

**CAF = 0.65 + (0.01 × TDI) = 0.65 + (0.01 × 60) = 0.65 + 0.60 = 1.25**

---

### Final Adjusted Function Points (AFP):
**AFP = UFP × CAF = 844 × 1.25 = 1,055 Function Points**

---

## 📈 PROJECT METRICS

### Effort Estimation (using industry averages):
- **Average productivity**: 10-15 FP per person-month
- **Estimated effort**: 1,055 ÷ 12.5 = **84.4 person-months**
- **For solo developer**: ~84 weeks (1.6 years)

### Lines of Code Estimation:
- **TypeScript/JavaScript**: ~60 LOC per FP → 63,300 LOC
- **Python**: ~50 LOC per FP (AI code) → Additional 15,000 LOC
- **Total estimated LOC**: ~78,000 lines

### Project Complexity Classification:
**Category: Large, Complex Enterprise Application**

---

## 🎯 PROJECT SCOPE SUMMARY

### Technology Complexity Score: **Very High**
- Full-stack web application
- Machine learning integration
- Microservice architecture
- Multi-database operations
- Real-time notifications
- Image processing (OCR)
- PDF generation
- OAuth integration
- Cloud deployment

### Business Domain Complexity: **High**
- Healthcare regulations compliance
- Medical data accuracy requirements
- Patient safety considerations
- Multi-role user management
- Clinical decision support

### Innovation Level: **High**
- AI-powered drug interaction prediction
- Personalized side effect forecasting
- Symptom analysis engine
- OCR medicine scanning
- Intelligent chatbot

---

## 📋 FP CALCULATOR INPUT SUMMARY

### ✅ Fill the FP Calculator Form with these values:

#### Domain Characteristic Table:
1. **Number of User Input**: `47` → Weighting: **Average**
2. **Number of User Outputs**: `52` → Weighting: **Average**
3. **Number of User Inquiries**: `38` → Weighting: **Average**
4. **Number of Files**: `16` → Weighting: **Average**
5. **Number of External Interfaces**: `12` → Weighting: **Average**

#### Complexity Adjustment Questions (0-5 scale):
1. Reliable backup and recovery: **5**
2. Data communications required: **5**
3. Distributed processing: **4**
4. Performance critical: **4**
5. Existing operational environment: **3**
6. On-line data entry: **5**
7. Multiple screens/operations: **4**
8. Master files updated on-line: **5**
9. Complex inputs/outputs/files: **4**
10. Internal processing complex: **5**
11. Code designed reusable: **4**
12. Conversion and installation: **3**
13. Multiple installations: **4**
14. Facilitate change and ease of use: **5**

---

## 🏆 PROJECT CHARACTERISTICS

### Strengths:
✅ Comprehensive feature set (47 inputs, 52 outputs)  
✅ High reusability (React components, API utilities)  
✅ Strong external integrations (12 third-party services)  
✅ User-centric design (ease of use rating: 5/5)  
✅ Robust data management (16 database collections)  

### Complexity Drivers:
⚠️ High internal processing complexity (ML models, algorithms)  
⚠️ Distributed architecture (3 microservices)  
⚠️ Critical performance requirements (healthcare domain)  
⚠️ Essential data communications (real-time notifications)  
⚠️ Multiple user roles and workflows  

---

**Analysis Prepared By:** GitHub Copilot  
**Project Status:** Ongoing Development  
**Recommended Team Size:** 5-7 developers (full-time, 12-18 months)  
**Current Development:** Solo developer with AI assistance  

---

## 📌 NOTES FOR COLLEGE PROJECT PRESENTATION

1. **Highlight the FP Score**: 1,055 FP is considered a **large-scale enterprise project**
2. **Emphasize Complexity**: High CAF (1.25) shows sophisticated design
3. **Showcase Technical Depth**: 12 external integrations, ML models, microservices
4. **Demonstrate Scope**: 47 input forms, 52 output reports, 38 queries
5. **Prove Scalability**: Multi-tenant design, distributed architecture

This FP analysis demonstrates project management skills and software engineering rigor expected in professional development environments.
