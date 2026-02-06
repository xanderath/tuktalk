-- =====================================================
-- COMPLETE LEVEL CONTENT MIGRATION
-- Fixes constraint, adds levels 11-30, vocabulary for all levels
-- =====================================================

-- First, drop the existing constraint and add a new one for 1-30
ALTER TABLE public.vocabulary DROP CONSTRAINT IF EXISTS vocabulary_difficulty_level_check;
ALTER TABLE public.vocabulary ADD CONSTRAINT vocabulary_difficulty_level_check CHECK (difficulty_level >= 1 AND difficulty_level <= 30);

-- Add new stages (3-6)
INSERT INTO public.stages (id, name, description) VALUES
(3, 'Daily Life', 'Navigate everyday situations with confidence'),
(4, 'Professional', 'Thai for work and business settings'),
(5, 'Travel & Adventure', 'Explore Thailand like a local'),
(6, 'Cultural Immersion', 'Deep dive into Thai culture and traditions')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Add levels 11-30
INSERT INTO public.levels (id, stage_id, level_number, environment_name, is_free, game_world_config) VALUES
(11, 3, 11, 'Laundry Shop', FALSE, '{"mechanic": "service_request", "scene": "laundry"}'),
(12, 3, 12, 'Pharmacy', FALSE, '{"mechanic": "symptom_description", "scene": "pharmacy"}'),
(13, 3, 13, 'Hair Salon', FALSE, '{"mechanic": "preference_communication", "scene": "salon"}'),
(14, 3, 14, 'Gym', FALSE, '{"mechanic": "facility_navigation", "scene": "gym"}'),
(15, 3, 15, 'Bank', FALSE, '{"mechanic": "transaction_flow", "scene": "bank"}'),
(16, 4, 16, 'Job Interview', TRUE, '{"mechanic": "formal_dialogue", "scene": "office"}'),
(17, 4, 17, 'Business Meeting', FALSE, '{"mechanic": "presentation_mode", "scene": "meeting_room"}'),
(18, 4, 18, 'Client Dinner', FALSE, '{"mechanic": "social_navigation", "scene": "restaurant"}'),
(19, 4, 19, 'Phone Call', FALSE, '{"mechanic": "audio_only", "scene": "phone"}'),
(20, 4, 20, 'Email & Messages', FALSE, '{"mechanic": "written_communication", "scene": "digital"}'),
(21, 5, 21, 'Train Station', TRUE, '{"mechanic": "ticket_booking", "scene": "station"}'),
(22, 5, 22, 'Beach Resort', FALSE, '{"mechanic": "activity_booking", "scene": "beach"}'),
(23, 5, 23, 'National Park', FALSE, '{"mechanic": "guide_interaction", "scene": "nature"}'),
(24, 5, 24, 'Night Market', FALSE, '{"mechanic": "bargaining_advanced", "scene": "night_market"}'),
(25, 5, 25, 'Island Hopping', FALSE, '{"mechanic": "boat_navigation", "scene": "islands"}'),
(26, 6, 26, 'Temple Visit', TRUE, '{"mechanic": "etiquette_guide", "scene": "temple"}'),
(27, 6, 27, 'Thai Cooking Class', FALSE, '{"mechanic": "instruction_following", "scene": "kitchen"}'),
(28, 6, 28, 'Muay Thai Gym', FALSE, '{"mechanic": "trainer_interaction", "scene": "boxing_gym"}'),
(29, 6, 29, 'Local Festival', FALSE, '{"mechanic": "cultural_participation", "scene": "festival"}'),
(30, 6, 30, 'Making Thai Friends', FALSE, '{"mechanic": "deep_conversation", "scene": "social"}')
ON CONFLICT (id) DO UPDATE SET 
  stage_id = EXCLUDED.stage_id,
  level_number = EXCLUDED.level_number,
  environment_name = EXCLUDED.environment_name,
  game_world_config = EXCLUDED.game_world_config;

-- Clear existing vocabulary (clean slate)
DELETE FROM public.level_vocabulary;
DELETE FROM public.vocabulary;

-- =====================================================
-- VOCABULARY FOR ALL 30 LEVELS (12 words each)
-- =====================================================

