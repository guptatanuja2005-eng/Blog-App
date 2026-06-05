# Blog App

A full-stack blogging platform built with Express.js, EJS, PostgreSQL, and Drizzle ORM. Users can create accounts, log in, write blogs, edit posts, and manage their content.

## Features

- User Authentication
  - Signup
  - Login
  - Logout
  - Google OAuth Login

- Blog Management
  - Create Blog
  - Read Blog
  - Update Blog
  - Delete Blog

- Session-Based Authentication

- PostgreSQL Database

- Drizzle ORM

- EJS Templating Engine

- Responsive UI

## Tech Stack

### Frontend
- EJS
- HTML
- CSS

### Backend
- Express.js
- Node.js

### Database
- PostgreSQL

### ORM
- Drizzle ORM

### Authentication
- Express Session
- Passport.js
- Google OAuth 2.0

## Project Structure

```text
blog-app/
│
├── config/
│   └── passport.js
│
├── controllers/
│   ├── authController.js
│   └── blogController.js
│
├── db/
│   ├── index.js
│   └── schema.js
│
├── middleware/
│   └── auth.js
│
├── models/
│   ├── User.js
│   └── Blog.js
│
├── public/
│   └── css/
│       └── style.css
│
├── routes/
│   ├── authRoutes.js
│   └── blogRoutes.js
│
├── views/
│   ├── home.ejs
│   ├── login.ejs
│   ├── signup.ejs
│   ├── dashboard.ejs
│   ├── createBlog.ejs
│   ├── editBlog.ejs
│   └── publicblog.ejs
│
├── .env
├── server.js
├── package.json
└── drizzle.config.js
```

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd blog-app
```

### Install Dependencies

```bash
npm install
```

### Create Environment Variables

Create a `.env` file:

```env
PORT=3000

SESSION_SECRET=your_secret_key

DATABASE_URL=postgres://postgres:password@localhost:5432/blogdb

GOOGLE_CLIENT_ID=your_google_client_id

GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Run Database Migration

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### Start Development Server

```bash
npm run dev
```

### Production

```bash
npm start
```

## Routes

### Authentication

| Method | Route | Description |
|----------|---------|-------------|
| GET | /signup | Signup Page |
| POST | /signup | Create Account |
| GET | /login | Login Page |
| POST | /login | Login User |
| GET | /logout | Logout |
| GET | /auth/google | Google Login |

### Blogs

| Method | Route | Description |
|----------|---------|-------------|
| GET | / | Home |
| GET | /dashboard | User Dashboard |
| GET | /create-blog | Create Blog Page |
| POST | /create-blog | Create Blog |
| GET | /blog/:id | View Blog |
| GET | /edit-blog/:id | Edit Blog Page |
| POST | /edit-blog/:id | Update Blog |
| POST | /delete-blog/:id | Delete Blog |

## Future Improvements

- Rich Text Editor
- Blog Categories
- Comments
- Likes
- Search Blogs
- Pagination
- User Profiles
- Image Uploads


