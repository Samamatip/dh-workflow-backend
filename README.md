# DH Backend

This project is the backend for the DH application.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)

## Setup Instructions

### 1. Set Up MongoDB

- Install MongoDB and ensure it is running locally or provide a connection string for a remote instance.
- Update the MongoDB connection URI in your environment variables or configuration file (e.g., `.env`):

    ```
    MONGODB_URI=mongodb://localhost:27017/dh_database
    ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Seed the Database

#### Seed Users

```bash
node scripts/seedUsers.js
```

#### Seed Departments

```bash
node scripts/seedDepartments.js
```
#### Seed groups

```bash
node scripts/seedGroups.js
```
## Running the Application

```bash
npm start or npm run dev
```

---

For more details, refer to the project documentation or contact the maintainers.