-- Level 1: Airport Arrival
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('สวัสดี', 'sa-wat-dii', 'Hello', 'greeting', 1),
('ครับ', 'khrap', 'Polite particle (male)', 'particle', 1),
('ค่ะ', 'kha', 'Polite particle (female)', 'particle', 1),
('ขอบคุณ', 'khawp-khun', 'Thank you', 'phrase', 1),
('ใช่', 'chai', 'Yes', 'adverb', 1),
('ไม่', 'mai', 'No/Not', 'adverb', 1),
('พาสปอร์ต', 'paat-sa-poot', 'Passport', 'noun', 1),
('สนามบิน', 'sa-naam-bin', 'Airport', 'noun', 1),
('มาจาก', 'maa-jaak', 'Come from', 'verb', 1),
('ยินดีต้อนรับ', 'yin-dii-ton-rap', 'Welcome', 'phrase', 1),
('กระเป๋า', 'kra-pao', 'Bag/Luggage', 'noun', 1),
('ทางออก', 'thaang-ork', 'Exit', 'noun', 1);

-- Level 2: TukTuk Ride
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ไปไหน', 'pai-nai', 'Where are you going?', 'phrase', 2),
('เท่าไหร่', 'thao-rai', 'How much?', 'question', 2),
('แพงไป', 'phaeng-pai', 'Too expensive', 'phrase', 2),
('ลดได้ไหม', 'lot-dai-mai', 'Can you reduce?', 'phrase', 2),
('ตรงไป', 'trong-pai', 'Go straight', 'phrase', 2),
('เลี้ยวซ้าย', 'liaw-saai', 'Turn left', 'phrase', 2),
('เลี้ยวขวา', 'liaw-khwaa', 'Turn right', 'phrase', 2),
('หยุดตรงนี้', 'yut-trong-nii', 'Stop here', 'phrase', 2),
('ใกล้', 'klai', 'Near', 'adjective', 2),
('ไกล', 'klai', 'Far', 'adjective', 2),
('บาท', 'baat', 'Baht', 'noun', 2),
('ถึงแล้ว', 'thueng-laew', 'Arrived', 'phrase', 2);

-- Level 3: Street Food Stall
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('อร่อย', 'a-roi', 'Delicious', 'adjective', 3),
('เผ็ด', 'phet', 'Spicy', 'adjective', 3),
('ไม่เผ็ด', 'mai-phet', 'Not spicy', 'phrase', 3),
('หวาน', 'waan', 'Sweet', 'adjective', 3),
('เค็ม', 'khem', 'Salty', 'adjective', 3),
('ผัดไทย', 'phat-thai', 'Pad Thai', 'noun', 3),
('ข้าว', 'khaao', 'Rice', 'noun', 3),
('น้ำ', 'naam', 'Water', 'noun', 3),
('เอาอันนี้', 'ao-an-nii', 'I want this one', 'phrase', 3),
('อีกหนึ่ง', 'iik-neung', 'One more', 'phrase', 3),
('เก็บเงิน', 'kep-ngern', 'Check please', 'phrase', 3),
('อิ่มแล้ว', 'im-laew', 'Full (eaten enough)', 'phrase', 3);

-- Level 4: 7-Eleven
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ถุง', 'thung', 'Bag', 'noun', 4),
('ไม่เอาถุง', 'mai-ao-thung', 'No bag needed', 'phrase', 4),
('อุ่น', 'un', 'Heat up', 'verb', 4),
('เย็น', 'yen', 'Cold', 'adjective', 4),
('ร้อน', 'rawn', 'Hot', 'adjective', 4),
('หลอด', 'lawt', 'Straw', 'noun', 4),
('ช้อน', 'chawn', 'Spoon', 'noun', 4),
('ส้อม', 'sawm', 'Fork', 'noun', 4),
('จ่ายเงินสด', 'jaai-ngern-sot', 'Pay cash', 'phrase', 4),
('ใบเสร็จ', 'bai-set', 'Receipt', 'noun', 4),
('ซิมการ์ด', 'sim-kaat', 'SIM card', 'noun', 4),
('เติมเงิน', 'term-ngern', 'Top up', 'verb', 4);

-- Level 5: Hotel Check-In
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('จองห้อง', 'jawng-hawng', 'Book a room', 'phrase', 5),
('เช็คอิน', 'chek-in', 'Check in', 'verb', 5),
('เช็คเอาท์', 'chek-ao', 'Check out', 'verb', 5),
('กุญแจ', 'kun-jae', 'Key', 'noun', 5),
('ห้องพัก', 'hawng-phak', 'Room', 'noun', 5),
('ชั้น', 'chan', 'Floor', 'noun', 5),
('ลิฟต์', 'lip', 'Elevator', 'noun', 5),
('อาหารเช้า', 'aa-haan-chao', 'Breakfast', 'noun', 5),
('ไวไฟ', 'wai-fai', 'WiFi', 'noun', 5),
('รหัส', 'ra-hat', 'Password', 'noun', 5),
('ผ้าเช็ดตัว', 'phaa-chet-tua', 'Towel', 'noun', 5),
('แอร์', 'ae', 'Air conditioning', 'noun', 5);

