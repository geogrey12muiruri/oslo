const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Seed institutions
  const institution = await prisma.institution.create({
    data: {
      name: 'University of Nairobi',
      domain: 'uon.ac.ke',
      logoUrl: 'https://example.com/logo.png',
      address: 'P.O. Box 30197, Nairobi, Kenya',
      city: 'Nairobi',
      country: 'Kenya',
      phone: '+254 20 3318262',
      email: 'info@uon.ac.ke',
      type: 'PUBLIC',
      accreditationNumber: 'CUE/12345',
      establishedYear: 1956,
      timezone: 'Africa/Nairobi',
      currency: 'KES',
      status: 'ACTIVE',
      createdBy: 'super-admin-id', // Replace with actual Super Admin ID
    },
  });

  // Seed users
  const user = await prisma.user.create({
    data: {
      email: 'admin@uon.ac.ke',
      institutionId: institution.id,
      role: 'ADMIN',
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });