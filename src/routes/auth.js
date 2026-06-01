const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { ValidationError, ConflictError, UnauthorizedError, ForbiddenError } = require('../lib/errors');
const SECRET = process.env.JWT_SECRET;
const crypto = require("crypto");
const { sendConfirmationEmail } = require("../lib/emailer");

//POST /api/auth/register
router.post("/register", async(req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            throw new ValidationError("email, password and name are required");
        }
        
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ 
            where: { email }
        });

        if (existingUser) {
            throw new ConflictError("Email already registered");
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const confirmationToken = crypto.randomBytes(32).toString("hex");

        const user = await prisma.user.create({
            data: {
                email, 
                password: hashedPassword,
                name,
                confirmationToken: confirmationToken,
                isConfirmed: false
            }
        });

        await sendConfirmationEmail(user.email, confirmationToken);

        res.status(201).json({
            message: "Email verification sent! Check your inbox."
        });
    } catch (error) {
        console.error("REGISTRATION ERROR DETECTED:", error);
        res.status(500).json({ 
            error: "SignUp failed", 
            message: error.message 
        });
    }
})

//POST /api/auth/login
router.post("/login", async(req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new ValidationError("email and password are required");
        }

        //find user
        const user = await prisma.user.findUnique({
            where: {email}
        });

        if (!user) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            throw new ValidationError("Invalid credentials");
        }

        if (!user.isConfirmed) {
            return res.status(403).json({ 
                message: "Your email address has not been confirmed yet. Please check your inbox." 
            });
        }

        //generate token
        const token = jwt.sign({userId: user.id}, SECRET, {expiresIn: "1h"});

        res.json({ token });
    } catch (error) {
        next(error);
    }
});

router.get("/confirm", async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send("<h1>Invalid or missing token.</h1>");
        }

        const user = await prisma.user.findUnique({
            where: { confirmationToken: token }
        });

        if (!user) {
            return res.status(400).send("<h1>Link expired or invalid token.</h1>");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isConfirmed: true,
                confirmationToken: null
            }
        });

        res.redirect("https://wohi2-course-project-production-bbfa.up.railway.app/login?confirmed=true");
    } catch (error) {
        next(error);
    }
});

module.exports = router;