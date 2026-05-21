const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    id: 1,
    question: "What is the capital of Finland?",
    answer: "Helsinki",
    keywords: ["capital", "finland"]
  },
  {
    id: 2,
    question: "What is 2+2?",
    answer: "4",
    keywords: ["addition", "2"]
  },
  {
    id: 3,
    question: "What is the capital of Hungary?",
    answer: "Budapest",
    keywords: ["capital", "hungary"]
  },
  {
    id: 4,
    question: "What is 3+3?",
    answer: "6",
    keywords: ["addition", "3"]
  },
];

async function main() {
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "example@example.org",
      password: hashedPassword,
      name: "Example User"
  }
  });
  console.log("Create user:", user.email);

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        userId: user.id,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
