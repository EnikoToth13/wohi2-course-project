const { registerAndLogin, request, app, prisma } = require("./helpers");

it("clamps limit above 100 to 100", async () => {
    const token = await registerAndLogin();
    const res = await request(app).get("/api/questions?limit=999")
        .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);   // clamped, not 999
});

it("treats page=0 and page=-1 as page=1", async () => {
    const token = await registerAndLogin();
    const a = await request(app).get("/api/questions?page=0")
        .set("Authorization", `Bearer ${token}`);
    const b = await request(app).get("/api/questions?page=-1")
        .set("Authorization", `Bearer ${token}`);
    expect(a.body.page).toBe(1);
    expect(b.body.page).toBe(1);
});