-- Level 6: Coffee Shop
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('กาแฟ', 'kaa-fae', 'Coffee', 'noun', 6),
('ชา', 'chaa', 'Tea', 'noun', 6),
('นม', 'nom', 'Milk', 'noun', 6),
('น้ำตาล', 'naam-taan', 'Sugar', 'noun', 6),
('หวานน้อย', 'waan-noi', 'Less sweet', 'phrase', 6),
('ไม่ใส่นม', 'mai-sai-nom', 'No milk', 'phrase', 6),
('แก้ว', 'kaew', 'Glass/Cup', 'noun', 6),
('นั่งทานที่นี่', 'nang-thaan-thii-nii', 'Dine in', 'phrase', 6),
('กลับบ้าน', 'klap-baan', 'Take away', 'phrase', 6),
('ขนมปัง', 'kha-nom-pang', 'Bread/Pastry', 'noun', 6),
('เค้ก', 'khek', 'Cake', 'noun', 6),
('บิล', 'bin', 'Bill', 'noun', 6);

-- Level 7: Coworking Space
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ทำงาน', 'tham-ngaan', 'Work', 'verb', 7),
('คอมพิวเตอร์', 'khom-phiu-ter', 'Computer', 'noun', 7),
('ปลั๊ก', 'plak', 'Power outlet', 'noun', 7),
('ชาร์จ', 'chaat', 'Charge', 'verb', 7),
('ประชุม', 'pra-chum', 'Meeting', 'noun', 7),
('ห้องประชุม', 'hawng-pra-chum', 'Meeting room', 'noun', 7),
('เงียบ', 'ngiap', 'Quiet', 'adjective', 7),
('โทรศัพท์', 'tho-ra-sap', 'Phone', 'noun', 7),
('อินเทอร์เน็ต', 'in-ter-net', 'Internet', 'noun', 7),
('ช้า', 'chaa', 'Slow', 'adjective', 7),
('เร็ว', 'rew', 'Fast', 'adjective', 7),
('พิมพ์', 'phim', 'Print/Type', 'verb', 7);

-- Level 8: Weekend Market
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ตลาด', 'ta-laat', 'Market', 'noun', 8),
('ซื้อ', 'seu', 'Buy', 'verb', 8),
('ขาย', 'khaai', 'Sell', 'verb', 8),
('ลอง', 'lawng', 'Try', 'verb', 8),
('ไซส์', 'sai', 'Size', 'noun', 8),
('ใหญ่', 'yai', 'Big', 'adjective', 8),
('เล็ก', 'lek', 'Small', 'adjective', 8),
('สี', 'sii', 'Color', 'noun', 8),
('แดง', 'daeng', 'Red', 'adjective', 8),
('น้ำเงิน', 'naam-ngern', 'Blue', 'adjective', 8),
('ดำ', 'dam', 'Black', 'adjective', 8),
('ขาว', 'khaao', 'White', 'adjective', 8);

-- Level 9: Yoga Studio
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('นวด', 'nuat', 'Massage', 'noun', 9),
('เจ็บ', 'jep', 'Pain/Hurt', 'verb', 9),
('สบาย', 'sa-baai', 'Comfortable', 'adjective', 9),
('หายใจ', 'haai-jai', 'Breathe', 'verb', 9),
('ช้าๆ', 'chaa-chaa', 'Slowly', 'adverb', 9),
('แรง', 'raeng', 'Strong/Hard', 'adjective', 9),
('เบา', 'bao', 'Light/Soft', 'adjective', 9),
('หลัง', 'lang', 'Back', 'noun', 9),
('ไหล่', 'lai', 'Shoulder', 'noun', 9),
('ขา', 'khaa', 'Leg', 'noun', 9),
('แขน', 'khaen', 'Arm', 'noun', 9),
('หัว', 'hua', 'Head', 'noun', 9);

