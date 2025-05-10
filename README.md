# Sticker Shop

A full-stack e-commerce application for selling stickers, built with React and Node.js.

## Features

- User authentication (register, login, profile management)
- Product browsing with pagination and filtering
- Shopping cart functionality
- Checkout process with Stripe integration
- Order history and tracking
- Admin dashboard for managing products, categories, and orders

## Tech Stack

### Frontend
- React with Vite
- React Router for navigation
- Context API for state management
- Axios for API requests
- Stripe for payment processing

### Backend
- Node.js with Express
- MongoDB with Mongoose for database
- JWT for authentication
- Multer for file uploads
- Stripe API for payments

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Stripe account for payment processing

### Installation

1. Clone the repository:
```
git clone <repository-url>
cd sticker-shop
```

2. Install backend dependencies:
```
cd backend
npm install
```

3. Install frontend dependencies:
```
cd ../frontend
npm install
```

4. Create a `.env` file in the backend directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sticker-shop
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Running the Application Locally

1. Start the backend server:
```
cd backend
npm run dev
```

2. Start the frontend development server:
```
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Deployment to Vercel

### Prerequisites
- Vercel account
- MongoDB Atlas account (for cloud database)
- Stripe account

### Steps to Deploy

1. Create a MongoDB Atlas cluster and get your connection string

2. Install Vercel CLI:
```
npm install -g vercel
```

3. Login to Vercel:
```
vercel login
```

4. Deploy to Vercel:
```
vercel
```

5. Set up environment variables in Vercel:
   - Go to your project on the Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add the following variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: A secure random string for JWT token generation
     - `STRIPE_SECRET_KEY`: Your Stripe secret key
     - `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key

6. Deploy to production:
```
vercel --prod
```

## Usage

### User Features
- Browse products by category
- Search for products
- Add products to cart
- Checkout with Stripe
- View order history

### Admin Features
- Manage products (add, edit, delete)
- Manage categories
- Process orders
- View sales statistics

## Admin Access

To access the admin features, you need to create a user with the admin role. You can do this by modifying the user's role in the database:

```javascript
// Using MongoDB shell
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
);
```

## License

This project is licensed under the MIT License.

## Acknowledgements

- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Stripe](https://stripe.com/)
- [React Icons](https://react-icons.github.io/react-icons/)
