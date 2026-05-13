const jwt = require("jsonwebtoken");
const { ForbiddenError, UnauthorizedError } = require("../lib/errors");
const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next){
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
        throw new UnauthorizedError("No token provided");
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch(err) {
        req.log.warn({}, "Error authenticating");
        throw new ForbiddenError("Invalid or expires token");
    }
}

module.exports = authenticate;