-- Level 10: Rooftop Bar
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('เบียร์', 'bia', 'Beer', 'noun', 10),
('ค็อกเทล', 'khok-then', 'Cocktail', 'noun', 10),
('น้ำแข็ง', 'naam-khaeng', 'Ice', 'noun', 10),
('เมนู', 'me-nuu', 'Menu', 'noun', 10),
('ดนตรี', 'don-trii', 'Music', 'noun', 10),
('เต้น', 'ten', 'Dance', 'verb', 10),
('สนุก', 'sa-nuk', 'Fun', 'adjective', 10),
('เหนื่อย', 'neuay', 'Tired', 'adjective', 10),
('เรียกแท็กซี่', 'riiak-taek-sii', 'Call a taxi', 'phrase', 10),
('ปิดกี่โมง', 'pit-kii-mong', 'What time do you close?', 'phrase', 10),
('จ่ายบิล', 'jaai-bin', 'Pay the bill', 'phrase', 10),
('โปรด', 'proht', 'Please', 'particle', 10);

-- Level 11: Laundry Shop
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ซักผ้า', 'sak-phaa', 'Do laundry', 'verb', 11),
('รีดผ้า', 'riit-phaa', 'Iron clothes', 'verb', 11),
('ซักแห้ง', 'sak-haeng', 'Dry clean', 'verb', 11),
('เสื้อผ้า', 'seua-phaa', 'Clothes', 'noun', 11),
('กางเกง', 'kaang-keng', 'Pants', 'noun', 11),
('เสื้อ', 'seua', 'Shirt', 'noun', 11),
('กี่วัน', 'kii-wan', 'How many days?', 'phrase', 11),
('วันนี้', 'wan-nii', 'Today', 'noun', 11),
('พรุ่งนี้', 'phrung-nii', 'Tomorrow', 'noun', 11),
('เสร็จแล้ว', 'set-laew', 'Finished/Ready', 'phrase', 11),
('รับของ', 'rap-khawng', 'Pick up', 'verb', 11),
('กิโล', 'ki-lo', 'Kilogram', 'noun', 11);

-- Level 12: Pharmacy
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ร้านขายยา', 'raan-khaai-yaa', 'Pharmacy', 'noun', 12),
('ยา', 'yaa', 'Medicine', 'noun', 12),
('ปวดหัว', 'puat-hua', 'Headache', 'noun', 12),
('ปวดท้อง', 'puat-thawng', 'Stomachache', 'noun', 12),
('ไข้', 'khai', 'Fever', 'noun', 12),
('ไอ', 'ai', 'Cough', 'verb', 12),
('เป็นหวัด', 'pen-wat', 'Have a cold', 'phrase', 12),
('แพ้', 'phae', 'Allergic', 'verb', 12),
('กินยา', 'kin-yaa', 'Take medicine', 'phrase', 12),
('วันละ', 'wan-la', 'Per day', 'phrase', 12),
('หลังอาหาร', 'lang-aa-haan', 'After meals', 'phrase', 12),
('ก่อนนอน', 'korn-nawn', 'Before bed', 'phrase', 12);

-- Level 13: Hair Salon
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ตัดผม', 'tat-phom', 'Cut hair', 'verb', 13),
('สระผม', 'sa-phom', 'Wash hair', 'verb', 13),
('ย้อมผม', 'yawm-phom', 'Dye hair', 'verb', 13),
('สั้น', 'san', 'Short', 'adjective', 13),
('ยาว', 'yaao', 'Long', 'adjective', 13),
('หน้าม้า', 'naa-maa', 'Bangs', 'noun', 13),
('ข้าง', 'khaang', 'Side', 'noun', 13),
('บาง', 'baang', 'Thin out', 'verb', 13),
('แบบนี้', 'baep-nii', 'Like this', 'phrase', 13),
('ดูรูป', 'duu-ruup', 'Look at picture', 'phrase', 13),
('เป่าผม', 'pao-phom', 'Blow dry', 'verb', 13),
('เก๋', 'ke', 'Stylish', 'adjective', 13);

-- Level 14: Gym
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ฟิตเนส', 'fit-net', 'Fitness/Gym', 'noun', 14),
('ออกกำลังกาย', 'awk-kam-lang-kaai', 'Exercise', 'verb', 14),
('สมัครสมาชิก', 'sa-mak-sa-ma-chik', 'Sign up membership', 'phrase', 14),
('รายเดือน', 'raai-deuan', 'Monthly', 'adjective', 14),
('ล็อกเกอร์', 'lok-ker', 'Locker', 'noun', 14),
('ห้องอาบน้ำ', 'hawng-aap-naam', 'Shower room', 'noun', 14),
('เครื่องออกกำลัง', 'khreuang-awk-kam-lang', 'Exercise machine', 'noun', 14),
('ยกน้ำหนัก', 'yok-naam-nak', 'Lift weights', 'phrase', 14),
('วิ่ง', 'wing', 'Run', 'verb', 14),
('เหงื่อ', 'ngeuua', 'Sweat', 'noun', 14),
('พัก', 'phak', 'Rest', 'verb', 14),
('ครูฝึก', 'khruu-feuk', 'Trainer', 'noun', 14);

-- Level 15: Bank
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ธนาคาร', 'tha-naa-khaan', 'Bank', 'noun', 15),
('เปิดบัญชี', 'pert-ban-chii', 'Open account', 'phrase', 15),
('ฝากเงิน', 'faak-ngern', 'Deposit money', 'phrase', 15),
('ถอนเงิน', 'thawn-ngern', 'Withdraw money', 'phrase', 15),
('โอนเงิน', 'ohn-ngern', 'Transfer money', 'phrase', 15),
('บัตรเอทีเอ็ม', 'bat-ATM', 'ATM card', 'noun', 15),
('สมุดบัญชี', 'sa-mut-ban-chii', 'Passbook', 'noun', 15),
('อัตราแลกเปลี่ยน', 'at-traa-laek-plian', 'Exchange rate', 'noun', 15),
('แลกเงิน', 'laek-ngern', 'Exchange money', 'phrase', 15),
('เซ็นชื่อ', 'sen-cheu', 'Sign name', 'phrase', 15),
('คิว', 'khiu', 'Queue number', 'noun', 15),
('แบบฟอร์ม', 'baep-fawm', 'Form', 'noun', 15);

-- Level 16: Job Interview
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('สัมภาษณ์', 'sam-phaat', 'Interview', 'noun', 16),
('ประสบการณ์', 'pra-sop-kaan', 'Experience', 'noun', 16),
('การศึกษา', 'kaan-seuk-saa', 'Education', 'noun', 16),
('เงินเดือน', 'ngern-deuan', 'Salary', 'noun', 16),
('ตำแหน่ง', 'tam-naeng', 'Position', 'noun', 16),
('บริษัท', 'baw-ri-sat', 'Company', 'noun', 16),
('ทักษะ', 'thak-sa', 'Skills', 'noun', 16),
('จุดแข็ง', 'jut-khaeng', 'Strengths', 'noun', 16),
('จุดอ่อน', 'jut-awn', 'Weaknesses', 'noun', 16),
('เริ่มงาน', 'rerm-ngaan', 'Start work', 'phrase', 16),
('สวัสดิการ', 'sa-wat-di-kaan', 'Benefits', 'noun', 16),
('ถามได้เลย', 'thaam-dai-loei', 'Feel free to ask', 'phrase', 16);

-- Level 17: Business Meeting
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('นำเสนอ', 'nam-sa-ner', 'Present', 'verb', 17),
('โปรเจค', 'pro-jek', 'Project', 'noun', 17),
('งบประมาณ', 'ngop-pra-maan', 'Budget', 'noun', 17),
('กำหนดเวลา', 'kam-not-we-laa', 'Deadline', 'noun', 17),
('เห็นด้วย', 'hen-duay', 'Agree', 'verb', 17),
('ไม่เห็นด้วย', 'mai-hen-duay', 'Disagree', 'verb', 17),
('ข้อเสนอ', 'khor-sa-ner', 'Proposal', 'noun', 17),
('ปัญหา', 'pan-haa', 'Problem', 'noun', 17),
('แก้ไข', 'kae-khai', 'Fix/Solve', 'verb', 17),
('สรุป', 'sa-rup', 'Summarize', 'verb', 17),
('ติดตาม', 'tit-taam', 'Follow up', 'verb', 17),
('ขั้นตอน', 'khan-tawn', 'Step/Process', 'noun', 17);

-- Level 18: Client Dinner
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('จอง', 'jawng', 'Reserve/Book', 'verb', 18),
('โต๊ะ', 'to', 'Table', 'noun', 18),
('แนะนำ', 'nae-nam', 'Recommend', 'verb', 18),
('ลูกค้า', 'luuk-khaa', 'Client/Customer', 'noun', 18),
('ต้อนรับ', 'ton-rap', 'Welcome', 'verb', 18),
('เชิญ', 'chern', 'Please/Invite', 'verb', 18),
('อาหารว่าง', 'aa-haan-waang', 'Appetizer', 'noun', 18),
('จานหลัก', 'jaan-lak', 'Main course', 'noun', 18),
('ของหวาน', 'khawng-waan', 'Dessert', 'noun', 18),
('เลี้ยง', 'liang', 'Treat (someone)', 'verb', 18),
('แยกจ่าย', 'yaek-jaai', 'Split bill', 'phrase', 18),
('ชนแก้ว', 'chon-kaew', 'Cheers', 'phrase', 18);

