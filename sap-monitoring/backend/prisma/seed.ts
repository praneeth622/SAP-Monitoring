import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.system.create({
    data: {
      system_id: "SYS1",
      client: "CLI1",
      system_name: "System 1",
      system_url: "http://system1.com",
      system_type: "type1",
      polling_status: "OK",
      connection_status: "OK",
      description: "A description of System 1",
    }
  });
  console.log("System seeded!");
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
