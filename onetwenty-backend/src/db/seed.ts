import { db } from './index.js';
import { categories } from './schema.js';

const data = [
  { group: 1, name: 'Sports/Games/Arts', maxPoints: 40 },
  { group: 1, name: 'College Magazine Publication', maxPoints: 20 },
  { group: 1, name: 'Four-wheeler License', maxPoints: 5 },
  { group: 1, name: 'Community Service (2 days–1 week)', maxPoints: 10 },
  { group: 1, name: 'Blood Donation', maxPoints: 10 },
  { group: 1, name: 'THRIVE Project', maxPoints: 20 },
  { group: 1, name: 'Tree Planting', maxPoints: 5 },
  { group: 1, name: 'NSS/NCC', maxPoints: 40 },
  { group: 1, name: 'Health & Safety Training', maxPoints: 10 },
  { group: 1, name: 'Basic Swimming Certification', maxPoints: 5 },
  { group: 1, name: 'College Union Membership', maxPoints: 30 },
  { group: 1, name: 'Magazine Editorial Board', maxPoints: 10 },

  { group: 2, name: 'Tech-Fest / Professional Society Events', maxPoints: 40 },
  { group: 2, name: 'Conferences/Workshops/Poster Presentation', maxPoints: 15 },
  { group: 2, name: 'Paper Presentation', maxPoints: 40 },
  { group: 2, name: 'Professional Society Membership', maxPoints: 15 },
  { group: 2, name: 'Dept. Student Association', maxPoints: 10 },
  { group: 2, name: 'Class Representative', maxPoints: 10 },
  { group: 2, name: 'Industrial Visit Coordinator', maxPoints: 5 },
  { group: 2, name: 'Placement Cell', maxPoints: 10 },
  { group: 2, name: 'IEDC Cell', maxPoints: 10 },
  { group: 2, name: 'YIP (K-DISC)', maxPoints: 10 },
  { group: 2, name: 'STRIDE (K-DISC)', maxPoints: 20 },
  { group: 2, name: 'FOSS/ICFOSS Activities', maxPoints: 20 },
  { group: 2, name: 'Short-Term Internship', maxPoints: 10 },
  { group: 2, name: 'English Proficiency Certification', maxPoints: 30 },
  { group: 2, name: 'Aptitude Proficiency Certification', maxPoints: 30 },

  { group: 3, name: 'Industrial Visit/Training Report', maxPoints: 20 },
  { group: 3, name: 'Long-Term Internship', maxPoints: 15 },
  { group: 3, name: 'LEAP Bootcamps (IIT-M)', maxPoints: 30 },
  { group: 3, name: 'YIP (Group III)', maxPoints: 35 },
  { group: 3, name: 'STRIDE (Group III)', maxPoints: 35 },
  { group: 3, name: 'GDC AI Workforce Internship', maxPoints: 35 },
  { group: 3, name: 'ICFOSS Working Solution', maxPoints: 25 },
  { group: 3, name: 'Startup/Patent/Prototype/IPR', maxPoints: 40 },
  { group: 3, name: 'Research Publication', maxPoints: 40 },
  { group: 3, name: 'National Hackathons', maxPoints: 40 },
  { group: 3, name: 'International Hackathons', maxPoints: 40 },
  { group: 3, name: 'Skilling Certificates', maxPoints: 40 },
];

async function seed() {
  await db.insert(categories).values(data);
  console.log(`Seeded ${data.length} categories.`);
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});