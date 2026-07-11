// onetwenty-backend/src/db/seed.ts
import { db } from './index.js';
import { categories } from './schema.js';

const data = [
  // ── GROUP I ──────────────────────────────────────────
  { group:1, srNo:'1.1', majorHead:'Sports, Arts & Cultural Activities', name:'Sports/Games/Arts — Participation', scoringType:'level_based', scoringTable:{college:1,zonal:5,state:10,national:20,international:40}, maxPoints:40 },
  { group:1, srNo:'1.2', majorHead:'Sports, Arts & Cultural Activities', name:'Sports/Games/Arts — Winners (Single Events)', scoringType:'level_based', scoringTable:{college:5,zonal:10,state:20,national:40,international:40}, maxPoints:40 },
  { group:1, srNo:'1.3', majorHead:'Sports, Arts & Cultural Activities', name:'Sports/Games/Arts — Winners (Group Events)', scoringType:'level_based', scoringTable:{college:3,zonal:5,state:15,national:30,international:40}, maxPoints:40 },
  { group:1, srNo:'1.4', majorHead:'Sports, Arts & Cultural Activities', name:'College Magazine Publication', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:20, specialConditions:{capIsAnnual:true} },
  { group:1, srNo:'1.5', majorHead:'Sports, Arts & Cultural Activities', name:'Four-wheeler License', scoringType:'flat', maxPoints:5, specialConditions:{mustBeDuringProgramme:true} },

  { group:1, srNo:'1.6', majorHead:'Community Outreach & Social Initiatives', name:'Community Service (Two Days)', scoringType:'flat', maxPoints:5, sharedCapGroup:'g1_community_service_1.6_1.7' },
  { group:1, srNo:'1.7', majorHead:'Community Outreach & Social Initiatives', name:'Community Service (Up to One Week)', scoringType:'flat', maxPoints:10, sharedCapGroup:'g1_community_service_1.6_1.7' },
  { group:1, srNo:'1.8', majorHead:'Community Outreach & Social Initiatives', name:'Blood Donation', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:10 },
  { group:1, srNo:'1.9', majorHead:'Community Outreach & Social Initiatives', name:'THRIVE Project', scoringType:'per_unit_capped', scoringTable:{perInstance:10}, maxPoints:20, specialConditions:{perSemester:true} },
  { group:1, srNo:'1.10', majorHead:'Community Outreach & Social Initiatives', name:'Tree Planting', scoringType:'flat', maxPoints:5, specialConditions:{requiresGeoTagCert:true} },

  { group:1, srNo:'1.11', majorHead:'NSS/NCC', name:'NSS Volunteer — 2yr Completion', scoringType:'flat', maxPoints:30, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.12', majorHead:'NSS/NCC', name:'University Leadership Camp (100hr)', scoringType:'flat', maxPoints:20, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.13', majorHead:'NSS/NCC', name:'State-Level NSS Festival Winner', scoringType:'flat', maxPoints:15, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.14', majorHead:'NSS/NCC', name:'Special Service Certificate', scoringType:'flat', maxPoints:15, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.15', majorHead:'NSS/NCC', name:'State/National Award Recipient', scoringType:'tiered', scoringTable:{state:15,national:25}, maxPoints:25, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.16', majorHead:'NSS/NCC', name:'National Camps/NIC/NYF/Pre-RDC', scoringType:'flat', maxPoints:15, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.17', majorHead:'NSS/NCC', name:'10-Day Volunteer Service (50hrs)', scoringType:'flat', maxPoints:15, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.18', majorHead:'NSS/NCC', name:'RDC/IDC or International NSS/NCC Event', scoringType:'flat', maxPoints:25, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },
  { group:1, srNo:'1.19', majorHead:'NSS/NCC', name:'NCC Certificates', scoringType:'tiered', scoringTable:{certB:20,certC:30,oneYearParade:10}, maxPoints:30, sharedCapGroup:'g1_nss_ncc_1.11_1.19' },

  { group:1, srNo:'1.20', majorHead:'Health, Safety & Essential Life Skills', name:'Emergency Response/First Aid/CPR/Fire Safety', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:10, sharedCapGroup:'g1_health_safety_1.20_1.21' },
  { group:1, srNo:'1.21', majorHead:'Health, Safety & Essential Life Skills', name:'Basic Swimming Certification', scoringType:'flat', maxPoints:5, sharedCapGroup:'g1_health_safety_1.20_1.21' },

  { group:1, srNo:'1.22', majorHead:'Union/Club Activities', name:'College Union Members', scoringType:'tiered', scoringTable:{officeBearer:20,execCommittee:15,universityOfficeBearer:30,universityMember:25}, maxPoints:30 },
  { group:1, srNo:'1.23', majorHead:'Union/Club Activities', name:'Magazine Editorial Board (non-editor)', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:10, sharedCapGroup:'g1_union_club_1.23_1.24', specialConditions:{maxStudentsPerYear:8} },
  { group:1, srNo:'1.24', majorHead:'Union/Club Activities', name:'Hobby Clubs (Exec/Convenor)', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:10, sharedCapGroup:'g1_union_club_1.23_1.24' },

  // ── GROUP II ─────────────────────────────────────────
  { group:2, srNo:'2.1', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Tech-Fest — Participation', scoringType:'level_based', scoringTable:{college:2,zonal:5,state:10,national:20,international:30}, maxPoints:40, sharedCapGroup:'g2_techfest_2.1_2.4' },
  { group:2, srNo:'2.2', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Tech-Fest — Winners', scoringType:'level_based', scoringTable:{college:5,zonal:10,state:20,national:40,international:40}, maxPoints:40, sharedCapGroup:'g2_techfest_2.1_2.4' },
  { group:2, srNo:'2.3', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Professional Society Events — Participation', scoringType:'level_based', scoringTable:{college:2,zonal:5,state:10,national:15,international:20}, maxPoints:40, sharedCapGroup:'g2_techfest_2.1_2.4' },
  { group:2, srNo:'2.4', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Professional Society Events — Winners', scoringType:'level_based', scoringTable:{college:3,zonal:7,state:15,national:25,international:35}, maxPoints:40, sharedCapGroup:'g2_techfest_2.1_2.4' },
  { group:2, srNo:'2.5', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Conferences/Seminars/Webinars/Workshops/STTPs', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:15, specialConditions:{excludeIfCollegeFest:true} },
  { group:2, srNo:'2.6', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Poster Presentation — Participation', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:15, specialConditions:{verifyCapGrouping:true} },
  { group:2, srNo:'2.7', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Paper Presentation — Participation (IITs etc.)', scoringType:'per_unit_capped', scoringTable:{perInstance:10}, maxPoints:40, sharedCapGroup:'g2_paper_2.7_2.10' },
  { group:2, srNo:'2.8', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Paper Presentation — Winners (IITs etc.)', scoringType:'tiered', scoringTable:{first:20,secondThird:15}, maxPoints:40, sharedCapGroup:'g2_paper_2.7_2.10' },
  { group:2, srNo:'2.9', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Paper Presentation — Participation (KTU affiliated)', scoringType:'per_unit_capped', scoringTable:{perInstance:5}, maxPoints:40, sharedCapGroup:'g2_paper_2.7_2.10' },
  { group:2, srNo:'2.10', majorHead:'Technical Events, Competitions & Academic Presentations', name:'Paper Presentation — Winners (KTU affiliated)', scoringType:'tiered', scoringTable:{first:10,secondThird:7}, maxPoints:40, sharedCapGroup:'g2_paper_2.7_2.10' },

  { group:2, srNo:'2.11', majorHead:'Leadership & Management', name:'Professional Society Membership (min 2yr)', scoringType:'tiered', scoringTable:{member:5,execCommittee:10,secretaryChairLead:15,coordinatorPerEvent:5}, maxPoints:15 },
  { group:2, srNo:'2.12', majorHead:'Leadership & Management', name:'Dept. Student Association Activities', scoringType:'tiered', scoringTable:{execOfficeBearerPerYear:5,coordinatorPerEvent:5}, maxPoints:10 },
  { group:2, srNo:'2.13', majorHead:'Leadership & Management', name:'Class Representative', scoringType:'flat', maxPoints:10, specialConditions:{onePerClassPerYear:5} },
  { group:2, srNo:'2.14', majorHead:'Leadership & Management', name:'Industrial Visit Coordinator (min 6 days)', scoringType:'flat', maxPoints:5, specialConditions:{maxPerClass:2} },
  { group:2, srNo:'2.15', majorHead:'Leadership & Management', name:'Placement Cell (min 1yr)', scoringType:'tiered', scoringTable:{execCommitteePerClass:5,coordinator:10}, maxPoints:10, sharedCapGroup:'g2_leadership_2.15_2.18', requiresManualVerification:true, specialConditions:{maxCoordinators:2,atLeastOneFemale:true} },
  { group:2, srNo:'2.16', majorHead:'Leadership & Management', name:'IEDC Cell (min 1yr)', scoringType:'tiered', scoringTable:{execOfficeBearerPerYear:5,coordinatorPerEvent:5}, maxPoints:10, sharedCapGroup:'g2_leadership_2.15_2.18' },
  { group:2, srNo:'2.17', majorHead:'Leadership & Management', name:'YIP (K-DISC, min 1yr)', scoringType:'flat', maxPoints:10, sharedCapGroup:'g2_leadership_2.15_2.18' },
  { group:2, srNo:'2.18', majorHead:'Leadership & Management', name:'STRIDE (K-DISC, min 1yr)', scoringType:'tiered', scoringTable:{certifiedVolunteer:5,membership:5,leadershipRole:10,highImpactL1:10,highImpactL2:15,highImpactL5:20}, maxPoints:20, sharedCapGroup:'g2_leadership_2.15_2.18' },

  { group:2, srNo:'2.19', majorHead:'FOSS Activities & Open-Source Contributions', name:'ICFOSS/FOSS Club Activities (min 1yr)', scoringType:'tiered', scoringTable:{member2Activities:5,studentLead:10,workshopParticipation:5,hackathonParticipation:5,openSourceContribution:10,fossInternship15Days:10}, maxPoints:20 },
  { group:2, srNo:'2.20', majorHead:'Short-Term Internship', name:'Short-Term Internship / Clinical Exposure (min 2wks)', scoringType:'flat', maxPoints:10 },
  { group:2, srNo:'2.21', majorHead:'Standardized Tests & Proficiency Certifications', name:'English Proficiency Certification', scoringType:'tiered', scoringTable:{toefl:{105:30,95:25,80:20},ielts:{7.5:30,7.0:25,6.5:20},pte:{76:30,65:25,58:20},bec:{c1:25,b2:20,b1:15}}, maxPoints:30, specialConditions:{mustBeDuringProgramme:true} },
  { group:2, srNo:'2.22', majorHead:'Standardized Tests & Proficiency Certifications', name:'Aptitude Proficiency Certification', scoringType:'tiered', scoringTable:{gre:{320:30,310:25,300:20},gate:{top5000:30,top15000:25,qualified:20},cat:{95:30,90:25,85:20},gmat:{700:30,650:25,600:20}}, maxPoints:30, specialConditions:{mustBeDuringProgramme:true} },

  // ── GROUP III ────────────────────────────────────────
  { group:3, srNo:'3.1', majorHead:'Industry Exposure, Academic Projects & Internships', name:'Industrial Visit/Training Report (S5/S6)', scoringType:'flat', maxPoints:5, sharedCapGroup:'g3_industry_3.1_3.2', specialConditions:{minIndustriesVisited:4} },
  { group:3, srNo:'3.2', majorHead:'Industry Exposure, Academic Projects & Internships', name:'Best Mini Project/Project/Seminar', scoringType:'flat', maxPoints:5, sharedCapGroup:'g3_industry_3.1_3.2', specialConditions:{minClassStrength:30} },
  { group:3, srNo:'3.3', majorHead:'Industry Exposure, Academic Projects & Internships', name:'Long-Term Internship', scoringType:'flat', maxPoints:15, specialConditions:{minDurationMonths:3.5} },
  { group:3, srNo:'3.4', majorHead:'Industry Exposure, Academic Projects & Internships', name:'LEAP — IIT Madras Incubation Bootcamps', scoringType:'tiered', scoringTable:{bootcamp:10,coursePerCourse:15,projectPrototype:20}, maxPoints:30 },
  { group:3, srNo:'3.5', majorHead:'Industry Exposure, Academic Projects & Internships', name:'YIP — Young Innovators Programme', scoringType:'tiered', scoringTable:{ideaSubmitted:5,preliminaryWinner:10,districtWinner:20,stateWinner:35}, maxPoints:35 },
  { group:3, srNo:'3.6', majorHead:'Industry Exposure, Academic Projects & Internships', name:'STRIDE (Group III)', scoringType:'tiered', scoringTable:{ideaSubmitted:5,top100:10,top30:20,stateWinner:35}, maxPoints:35 },
  { group:3, srNo:'3.7', majorHead:'Industry Exposure, Academic Projects & Internships', name:'GDC AI Workforce Internship', scoringType:'tiered', scoringTable:{aiGradingTest:5,learningTrack:15,fellowshipCoursework:25,sixMonthInternship:35}, maxPoints:35 },
  { group:3, srNo:'3.8', majorHead:'Industry Exposure, Academic Projects & Internships', name:'ICFOSS Working Solution', scoringType:'flat', maxPoints:25 },

  { group:3, srNo:'3.9', majorHead:'Innovation, Entrepreneurship & IPR', name:'Start-up Company (Legally Registered)', scoringType:'flat', maxPoints:30, sharedCapGroup:'g3_innovation_ipr_3.9_3.13' },
  { group:3, srNo:'3.10', majorHead:'Innovation, Entrepreneurship & IPR', name:'Patents', scoringType:'tiered', scoringTable:{filed:20,published:30,granted:40,licensed:40}, maxPoints:40, sharedCapGroup:'g3_innovation_ipr_3.9_3.13' },
  { group:3, srNo:'3.11-A', majorHead:'Innovation, Entrepreneurship & IPR', name:'Prototype Development & Testing', scoringType:'flat', maxPoints:40, sharedCapGroup:'g3_innovation_ipr_3.9_3.13' },
  { group:3, srNo:'3.11-B', majorHead:'Innovation, Entrepreneurship & IPR', name:'Innovative Technologies Adopted by Industry', scoringType:'flat', maxPoints:40, sharedCapGroup:'g3_innovation_ipr_3.9_3.13' },
  { group:3, srNo:'3.12', majorHead:'Innovation, Entrepreneurship & IPR', name:'Venture Capital / Angel Funding', scoringType:'flat', maxPoints:40, sharedCapGroup:'g3_innovation_ipr_3.9_3.13' },
  { group:3, srNo:'3.13', majorHead:'Innovation, Entrepreneurship & IPR', name:'Societal Innovations', scoringType:'flat', maxPoints:40, sharedCapGroup:'g3_innovation_ipr_3.9_3.13' },

  { group:3, srNo:'3.14', majorHead:'Research Publications & Scholarly Output', name:'Research Publication in Reputed Journals', scoringType:'tiered', scoringTable:{q1q2:40,q3q4:25}, maxPoints:40 },
  { group:3, srNo:'3.15', majorHead:'National & International Hackathons', name:'National Hackathons', scoringType:'tiered', scoringTable:{first:40,second:35,third:30}, maxPoints:40 },
  { group:3, srNo:'3.16', majorHead:'National & International Hackathons', name:'International Hackathons', scoringType:'tiered', scoringTable:{first:40,secondThird:35,participation:30}, maxPoints:40 },
  { group:3, srNo:'3.17', majorHead:'Skill Development Courses', name:'Skilling Certificates', scoringType:'hourly', scoringTable:{pointsPerHour:1}, maxPoints:40, requiresManualVerification:true, specialConditions:{mustBeOnApprovedCourseList:true} },
];

async function seed() {
  await db.insert(categories).values(data as any);
  console.log(`Seeded ${data.length} sub-activity categories.`);
}
seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });