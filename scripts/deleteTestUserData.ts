import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database cleanup...');

  // Delete in order to respect foreign key constraints
  console.log('Deleting CardRoomLinks...');
  await prisma.cardRoomLink.deleteMany();
  
  console.log('Deleting Cards...');
  await prisma.card.deleteMany();
  
  console.log('Deleting PlanningRooms...');
  await prisma.planningRoom.deleteMany();
  
  console.log('Deleting Users...');
  await prisma.user.deleteMany();

  console.log('Database has been cleared successfully!');
}

main()
  .catch(e => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 