const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prismaClient = new PrismaClient();

// List of roles to use in the seed
const roles = ["STUDENT", "LECTURER", "HOD", "ADMIN", "REGISTRAR", "STAFF"];

async function main() {
  // Seeding users with different roles
  await Promise.all(
    roles.map(async (role) => {
      const email = `${role.toLowerCase()}@example.com`;
      const existingUser = await prismaClient.user.findUnique({ where: { email } });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('password123', 12); // Hash the password
        const user = await prismaClient.user.create({
          data: {
            email,
            password: hashedPassword, // Store the hashed password
            role: role,
          },
        });
        console.log(`Seeded user: ${user.email}`);
        return user;
      } else {
        console.log(`User with email ${email} already exists.`);
      }
    })
  );

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });