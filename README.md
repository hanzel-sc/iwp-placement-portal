# Christ University Placement Portal

A comprehensive web portal to connect Christ University students, faculty, and recruiters for efficient campus placement coordination. This project consists of a React/HTML/CSS frontend and a Node.js backend with MySQL database integration.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Folder Structure](#folder-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

This Placement Portal enables:

- Students to view job postings, upload resumes, and apply for jobs.
- Companies to register, create and manage job postings, view applicants, and hire selected candidates.
- Faculty to monitor applications, view student/job status, and coordinate placement activities.

---

## Features

- User registration and login for Students, Companies, and Faculty with JWT-based authentication.
- Role-based dashboards with personalized data.
- Company users can post, update, and delete job listings.
- Students can browse active jobs and apply.
- Faculty users can track applications and hiring status.
- Notifications for job postings and application status changes.
- Secure password storage using bcrypt.
- Responsive and minimalistic UI matching.

---

## Tech Stack

- **Frontend:** HTML, CSS (custom), JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Authentication:** JWT (JSON Web Token)
- **Password Hashing:** bcrypt
- **Deployment:**
  - Frontend: Vercel (Static Hosting)
  - Backend: Railway or Render (Node.js + MySQL)

---

## How to contribute and collaborate

#### 1. Fork and Clone the repository 
- Fork the repository 
- (in the VS Code terminal) git clone https://github.com/your-username/forked-repository.git

#### 2. Take time to understand the project structure
- E.g say you're working on the frontend for the student module. Navigate to the frontend folder and create a folder for your module -> frontend/student-pages. 
- css files go into a seperate folder -> frontend/css
- frontend javascript logic -> frontend/js
- new backend route -> backend/routes

- Kindly adhere to the project structure. 

### 3. Contributing
- NEVER PUSH DIRECTLY TO MAIN !
- in your VS Code terminal type : git checkout -b feature/your-feature e.g. If you're doing the student module : git checkout -b feature/student-module
- make your changes, contribution, etc
- add the changes -> git add .
- Commit the changes -> git commit -m "Your commit message"

- push the changes to your branch -> git push origin feature/your-feature 
- NEVER PUSH DIRECTLY TO MAIN

### 4. Create aa pull request 
- Head over to github and create a pull request
- List the features you've implemented and the files changed. 



