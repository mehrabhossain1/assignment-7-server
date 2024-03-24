const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "https://startling-seahorse-4904d4.netlify.app",
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("assignment");
    const collection = db.collection("users");
    const donationsCollection = db.collection("donations");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.cookie("authToken", jwt.sign({ email }, process.env.JWT_SECRET), {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      console.log({ user });

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log({ isPasswordValid });

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      console.log({ token });

      res.cookie("authToken", jwt.sign({ email }, process.env.JWT_SECRET), {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // donations
    app.post("/api/v1/donations", async (req, res) => {
      try {
        const { image, category, title, amount, description } = req.body;

        const result = await donationsCollection.insertOne({
          image,
          category,
          title,
          amount,
          description,
          timestamp: new Date(),
        });

        res.status(201).json({
          success: true,
          message: "Donation created successfully",
          donationId: result.insertedId,
        });
      } catch (error) {
        console.error("Error creating donation:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    app.get("/api/v1/donations", async (req, res) => {
      try {
        const donations = await donationsCollection.find().toArray();

        res.json({
          success: true,
          donations,
        });
      } catch (error) {
        console.error("Error retrieving donations:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // single donation
    app.get("/api/v1/donations/:id", async (req, res) => {
      try {
        const donationId = req.params.id;

        const donation = await donationsCollection.findOne({
          _id: new ObjectId(donationId),
        });

        if (!donation) {
          return res.status(404).json({
            success: false,
            message: "donation not found",
          });
        }

        res.json({
          success: true,
          donation,
        });
      } catch (error) {
        console.error("Error retrieving product:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Edit Donation
    app.put("/api/v1/donations/:id", async (req, res) => {
      try {
        const donationId = req.params.id;
        const { image, category, title, amount, description } = req.body;

        const existingDonation = await donationsCollection.findOne({
          _id: new ObjectId(donationId),
        });
        if (!existingDonation) {
          return res.status(404).json({
            success: false,
            message: "Donation not found",
          });
        }

        await donationsCollection.updateOne(
          { _id: new ObjectId(donationId) },
          {
            $set: {
              image,
              category,
              title,
              amount,
              description,
              timestamp: new Date(),
            },
          }
        );

        res.json({
          success: true,
          message: "Donation updated successfully",
        });
      } catch (error) {
        console.error("Error updating donation:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Delete Donation
    app.delete("/api/v1/donations/:id", async (req, res) => {
      try {
        const donationId = req.params.id;

        const existingDonation = await donationsCollection.findOne({
          _id: new ObjectId(donationId),
        });
        if (!existingDonation) {
          return res.status(404).json({
            success: false,
            message: "Donation not found",
          });
        }

        await donationsCollection.deleteOne({
          _id: new ObjectId(donationId),
        });

        res.json({
          success: true,
          message: "Donation deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting donation:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
