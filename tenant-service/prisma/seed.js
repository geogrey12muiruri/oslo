const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Tenant 1: Nairobi University
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'The Nairobi University',
      domain: 'thenairobiuni.ac.ke',
      email: 'theadmin3@nairobiuni.ac.ke',
      type: 'UNIVERSITY',
      status: 'ACTIVE',
      createdBy: 'thesuperadmin1@nairobiuni.ac.ke',
      address: 'Nairobi, Kenya',
      phone: '+254 123 456 789',
    },
  });

  const users1 = await prisma.user.createMany({
    data: [
      { email: 'thesuperadmin1@nairobiuni.ac.ke', role: 'SUPER_ADMIN', firstName: 'John', lastName: 'Admin', verified: true, tenantId: tenant1.id },
      { email: 'student@nairobiuni.ac.ke', role: 'STUDENT', firstName: 'Alice', lastName: 'Mwangi', verified: true, tenantId: tenant1.id },
      { email: 'lecturer@nairobiuni.ac.ke', role: 'LECTURER', firstName: 'Peter', lastName: 'Kimani', verified: true, tenantId: tenant1.id },
      { email: 'hod1@nairobiuni.ac.ke', role: 'HOD', firstName: 'Mary', lastName: 'Wambui', verified: true, tenantId: tenant1.id },
      { email: 'admin@nairobiuni.ac.ke', role: 'ADMIN', firstName: 'James', lastName: 'Otieno', verified: true, tenantId: tenant1.id },
      { email: 'registrar@nairobiuni.ac.ke', role: 'REGISTRAR', firstName: 'Susan', lastName: 'Njeri', verified: true, tenantId: tenant1.id },
      { email: 'staff@nairobiuni.ac.ke', role: 'STAFF', firstName: 'David', lastName: 'Kamau', verified: true, tenantId: tenant1.id },
      { email: 'auditorg@nairobiuni.ac.ke', role: 'AUDITOR_GENERAL', firstName: 'Grace', lastName: 'Mumbi', verified: true, tenantId: tenant1.id },
      { email: 'auditor@nairobiuni.ac.ke', role: 'AUDITOR', firstName: 'Paul', lastName: 'Kiptoo', verified: true, tenantId: tenant1.id },
      { email: 'hod2@nairobiuni.ac.ke', role: 'HOD', firstName: 'Esther', lastName: 'Njoroge', verified: true, tenantId: tenant1.id },
      { email: 'hod3@nairobiuni.ac.ke', role: 'HOD', firstName: 'Michael', lastName: 'Ochieng', verified: true, tenantId: tenant1.id },
    ],
  });

  const hod1 = await prisma.user.findUnique({ where: { email: 'hod1@nairobiuni.ac.ke' } });
  const hod2 = await prisma.user.findUnique({ where: { email: 'hod2@nairobiuni.ac.ke' } });
  const hod3 = await prisma.user.findUnique({ where: { email: 'hod3@nairobiuni.ac.ke' } });

  const departments1 = await prisma.department.createMany({
    data: [
      { name: 'Computer Science', code: 'CS', tenantId: tenant1.id, headId: hod1.id },
      { name: 'Mathematics', code: 'MATH', tenantId: tenant1.id, headId: hod2.id },
      { name: 'Physics', code: 'PHYS', tenantId: tenant1.id, headId: hod3.id },
    ],
  });

  await prisma.user.updateMany({
    where: { email: { in: ['student@nairobiuni.ac.ke', 'lecturer@nairobiuni.ac.ke'] } },
    data: { departmentId: (await prisma.department.findFirst({ where: { name: 'Computer Science', tenantId: tenant1.id } })).id },
  });

  // Tenant 2: Kisumu College
  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Kisumu College',
      domain: 'kisumucollege.ac.ke',
      email: 'admin@kisumucollege.ac.ke',
      type: 'COLLEGE',
      status: 'PENDING',
      createdBy: 'superadmin@kisumucollege.ac.ke',
      address: 'Kisumu, Kenya',
      phone: '+254 987 654 321',
    },
  });

  const users2 = await prisma.user.createMany({
    data: [
      { email: 'superadmin@kisumucollege.ac.ke', role: 'SUPER_ADMIN', firstName: 'Linda', lastName: 'Achieng', verified: true, tenantId: tenant2.id },
      { email: 'student@kisumucollege.ac.ke', role: 'STUDENT', firstName: 'Brian', lastName: 'Omondi', verified: true, tenantId: tenant2.id },
      { email: 'lecturer@kisumucollege.ac.ke', role: 'LECTURER', firstName: 'Jane', lastName: 'Atieno', verified: true, tenantId: tenant2.id },
      { email: 'hod1@kisumucollege.ac.ke', role: 'HOD', firstName: 'Tom', lastName: 'Okoth', verified: true, tenantId: tenant2.id },
      { email: 'admin@kisumucollege.ac.ke', role: 'ADMIN', firstName: 'Ruth', lastName: 'Akinyi', verified: true, tenantId: tenant2.id },
      { email: 'registrar@kisumucollege.ac.ke', role: 'REGISTRAR', firstName: 'Mark', lastName: 'Odhiambo', verified: true, tenantId: tenant2.id },
      { email: 'staff@kisumucollege.ac.ke', role: 'STAFF', firstName: 'Faith', lastName: 'Anyango', verified: true, tenantId: tenant2.id },
      { email: 'auditorg@kisumucollege.ac.ke', role: 'AUDITOR_GENERAL', firstName: 'Chris', lastName: 'Owino', verified: true, tenantId: tenant2.id },
      { email: 'auditor@kisumucollege.ac.ke', role: 'AUDITOR', firstName: 'Nancy', lastName: 'Adhiambo', verified: true, tenantId: tenant2.id },
      { email: 'hod2@kisumucollege.ac.ke', role: 'HOD', firstName: 'Daniel', lastName: 'Ogutu', verified: true, tenantId: tenant2.id },
    ],
  });

  const hod1Kc = await prisma.user.findUnique({ where: { email: 'hod1@kisumucollege.ac.ke' } });
  const hod2Kc = await prisma.user.findUnique({ where: { email: 'hod2@kisumucollege.ac.ke' } });

  const departments2 = await prisma.department.createMany({
    data: [
      { name: 'Business', code: 'BUS', tenantId: tenant2.id, headId: hod1Kc.id },
      { name: 'Education', code: 'EDU', tenantId: tenant2.id, headId: hod2Kc.id },
    ],
  });

  await prisma.user.updateMany({
    where: { email: { in: ['student@kisumucollege.ac.ke', 'lecturer@kisumucollege.ac.ke'] } },
    data: { departmentId: (await prisma.department.findFirst({ where: { name: 'Business', tenantId: tenant2.id } })).id },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });