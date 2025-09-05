# Task Manager with Chatbot + Smithy Plugins

[![Build](https://img.shields.io/github/actions/workflow/status/LalithaSreeDamarla/task-manager-with-bot/ci.yml?branch=main)](https://github.com/LalithaSreeDamarla/task-manager-with-bot/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![AWS](https://img.shields.io/badge/AWS-SAM%20%7C%20Lambda%20%7C%20DynamoDB-orange.svg)](https://aws.amazon.com/)

This repository contains a **full-stack Task Manager application** enhanced with AI chatbot support and AWS Smithy-based code generation.  
It is structured as a **monorepo** with both backend and frontend, along with custom Smithy plugins for codegen.

---

## 🚀 Features
- **Frontend (React / TypeScript)**
  - Task management UI (add, edit, delete, list tasks).
  - Integration with chatbot API for auto-generating task plans.
  - Configured with ESLint + Prettier for consistent formatting.

- **Backend (Node.js + AWS Lambda via SAM)**
  - Task CRUD API backed by DynamoDB.
  - Chat API integrated with **AWS Bedrock (Claude/LLMs)**.
  - SAM templates for deploying infrastructure as code.

- **Smithy Plugins**
  - Custom Smithy models for defining services.
  - Plugins for CRUD codegen (backend + DynamoDB stack).
  - Smithy → TypeScript client generation (`smithy-typescript/`).

- **Gradle Build System**
  - Plugin builds and Smithy codegen managed through Gradle.
  - Supports multi-module setup (`backend`, `plugins`, `smithy-typescript`).

---

## 📂 Repository Structure
.
├── backend/ # AWS Lambda functions, SAM templates
├── frontend/ # React frontend app
├── plugins/ # Custom Smithy plugins
├── smithy-typescript/ # Generated Smithy TypeScript SDK
├── gradle/ # Gradle wrapper and configs
├── .gitignore
├── gradlew / gradlew.bat
├── settings.gradle.kts
└── README.md

**Install dependencies**
**1.Frontend**
cd frontend
npm install
npm run dev

**2.Backend**
cd backend
sam build
sam deploy --guided

**3.Generate Smithy Typescript Client**
cd smithy-typescript
./gradlew build

**4.Development**
**Linting / Formatting**
--npm run lint      # ESLint
--npm run format    # Prettier

**5.Unit Testing**
**Jest configured with mock functions**
--npm test