-- Level 19: Phone Call
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('โทร', 'tho', 'Call', 'verb', 19),
('สายหลุด', 'saai-lut', 'Call dropped', 'phrase', 19),
('ไม่ว่าง', 'mai-waang', 'Busy (not free)', 'phrase', 19),
('ฝากข้อความ', 'faak-khor-khwaam', 'Leave a message', 'phrase', 19),
('โทรกลับ', 'tho-klap', 'Call back', 'phrase', 19),
('สาย', 'saai', 'Line', 'noun', 19),
('รอสักครู่', 'raw-sak-khruu', 'Please hold', 'phrase', 19),
('ต่อสาย', 'tor-saai', 'Transfer call', 'phrase', 19),
('ได้ยิน', 'dai-yin', 'Can hear', 'verb', 19),
('พูดช้าๆ', 'phuut-chaa-chaa', 'Speak slowly', 'phrase', 19),
('เบอร์อะไร', 'ber-a-rai', 'What number?', 'phrase', 19),
('วางสาย', 'waang-saai', 'Hang up', 'phrase', 19);

-- Level 20: Email & Messages
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('อีเมล', 'ii-meow', 'Email', 'noun', 20),
('ส่ง', 'song', 'Send', 'verb', 20),
('ได้รับ', 'dai-rap', 'Receive', 'verb', 20),
('ตอบ', 'tawp', 'Reply', 'verb', 20),
('แนบไฟล์', 'naep-fai', 'Attach file', 'phrase', 20),
('เรื่อง', 'reuang', 'Subject', 'noun', 20),
('ด่วน', 'duan', 'Urgent', 'adjective', 20),
('ขอบคุณล่วงหน้า', 'khawp-khun-luang-naa', 'Thanks in advance', 'phrase', 20),
('ตามที่', 'taam-thii', 'As per/According to', 'phrase', 20),
('กรุณา', 'ka-ru-naa', 'Please (formal)', 'particle', 20),
('ด้วยความเคารพ', 'duay-khwaam-khao-rop', 'Respectfully', 'phrase', 20),
('แจ้งให้ทราบ', 'jaeng-hai-saap', 'Inform/Let know', 'phrase', 20);

-- Level 21: Train Station
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('สถานีรถไฟ', 'sa-thaa-nii-rot-fai', 'Train station', 'noun', 21),
('ตั๋ว', 'tua', 'Ticket', 'noun', 21),
('ขาไป', 'khaa-pai', 'Outbound', 'noun', 21),
('ขากลับ', 'khaa-klap', 'Return', 'noun', 21),
('ที่นั่ง', 'thii-nang', 'Seat', 'noun', 21),
('ชานชลา', 'chaan-cha-laa', 'Platform', 'noun', 21),
('ออก', 'awk', 'Depart', 'verb', 21),
('ถึง', 'thueng', 'Arrive', 'verb', 21),
('ล่าช้า', 'laa-chaa', 'Delayed', 'adjective', 21),
('ตู้นอน', 'tuu-nawn', 'Sleeper car', 'noun', 21),
('เปลี่ยนรถ', 'plian-rot', 'Transfer (vehicle)', 'phrase', 21),
('ตารางเวลา', 'taa-raang-we-laa', 'Schedule', 'noun', 21);

-- Level 22: Beach Resort
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ทะเล', 'tha-le', 'Sea', 'noun', 22),
('หาด', 'haat', 'Beach', 'noun', 22),
('ว่ายน้ำ', 'waai-naam', 'Swim', 'verb', 22),
('ดำน้ำ', 'dam-naam', 'Dive', 'verb', 22),
('ร่ม', 'rom', 'Umbrella', 'noun', 22),
('ครีมกันแดด', 'khriim-kan-daet', 'Sunscreen', 'noun', 22),
('เรือ', 'reua', 'Boat', 'noun', 22),
('เกาะ', 'kor', 'Island', 'noun', 22),
('คลื่น', 'khleun', 'Wave', 'noun', 22),
('ปลอดภัย', 'plawt-phai', 'Safe', 'adjective', 22),
('อันตราย', 'an-ta-raai', 'Dangerous', 'adjective', 22),
('ชูชีพ', 'chuu-chiip', 'Life jacket', 'noun', 22);

-- Level 23: National Park
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('อุทยาน', 'ut-tha-yaan', 'National park', 'noun', 23),
('เดินป่า', 'dern-paa', 'Hike', 'verb', 23),
('น้ำตก', 'naam-tok', 'Waterfall', 'noun', 23),
('ถ้ำ', 'tham', 'Cave', 'noun', 23),
('สัตว์ป่า', 'sat-paa', 'Wildlife', 'noun', 23),
('ต้นไม้', 'ton-mai', 'Tree', 'noun', 23),
('ดอกไม้', 'dawk-mai', 'Flower', 'noun', 23),
('ไกด์', 'kai', 'Guide', 'noun', 23),
('เส้นทาง', 'sen-thaang', 'Trail/Route', 'noun', 23),
('ค่าเข้า', 'khaa-khao', 'Entrance fee', 'noun', 23),
('กางเต็นท์', 'kaang-ten', 'Camp/Set up tent', 'phrase', 23),
('ธรรมชาติ', 'tham-ma-chaat', 'Nature', 'noun', 23);

-- Level 24: Night Market
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ตลาดนัด', 'ta-laat-nat', 'Night market', 'noun', 24),
('ของฝาก', 'khawng-faak', 'Souvenir', 'noun', 24),
('ของที่ระลึก', 'khawng-thii-ra-leuk', 'Keepsake', 'noun', 24),
('ทำมือ', 'tham-meu', 'Handmade', 'adjective', 24),
('ของแท้', 'khawng-thae', 'Authentic/Real', 'adjective', 24),
('ของปลอม', 'khawng-plawm', 'Fake', 'adjective', 24),
('ต่อรอง', 'tor-rawng', 'Bargain', 'verb', 24),
('ราคาสุดท้าย', 'raa-khaa-sut-thai', 'Final price', 'phrase', 24),
('ซื้อหลายชิ้น', 'seu-laai-chin', 'Buy multiple', 'phrase', 24),
('แพ็ค', 'paek', 'Pack/Wrap', 'verb', 24),
('ส่งได้ไหม', 'song-dai-mai', 'Can you ship?', 'phrase', 24),
('รับบัตร', 'rap-bat', 'Accept card', 'phrase', 24);

-- Level 25: Island Hopping
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ทัวร์', 'thua', 'Tour', 'noun', 25),
('เรือเร็ว', 'reua-rew', 'Speedboat', 'noun', 25),
('เรือหางยาว', 'reua-haang-yaao', 'Longtail boat', 'noun', 25),
('จุดแวะ', 'jut-wae', 'Stop point', 'noun', 25),
('ดำน้ำตื้น', 'dam-naam-teun', 'Snorkel', 'verb', 25),
('อุปกรณ์', 'up-pa-kawn', 'Equipment', 'noun', 25),
('หน้ากาก', 'naa-kaak', 'Mask', 'noun', 25),
('ตีนกบ', 'tiin-kop', 'Fins', 'noun', 25),
('ปะการัง', 'pa-kaa-rang', 'Coral', 'noun', 25),
('ปลา', 'plaa', 'Fish', 'noun', 25),
('กลับฝั่ง', 'klap-fang', 'Return to shore', 'phrase', 25),
('เมาเรือ', 'mao-reua', 'Seasick', 'adjective', 25);

-- Level 26: Temple Visit
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('วัด', 'wat', 'Temple', 'noun', 26),
('พระ', 'phra', 'Monk', 'noun', 26),
('ไหว้พระ', 'wai-phra', 'Worship/Pay respects', 'phrase', 26),
('กราบ', 'kraap', 'Prostrate', 'verb', 26),
('ดอกบัว', 'dawk-bua', 'Lotus flower', 'noun', 26),
('ธูป', 'thuup', 'Incense', 'noun', 26),
('เทียน', 'thian', 'Candle', 'noun', 26),
('บุญ', 'bun', 'Merit', 'noun', 26),
('ทำบุญ', 'tham-bun', 'Make merit', 'phrase', 26),
('ถอดรองเท้า', 'thawt-rawng-thao', 'Remove shoes', 'phrase', 26),
('แต่งกาย', 'taeng-kaai', 'Dress properly', 'phrase', 26),
('สงบ', 'sa-ngop', 'Peaceful', 'adjective', 26);

