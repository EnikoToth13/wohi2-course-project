const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
  };
}

router.use(authenticate)

// GET /api/questions/, /api/questions?keyword=http
// List all questions
router.get("/", async (req, res) => {
    const {keyword} = req.query;

    const where = keyword ? 
    { keywords: { some: { name: keyword } } } : {};

    const filteredQuestions = await prisma.question.findMany({
        where,
        include: {keywords: true},
        orderBy: {id: "asc"},
    });

    res.json(filteredQuestions.map(formatQuestion));
});

// GET /api/questions/:qId
router.get("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { keywords: true },
    });

    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", async (req, res) => {
    const {question, answer, keywords} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];

    const newQuestion = await prisma.question.create({
    data: {
      question, answer,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true },
  });
  res.status(201).json(formatQuestion(newQuestion));
});

// PUT api/questions/:qId
router.put("/:qId", isOwner, async (req, res) => {
    const qId = Number(req.params.qId);
    const questionId =  await prisma.question.findUnique({ where: { id: qId } });

    if (!questionId) {
        return res.status(404).json({msg: "Question not found"});
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
        where: { id: qId },
        data: {
            question, answer,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    });
  res.json(formatQuestion(updatedQuestion));
});

// DELETE /api/questions/:qId
router.delete("/:qId", isOwner, async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { keywords: true },
    });

    if (!question) {
        return res.status(404).json({ message: "Post not found" });
    }

    await prisma.question.delete({ where: { id: qId } });

    res.json({
        msg: "Question deleted succesfully",
        question: formatQuestion(question),
    });
});

module.exports = router;