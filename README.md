# Kaduna Explorer

### Discover Kaduna. Experience More.

A tourism and local discovery platform showcasing destinations, culture, events, businesses, and experiences across Kaduna State, Nigeria.

[![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-UI-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-API-000000?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

---

## 🌍 About Kaduna Explorer

Kaduna Explorer is a tourism and local discovery platform designed to help residents and visitors discover places and experiences across Kaduna State.

The project brings destination discovery, location-based exploration, events, travel information, and trip planning together in one platform. It aims to improve the visibility of Kaduna's destinations and make local exploration easier to access.

## ✨ Platform Features

### 🗺️ Destination Discovery
- Browse destinations across Kaduna State.
- Explore places by category.
- Search for destinations and view their details.
- View destination photos, location information, and visitor reviews.

### 📍 Location-Based Exploration
- Discover places around a user's location.
- Explore nearby destinations and services.
- View places on maps.
- Use place data from supported providers, including Google Places and OpenStreetMap.

### 🎉 Events and Experiences
- Discover events taking place in Kaduna.
- View event details, dates, and schedules.
- Browse featured experiences.

### 👤 User Accounts
- Register and sign in.
- Submit destination reviews.
- Save favourite destinations.
- Create and manage trip plans.

### 🧭 Travel Guides
- Explore travel information about Kaduna.
- Find useful destination details.
- Discover places and experiences when planning a visit.

### 🛠️ Administration
- Manage destination listings and destination images.
- Create and manage events.
- Manage featured experiences and platform content.
- Use protected administrative features.

## 🧰 Technology Stack

| Area | Technologies |
|---|---|
| Frontend | Next.js, React, JavaScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Place discovery and maps | Google Places, OpenStreetMap |
| Image hosting | Cloudinary |

## 🏗️ Project Structure

Kaduna Explorer is maintained as a monorepo with separate frontend and backend applications.

```text
kaduna-explorer/
├── backend/
├── frontend/
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm
- A MongoDB database
- Git

### 1. Clone the repository

```bash
git clone https://github.com/mosesifunanya/kaduna-explorer.git
cd kaduna-explorer
```

### 2. Install dependencies

From the project root, run:

```bash
npm install
```

### 3. Configure environment variables

Create the environment files required by the backend and frontend:

```text
backend/.env
frontend/.env.local
```

Add the values required by your local configuration. These may include the MongoDB connection string, authentication secrets, Cloudinary credentials, external API keys, and frontend/backend URLs.

**Security:** Do not commit `.env` files, private API keys, database credentials, or authentication secrets. Keep real credentials in local environment files and configure deployment secrets in your hosting provider.

### 4. Start the applications

Use the development scripts defined in the root `package.json` to start the applications. Check the available scripts with:

```bash
npm run
```

Run the appropriate script for your development workflow.

## 🔐 Security

- Keep credentials and private configuration in environment variables.
- Do not commit local environment files.
- Keep dependencies and generated build output out of version control.
- Use protected routes for authenticated and administrative operations.

## 🧭 Project Vision

Kaduna is home to remarkable landscapes, cultural heritage, historic sites, local businesses, and memorable experiences. Kaduna Explorer aims to bring these discoveries closer to residents and visitors through a single digital platform.

By connecting destination information, maps, events, and trip planning, the project aims to support local discovery and increase the visibility of tourism across Kaduna State.

## 🚧 Project Status

**Under active development.**

Features and implementation details may change as development continues.

## 👨‍💻 Developer

**Moses Ifunanya Nobei**

Blockchain Developer | Full Stack Developer | JavaScript Developer

- **GitHub:** [@mosesifunanya](https://github.com/mosesifunanya)
- **LinkedIn:** [Moses Ifunanya Nobei](https://www.linkedin.com/in/mosesifunanya/)
- **X (Twitter):** [@Ifynob53](https://x.com/Ifynob53)

## 🤝 Contributing

Ideas, feedback, and contributions are welcome.

1. Fork the repository.
2. Create a branch for your changes.
3. Make and test your changes.
4. Submit a pull request describing your contribution.

Please do not include credentials, generated build files, or local environment configuration in contributions.

## 📄 License

No open-source license has been specified for this repository. Unless a license is added, the project remains subject to the default copyright protections.

---

**Kaduna Explorer**  
*Discover Kaduna. Experience More.*

Developed by **Moses Ifunanya Nobei**
