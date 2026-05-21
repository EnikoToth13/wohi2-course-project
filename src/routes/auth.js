const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { ValidationError, ConflictError, UnauthorizedError, ForbiddenError } = require('../lib/errors');
const SECRET = process.env.JWT_SECRET;

//POST /api/auth/register
router.post("/register", async(req, res) => {
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

    const user = await prisma.user.create({
        data: {
            email, password: hashedPassword,name
        }
    });

    const token = jwt.sign({userId: user.id}, SECRET, {expiresIn: "1h"});

    res.status(201).json({
        message: "User registered successfully",
        token
    });
})

//POST /api/auth/login
router.post("/login", async(req, res) => {
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

    //generate token
    const token = jwt.sign({userId: user.id}, SECRET, {expiresIn: "1h"});

    res.json({ token });
});

module.exports = router;