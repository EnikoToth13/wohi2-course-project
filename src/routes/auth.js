const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const SECRET = process.env.JWT_SECRET;

//POST /api/auth/register
router.post("/register", async(req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: "email, password and name are required" });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ 
        where: { email }
    });

    if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
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
        return res.status(400).json({ error: "email and password are required" });
    }

    //find user
    const user = await prisma.user.findUnique({
        where: {email}
    });

    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    //generate token
    const token = jwt.sign({userId: user.id}, SECRET, {expiresIn: "1h"});

    res.json({ token });
});

module.exports = router;