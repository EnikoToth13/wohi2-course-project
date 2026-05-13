const { NotFoundError, ForbiddenError } = require("../lib/errors");
const prisma = require("../lib/prisma");

async function isOwner(req, res, next) {
    const id = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: {id},
        include: {keywords: true}
    });
    if (!question) {
        throw new NotFoundError("Question not found");
    }
    if (question.userId !== req.user.userId) {
        throw new ForbiddenError("You can only modify your own questions");
    }

    req.question = question;
    next();
}

module.exports = isOwner;