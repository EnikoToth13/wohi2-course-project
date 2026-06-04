const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");
const { NotFoundError, ValidationError } = require('../lib/errors');
const { z } = require("zod");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const QuestionInput = z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    keywords: z.union([z.string(), z.array(z.string())]).optional()
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'quiz_game_uploads', // The folder name that will appear in your Cloudinary account
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image")) {
            cb(null, true);
        } else {
            cb(new ValidationError("Only image files are allowed"));
        }
    },
    limits: {fileSize: 5 * 1024 * 1024}
});

function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}


function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user ? question.user.name : null,
    attempted: question.attempts && question.attempts.length > 0,
    attemptCount: question._count?.attempts ?? 0,
    user: undefined,
    _count: undefined,
    attempts: undefined
  };
}

router.use(authenticate)

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError ||
        err?.message === "Only image files are allowed") {
        return res.status(400).json({ msg: err.message });
    }
    next(err);
});

fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new ValidationError("Only image files are allowed"));
}

// GET /api/questions/, /api/questions?keyword=http&page=1&limit=5, /api/questions?difficulty=EASY
// List all questions
router.get("/", async (req, res) => {
    const {keyword, difficulty} = req.query;

    const where = {};
    if (keyword) where.keywords = { some: { name: keyword } };
    if (difficulty) where.difficulty = difficulty.toUpperCase();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
    const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all([prisma.question.findMany({
        where,
        include: {
            keywords: true, 
            user: true,
            attempts: {where: {userId: req.user.userId}, take: 1},
            _count: { select: {attempts: true} }
        },
        orderBy: {id: "asc"},
        skip,
        take: limit
    }), prisma.question.count({where})]);

    res.json({
        data: filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

// GET /api/questions/:qId
router.get("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { 
            keywords: true, 
            user: true,
            attempts: {where: {userId: req.user.userId}, take: 1},
            _count: { select: {attempts: true} }
        }
    });

    if (!question) {
        throw new NotFoundError("Question not found");
    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {

    const {question, answer, keywords, difficulty} = QuestionInput.parse(req.body);

    const keywordsArray = parseKeywords(keywords);
    const imageUrl = req.file ? req.file.path : null;
    const newQuestion = await prisma.question.create({
    data: {
      question, answer, imageUrl, difficulty,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true, user: true },
  });
  res.status(201).json(formatQuestion(newQuestion));
});

// PUT api/questions/:qId
router.put("/:qId", isOwner, upload.single("image"), async (req, res) => {
    const qId = Number(req.params.qId);
    const questionId =  await prisma.question.findUnique({ where: { id: qId } });
    const {question, answer, keywords, difficulty} = QuestionInput.parse(req.body);

    /*const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { keywords: true, user: true },
    });*/

    if (!questionId) {
        throw new NotFoundError("Question not found");
    }

    if (!question || !answer) {
        throw new ValidationError("question and answer are required")
    }
    const imageUrl = req.file ? req.file.path : questionId.imageUrl;

    const keywordsArray = parseKeywords(keywords);
    const updatedQuestion = await prisma.question.update({
        where: { id: qId },
        data: {
            question, answer, imageUrl, difficulty,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true, user: true },
    });
  res.json(formatQuestion(updatedQuestion));
});

// DELETE /api/questions/:qId
router.delete("/:qId", isOwner, async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { keywords: true, user: true },
    });

    if (!question) {
        throw new NotFoundError("Question not found");
    }

    await prisma.attempt.deleteMany({ where: { questionId: qId } });
    await prisma.question.delete({ where: { id: qId } });

    res.json({
        msg: "Question deleted succesfully",
        question: formatQuestion(question),
    });
});

//POST /api/questions/:qId/play
router.post("/:qId/play", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({where: {id: qId}});

    const { answer } = req.body;

    if (!question) {
        throw new NotFoundError("Question not found");
    }

    const isCorrect = question.answer.toLowerCase().trim() === answer?.toLowerCase().trim();

    const attempt = await prisma.attempt.upsert({
        where: {userId_questionId: {userId: req.user.userId, questionId: qId}},
        update: {},
        create:{userId: req.user.userId, questionId: qId}
    });

    const attemptCount = await prisma.attempt.count({where: {questionId: qId}});

    res.status(201).json({
        id: attempt.id,
        qId,
        attempted: true,
        attemptCount,
        correct: isCorrect,
        answer: question.answer,
        createdAt: attempt.createdAt
    });
});

//DELETE /api/questions/:qId/play
router.delete("/:qId/play", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({where: {id: qId}});
    if (!question) {
        throw new NotFoundError("Question not found");
    }

    const attempt = await prisma.attempt.deleteMany({
        where: {userId: req.user.userId, questionId: qId}
    });

    const attemptCount = await prisma.attempt.count({where: {questionId: qId}});

    res.json({
        qId,
        attempted: false,
        attemptCount
    });
});

module.exports = router;