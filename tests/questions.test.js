const { question } = require("../src/lib/prisma");
const { resetDb, registerAndLogin, request, app, prisma } = require("./helpers");

beforeEach(resetDb);

describe("question tests", () => {
    it("returns 401 without a token", async () => {
        const res = await request(app).get("/api/questions");
        expect(res.status).toBe(401);
    });

    it("returns 404 for unknown post", async () => {
        const token = await registerAndLogin();
        const res = await request(app).get("/api/questions/99999")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Question not found");
    });

    it("returns 400 for invalid question body", async () => {
        const token = await registerAndLogin();
        const res = await request(app).post("/api/questions")
            .set("Authorization", `Bearer ${token}`)
            .send({ question: "" });
        expect(res.status).toBe(400);
    });
});