-- Level 27: Thai Cooking Class
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('ทำอาหาร', 'tham-aa-haan', 'Cook', 'verb', 27),
('สูตร', 'suut', 'Recipe', 'noun', 27),
('วัตถุดิบ', 'wat-thu-dip', 'Ingredients', 'noun', 27),
('หั่น', 'han', 'Chop', 'verb', 27),
('ผัด', 'phat', 'Stir fry', 'verb', 27),
('ต้ม', 'tom', 'Boil', 'verb', 27),
('ทอด', 'thawt', 'Fry', 'verb', 27),
('นึ่ง', 'neung', 'Steam', 'verb', 27),
('กระทะ', 'kra-tha', 'Wok/Pan', 'noun', 27),
('หม้อ', 'mor', 'Pot', 'noun', 27),
('ปรุงรส', 'prung-rot', 'Season', 'verb', 27),
('ชิม', 'chim', 'Taste', 'verb', 27);

-- Level 28: Muay Thai Gym
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('มวยไทย', 'muay-thai', 'Muay Thai', 'noun', 28),
('ต่อย', 'toi', 'Punch', 'verb', 28),
('เตะ', 'te', 'Kick', 'verb', 28),
('ศอก', 'sawk', 'Elbow', 'noun', 28),
('เข่า', 'khao', 'Knee', 'noun', 28),
('นวม', 'nuam', 'Gloves', 'noun', 28),
('กระสอบ', 'kra-sawp', 'Punching bag', 'noun', 28),
('ครูมวย', 'khruu-muay', 'Boxing trainer', 'noun', 28),
('ท่า', 'thaa', 'Stance/Position', 'noun', 28),
('ป้องกัน', 'pawng-kan', 'Defend', 'verb', 28),
('หลบ', 'lop', 'Dodge', 'verb', 28),
('ไหว้ครู', 'wai-khruu', 'Respect teacher ceremony', 'phrase', 28);

-- Level 29: Local Festival
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('งานเทศกาล', 'ngaan-thet-sa-kaan', 'Festival', 'noun', 29),
('ลอยกระทง', 'loi-kra-thong', 'Loy Krathong', 'noun', 29),
('สงกรานต์', 'song-kraan', 'Songkran', 'noun', 29),
('ขบวนแห่', 'kha-buan-hae', 'Parade', 'noun', 29),
('การแสดง', 'kaan-sa-daeng', 'Performance', 'noun', 29),
('รำไทย', 'ram-thai', 'Thai dance', 'noun', 29),
('อวยพร', 'uay-phawn', 'Bless/Wish', 'verb', 29),
('สาดน้ำ', 'saat-naam', 'Splash water', 'phrase', 29),
('ปล่อยโคม', 'ploi-khom', 'Release lantern', 'phrase', 29),
('ร่วมงาน', 'ruam-ngaan', 'Join event', 'phrase', 29),
('ประเพณี', 'pra-phe-nii', 'Tradition', 'noun', 29),
('วัฒนธรรม', 'wat-tha-na-tham', 'Culture', 'noun', 29);

-- Level 30: Making Thai Friends
INSERT INTO public.vocabulary (thai_script, romanization, english_translation, part_of_speech, difficulty_level) VALUES
('เพื่อน', 'pheuuan', 'Friend', 'noun', 30),
('รู้จัก', 'ruu-jak', 'Know (someone)', 'verb', 30),
('คุยกัน', 'khui-kan', 'Chat together', 'verb', 30),
('นัดเจอ', 'nat-jer', 'Make plans to meet', 'phrase', 30),
('ว่าง', 'waang', 'Free (available)', 'adjective', 30),
('ไปด้วยกัน', 'pai-duay-kan', 'Go together', 'phrase', 30),
('สนใจ', 'son-jai', 'Interested', 'verb', 30),
('งานอดิเรก', 'ngaan-a-di-rek', 'Hobby', 'noun', 30),
('แลกไลน์', 'laek-lai', 'Exchange LINE', 'phrase', 30),
('ติดต่อ', 'tit-tor', 'Contact', 'verb', 30),
('คิดถึง', 'khit-thueng', 'Miss (someone)', 'verb', 30),
('เจอกันใหม่', 'jer-kan-mai', 'See you again', 'phrase', 30);

-- Rebuild level_vocabulary mapping after the reseed
SELECT public.seed_level_vocabulary();
