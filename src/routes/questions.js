const express = require('express');
const router = express.Router();

const questions = require("../data/questions");

// GET /api/questions/, /api/questions?keyword=http
// List all questions
router.get("/", (req, res) => {
    const {keyword} = req.query;

    if (!keyword) {
        return res.json(questions);
    }

    const filteredQuestions = questions.filter(q=>q.keywords.includes(keyword.toLowerCase()));
    res.json(filteredQuestions);
});

// GET /api/questions/:qId
router.get("/:qId", (req, res) => {
    const qId = Number(req.params.qId);
    const question = questions.find(q=>q.id === qId);
    if (!question) {
        return res.status(404).json({msg: "Question not found"});
    }
    res.json(question);
});

// POST /api/questions
router.post("/", (req, res) => {
    const {question, answer, keywords} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }
    const existingIds = questions.map(q=>q.id); //[1,2,3,4]
    const maxId = Math.max(...existingIds);
    const newQuestion = {
        id: questions.length ? maxId + 1 : 1,
        question, answer,
        keywords: Array.isArray(keywords) ? keywords : []
    }
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
})
// PUT api/questions/:qId
router.put("/:qId", (req, res) => {
    const qId = Number(req.params.qId);
    const questionId = questions.find(q=>q.id === qId);
    if (!questionId) {
        return res.status(404).json({msg: "Question not found"});
    }

    const {question, answer, keywords} = req.body;
    if (!question || !answer) {
        return res.status(400).json({msg: "question and answer are required"})
    }
    questionId.question = question;
    questionId.answer = answer;
    questionId.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(questionId);
});

// DELETE /api/questions/:qId
router.delete("/:qId", (req, res) => {
    const qId = Number(req.params.qId);
    const qIndex = questions.findIndex(q=> q.id === qId);

    if (qIndex === -1) {
        return res.status(404).json({msg: "Question not found"});
    }
    const deletedQuestion = questions.splice(qIndex, 1);
    res.json({
        msg: "Question deleted succesfully",
        question: deletedQuestion
    });
});

module.exports = router;