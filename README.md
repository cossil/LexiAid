# LexiAid 🎓

> **Empowering students with learning disabilities through AI-powered accessible education**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6.svg)](https://www.typescriptlang.org/)

---

## 📖 Table of Contents

- [About LexiAid](#about-lexiaid)
- [The Problem We Solve](#the-problem-we-solve)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## 🌟 About LexiAid

**LexiAid** (formerly *AI Tutor* or *Rafa's Assistant*) is an intelligent, highly accessible learning platform designed to empower students facing severe learning challenges. Built as a **non-profit, web-based application**, LexiAid makes education accessible to students with dyslexia, alexia, dysgraphia, and other learning disabilities.

### 💡 The Inspiration

LexiAid was born from a father's desire to help his son, Rafael, who has severe dyslexia, alexia (inability to read words), and dysgraphia (inability to write). The platform's mission is to **adapt traditional learning materials** and create a supportive educational environment where every student can thrive.

### 🎯 Our Mission

To break down barriers in education by providing **auditory-first**, AI-powered tools that enable students with learning disabilities to access, understand, and demonstrate their knowledge—regardless of their ability to read or write.

---

## 🚧 The Problem We Solve

Students with severe learning disabilities face significant barriers in traditional education:

### 📚 Inaccessible Materials
Many intelligent and creative students **cannot read or write effectively**, making standard textbooks, websites, and assignments major obstacles to learning.

### 💬 Difficulty Expressing Knowledge
Even when students master a subject, they struggle to articulate their ideas due to stuttering, short sentences, or word repetition—making it difficult to demonstrate knowledge in formal assessments.

### 🔧 Inadequate Support Systems
Existing assistance programs are often:
- Expensive and hard to access
- Lacking the right tools
- Ineffective (e.g., non-English speaking scribes assigned to English-speaking students)

**LexiAid provides a comprehensive, accessible, and affordable solution.**

---

## ✨ Key Features

### 1. 📄 Advanced Document Understanding

**Upload Anything, Access Everything**

- **Multi-format Support**: Upload PDFs, images of book pages, screenshots, or web pages
- **Document Understanding Agent (DUA)**: 
  - Analyzes entire documents with context-aware processing
  - Describes images and graphs intelligently
  - Corrects punctuation for natural audio playback
  - Example: Instead of reading "STRONGER THAN DUCHENNE" repeatedly, the DUA describes the image of people wearing t-shirts and explains the phrase is written on them

### 2. 🎧 Synchronized Text-to-Speech

**Multi-Sensory Learning Experience**

- **High-Quality Natural Voice**: Powered by Google Cloud Text-to-Speech
- **Real-Time Highlighting**: Words are highlighted as they're spoken
- **Paragraph-Aware Synchronization**: Maintains proper document structure
- **Accessible Controls**: Play, pause, resume, and stop with keyboard shortcuts

### 3. 🤖 Interactive AI Tutoring

**Personalized Learning Assistant**

- **Document-Based Chat**: Ask questions about uploaded content
- **AI Capabilities**:
  - Read entire documents aloud
  - Summarize key points
  - Explain complex concepts in simple terms
  - Answer specific questions with context
- **Voice Interaction**: Speak your questions using Speech-to-Text

### 4. 📝 Interactive Quizzes

**Knowledge Assessment Made Accessible**

- **AI-Generated Quizzes**: Based on document content
- **Voice-First Interface**: Questions read aloud, answers given by speaking
- **Multiple Choice Format**: Easy selection with visual and audio feedback
- **Progress Tracking**: Monitor learning outcomes

### 5. 🎙️ AI-Assisted Answer Formulation *(Coming Soon)*

**Transform Thoughts into Written Answers**

- **Dictate Your Ideas**: Speak freely, even if disorganized
- **AI Refinement**: Converts speech into clear, structured text
- **No External Information**: AI only works with the student's own ideas
- **Voice-Controlled Editing**: Iterate with commands like "Change that word to..." or "Rephrase that sentence"

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3+ with TypeScript
- **Routing**: React Router DOM 7.5+
- **Styling**: TailwindCSS 3.4+
- **Icons**: Lucide React
- **Build Tool**: Vite 5.4+
- **State Management**: React Context API
- **Authentication**: Firebase Auth

### Backend
- **Framework**: Flask 3.1+
- **AI/ML**: 
  - LangChain 0.3+ & LangGraph 0.4+
  - Google Vertex AI (Gemini 2.5 Flash)
  - Google Cloud Document AI
- **Database**: 
  - Google Cloud Firestore
  - SQLite (LangGraph checkpoints)
- **Cloud Services**:
  - Google Cloud Storage
  - Google Cloud Text-to-Speech
  - Google Cloud Speech-to-Text
- **Real-time Communication**: Flask-SocketIO

### Infrastructure
- **Hosting**: Google Cloud Platform
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

---

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Google Cloud Account**: With enabled APIs (Vertex AI, Document AI, Storage, Firestore, TTS, STT)
- **Firebase Project**: For authentication and Firestore

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/cossil/LexiAid.git
cd LexiAid
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Copy .env.example to .env and configure:
# - GOOGLE_CLOUD_PROJECT_ID
# - FIREBASE_SERVICE_ACCOUNT_KEY_PATH
# - DOCUMENT_AI_LOCATION
# - LAYOUT_PROCESSOR_ID
# - Other required credentials
```

#### 3. Frontend Setup

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Set up environment variables
# Create .env file with:
# - VITE_BACKEND_API_URL
# - VITE_FIREBASE_API_KEY
# - Other Firebase configuration
```

#### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
flask --app app.py --debug run --port 5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
LexiAid/
├── backend/                    # Flask backend application
│   ├── agent/                  # AI agent implementations
│   ├── graphs/                 # LangGraph workflows
│   │   ├── document_understanding_agent/
│   │   ├── quiz_graph.py
│   │   ├── general_query_graph.py
│   │   └── supervisor_graph.py
│   ├── routes/                 # API route handlers
│   ├── services/               # Business logic services
│   ├── tools/                  # Custom LangChain tools
│   └── utils/                  # Utility functions
├── src/                        # React frontend application
│   ├── components/             # Reusable UI components
│   ├── contexts/               # React Context providers
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Page components
│   ├── services/               # API service layer
│   └── types/                  # TypeScript type definitions
├── docs/                       # Project documentation
├── tests/                      # Backend test suites
└── public/                     # Static assets
```

---

## 🤝 Contributing

We welcome contributions from the community! LexiAid is a non-profit project aimed at making education accessible to all.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/AmazingFeature`
3. **Commit your changes**: `git commit -m 'Add some AmazingFeature'`
4. **Push to the branch**: `git push origin feature/AmazingFeature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Keep commits atomic and well-described

### Areas We Need Help

- 🎨 **UI/UX Design**: Improving accessibility and user experience
- 🧪 **Testing**: Writing comprehensive test suites
- 📝 **Documentation**: Improving guides and API documentation
- 🌍 **Internationalization**: Adding multi-language support
- ♿ **Accessibility**: Enhancing WCAG compliance
- 🤖 **AI/ML**: Improving LLM prompts and agent workflows

---

## 🗺️ Roadmap

### ✅ Completed Features
- [x] Document upload and OCR processing
- [x] Document Understanding Agent (DUA)
- [x] Synchronized Text-to-Speech with highlighting
- [x] AI chat interface with document context
- [x] Speech-to-Text for voice input
- [x] Interactive quiz generation
- [x] Firebase authentication
- [x] Multi-format document support (PDF, images)

### 🚧 In Progress
- [ ] AI-Assisted Answer Formulation
- [ ] DOCX and TXT file upload support
- [ ] Enhanced quiz analytics
- [ ] Mobile-responsive design improvements

### 📋 Planned Features
- [ ] Collaborative learning features
- [ ] Teacher/parent dashboard
- [ ] Progress tracking and analytics
- [ ] Custom vocabulary builder
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Browser extension for web content
- [ ] Mobile applications (iOS/Android)

---

## 👥 Who is LexiAid For?

### Primary Users
Students with severe learning disabilities including:
- **Dyslexia**: Difficulty reading and interpreting words
- **Alexia**: Inability to read words
- **Dysgraphia**: Difficulty with writing
- **Dyscalculia**: Difficulty with mathematics

### Extended Audience
- Patients with Duchenne Muscular Dystrophy (DMD)
- Stroke recovery patients
- Traumatic brain injury survivors
- Anyone seeking accessible learning tools

### Stakeholders & Partners
- **Educational Institutions**: Schools, colleges, universities
- **Disability Services**: Accessibility departments
- **Sponsors & Foundations**: Education and accessibility focused
- **Advocacy Groups**: Dyslexia, DMD, and learning disability organizations

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Inspiration
- **Rafael**: The inspiration behind LexiAid, whose challenges motivated this project
- **Families**: All families navigating learning disabilities

### Technology Partners
- **Google Cloud**: For AI/ML infrastructure and services
- **Firebase**: For authentication and database services
- **LangChain/LangGraph**: For AI agent orchestration
- **Open Source Community**: For the amazing tools and libraries

### Special Thanks
- All contributors and supporters of accessible education
- Educators working with students with learning disabilities
- The dyslexia and learning disability advocacy community

---

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/cossil/LexiAid/issues)
- **Discussions**: [Join the conversation](https://github.com/cossil/LexiAid/discussions)
- **Email**: [Contact the maintainers](mailto:your-email@example.com) *(Update with actual contact)*

---

## 🌟 Support the Project

LexiAid is a **non-profit initiative**. If you believe in accessible education, consider:

- ⭐ **Starring** this repository
- 🐛 **Reporting bugs** and suggesting features
- 💻 **Contributing code** or documentation
- 📢 **Spreading the word** about LexiAid
- 💰 **Sponsoring** the project *(sponsorship details coming soon)*

---

<div align="center">

**Made with ❤️ for accessible education**

*LexiAid - Because every student deserves the opportunity to learn*

</div>
