// Demo content for Koinara. Everything is local. Reset it from Settings.

const DIM = {
  p01: [800, 533], p02: [800, 469], p03: [800, 533], p04: [800, 477],
  p05: [800, 533], p06: [800, 533], p07: [800, 533], p08: [800, 533],
  p09: [800, 532], p10: [800, 534], p11: [800, 533], p12: [800, 533],
  p13: [800, 532], p14: [800, 550], p15: [800, 590], p16: [800, 533],
  p17: [800, 479], p18: [800, 1200],
  p19: [800, 536], p20: [800, 533], p21: [800, 533], p22: [800, 533],
  p23: [800, 534], p24: [800, 673], p25: [800, 1008], p26: [800, 600],
  p27: [800, 450], p28: [800, 533], p29: [800, 533], p30: [800, 483],
  p31: [800, 473], p32: [800, 533], p33: [800, 626],
  p34: [800, 533], p35: [800, 533], p36: [800, 533], p37: [800, 533], p38: [800, 533]
};

function seedState() {
  const now = Date.now();
  const t = (min) => now - Math.round(min * 60000);
  const im = (s, a) => ({ s, a, w: DIM[s][0], h: DIM[s][1] });

  const users = [
    { id: 'mae', name: 'Mae Ito', handle: 'maeito', bio: 'Type designer. Tea, walks, marginalia.', joined: 'June 2023', avatar: { s: 'av-mae' } },
    { id: 'jules', name: 'Jules Marchand', handle: 'jules', bio: 'Photographing quiet corners.', joined: 'January 2022', avatar: { s: 'av-jules' } },
    { id: 'noor', name: 'Noor Haddad', handle: 'noor', bio: 'Books, light, long sentences.', joined: 'November 2021', avatar: { s: 'av-noor' } },
    { id: 'tomas', name: 'Tomas Vela', handle: 'tomas', bio: 'Making small software. Mostly deleting code.', joined: 'August 2023', avatar: { s: 'av-tomas' } },
    { id: 'ana', name: 'Ana Reis', handle: 'anareis', bio: 'Ceramics and slow mornings.', joined: 'February 2022', avatar: { s: 'av-ana' } },
    { id: 'kenji', name: 'Kenji Sato', handle: 'kenji', bio: 'Film, mostly. Grain is a feature.', joined: 'April 2020', avatar: { s: 'av-kenji' } },
    { id: 'lena', name: 'Lena Ora', handle: 'lenaora', bio: 'Poetry and plants. In that order.', joined: 'September 2023', avatar: { s: 'av-lena' } },
    { id: 'sam', name: 'Sam Okoye', handle: 'samokoye', bio: 'Design systems, public transport, good bread.', joined: 'May 2022', avatar: { s: 'av-sam' } },
    { id: 'iris', name: 'Iris Bell', handle: 'irisbell', bio: 'Sound, cities, and the space between them.', joined: 'July 2022', avatar: { s: 'av-iris' } },
    { id: 'dario', name: 'Dario Fontana', handle: 'dario', bio: 'Cycling, maps, and very strong coffee.', joined: 'October 2023', avatar: { s: 'av-dario' } },
    { id: 'mira', name: 'Mira Halvorsen', handle: 'mirah', bio: 'Knitting, weather, small rooms.', joined: 'March 2021', avatar: { s: 'av-mira' } },
    { id: 'eli', name: 'Eli Park', handle: 'elipark', bio: 'Libraries, archives, marginal notes.', joined: 'December 2022', avatar: { s: 'av-eli' } },
    { id: 'sana', name: 'Sana Qureshi', handle: 'sanaq', bio: 'Radio producer. Always listening.', joined: 'May 2023', avatar: { s: 'av-sana' } },
    { id: 'theo', name: 'Theo Lindqvist', handle: 'theo', bio: 'Woodwork and long walks.', joined: 'February 2024', avatar: { s: 'av-theo' } },
    { id: 'priya', name: 'Priya Nair', handle: 'priyanair', bio: 'Product designer. Margins, trains, and rain on the platform.', joined: 'April 2024', avatar: { s: 'av-priya' } },
    { id: 'marco', name: 'Marco Silva', handle: 'marcosilva', bio: 'Baker. Sourdough, early markets, strong coffee.', joined: 'June 2024', avatar: { s: 'av-marco' } },
    { id: 'yuki', name: 'Yuki Tanaka', handle: 'yukitanaka', bio: 'Illustrator. Ink, paper, and small observations.', joined: 'March 2024', avatar: { s: 'av-yuki' } },
    { id: 'sofia', name: 'Sofia Petrov', handle: 'sofiapetrov', bio: 'Archivist. Old buildings, newer questions.', joined: 'October 2023', avatar: { s: 'av-sofia' } },
    { id: 'adam', name: 'Adam Kessler', handle: 'adamk', bio: 'Backend engineer trying to touch more grass.', joined: 'July 2024', avatar: { s: 'av-adam' } },
    { id: 'leila', name: 'Leila Haddad', handle: 'leilah', bio: 'Ceramics and color. Usually covered in clay.', joined: 'May 2024', avatar: { s: 'av-leila' } },
    { id: 'ben', name: 'Ben Osei', handle: 'benosei', bio: 'Music producer. Field recordings and late buses.', joined: 'January 2024', avatar: { s: 'av-ben' } },
    { id: 'ingrid', name: 'Ingrid Dahl', handle: 'ingridd', bio: 'Textile artist. Wool, weather, quiet rooms.', joined: 'August 2024', avatar: { s: 'av-ingrid' } },
    { id: 'ravi', name: 'Ravi Menon', handle: 'ravimenon', bio: 'Urban planner. Maps, benches, and shade.', joined: 'February 2024', avatar: { s: 'av-ravi' } },
    { id: 'clara', name: 'Clara Moreau', handle: 'claram', bio: 'Bookseller. Recommends by mood, not genre.', joined: 'September 2024', avatar: { s: 'av-clara' } },
    { id: 'hana', name: 'Hana Kim', handle: 'hanakim', bio: 'Photographer. Film, windows, waiting.', joined: 'November 2023', avatar: { s: 'av-hana' } },
    { id: 'owen', name: 'Owen Price', handle: 'owenprice', bio: 'Teacher. Poetry, football, packed lunches.', joined: 'December 2023', avatar: { s: 'av-owen' } },
    { id: 'mara', name: 'Mara Voss', handle: 'maravoss', bio: 'Do not reply.', joined: 'Unknown', avatar: null }
  ];

  const me = {
    id: 'me',
    name: 'Alex',
    handle: 'alex',
    bio: 'Looking for quieter corners of the internet.',
    joined: 'March 2024',
    avatar: { s: 'av-me' }
  };

  const posts = [
    { id: 'p1', userId: 'mae', ts: t(6), likes: 28, text: `The best kerning is the kind nobody notices. Same with good interfaces.`, tags: ['type', 'craft'] },
    { id: 'p2', userId: 'jules', ts: t(18), likes: 41, text: `Morning light on the kitchen table. Nothing else happening, which is the point.`, tags: ['morning', 'light', 'coffee'] },
    { id: 'p3', userId: 'noor', ts: t(34), likes: 63, text: `Re-reading a book you loved at twenty is a strange kind of time travel. The sentences are the same. You are not.`, tags: ['books', 'memory'] },
    { id: 'p4', userId: 'tomas', ts: t(52), likes: 19, text: `Deleted 400 lines today. The feature still works. Best day of the week.`, tags: ['code', 'craft'] },
    { id: 'p5', userId: 'ana', ts: t(80), likes: 33, text: `The glaze test came out of the kiln a little too green, which is exactly right.`, images: [im('p17', 'Hands shaping a pot on a pottery wheel')], tags: ['clay', 'making'] },
    { id: 'p6', userId: 'kenji', ts: t(120), likes: 26, text: `Shot a whole roll at f/8 and hyperfocal. Everything sharp. Feels like cheating.`, images: [im('p04', 'Rolling green hills under a soft sunset')], tags: ['film', 'light', 'walking'] },
    { id: 'p33', userId: 'me', ts: t(130), likes: 12, text: `Trying this out. Quiet feed, no videos, just words and the occasional photo. Feels right.`, tags: ['slow', 'quiet'] },
    { id: 'p7', userId: 'lena', ts: t(160), likes: 71, text: `The plant on my desk has outlived three jobs. I think it is the manager now.`, images: [im('p08', 'A small succulent in a pale pot')], tags: ['plants', 'home'] },
    { id: 'p8', userId: 'sam', ts: t(180), likes: 22, text: `A transit map is a design system with consequences. Miss a connection and it is someone's evening.`, tags: ['transit', 'design'] },
    { id: 'p9', userId: 'mae', ts: t(240), likes: 17, text: `Small type on cheap paper is the real test. Everything looks good at 96pt on a retina display.`, tags: ['type', 'paper'] },
    { id: 'p10', userId: 'jules', ts: t(300), likes: 38, text: `Two corners of the same city, ten minutes apart.`, images: [im('p05', 'A white geometric building against a pale sky'), im('p06', 'Dark skyscrapers seen from street level')], ratio: '16:9', tags: ['cities', 'light'] },
    { id: 'p11', userId: 'noor', ts: t(360), likes: 58, text: `Current stack: one novel, one essay collection, one book I keep pretending I will finish.`, images: [im('p09', 'A stack of colourful books seen from the side')], tags: ['books', 'quiet'] },
    { id: 'p12', userId: 'tomas', ts: t(480), likes: 45, text: `Hot take: the fastest loading state is the one you designed out.`, tags: ['code', 'slow'] },
    { id: 'p13', userId: 'ana', ts: t(600), likes: 32, text: `Slow morning. Coffee, clay, no phone until noon. I am telling you this from my phone.`, tags: ['morning', 'slow'] },
    { id: 'p14', userId: 'kenji', ts: t(720), likes: 29, text: `Grain, dust, light leaks. The imperfections are the only honest part.`, images: [im('p13', 'A calm beach at sunset with soft light on the water')], tags: ['film', 'light'] },
    { id: 'p15', userId: 'lena', ts: t(960), likes: 51, text: `A poem I wrote on the back of a receipt is still better than the one I typed.`, tags: ['books', 'poetry'] },
    { id: 'p16', userId: 'sam', ts: t(1200), likes: 24, text: `Good signage does not make you feel smart. It makes you feel like you are already where you should be.`, tags: ['design', 'cities'] },
    { id: 'p17', userId: 'mae', ts: t(1440), likes: 36, text: `Letter spacing is not decoration. It is breathing room.`, tags: ['type', 'craft'] },
    { id: 'p34', userId: 'me', ts: t(1500), likes: 6, text: `Collected a few links on slow software and lost them immediately. The intention was there.`, tags: ['slow', 'quiet'] },
    { id: 'p18', userId: 'jules', ts: t(1680), likes: 47, text: `A reading room that smells like paper and rain. I stayed until they turned the lights off.`, images: [im('p02', 'Warm shelves full of old books'), im('p10', 'A curved library with tall wooden shelves')], ratio: '4:3', tags: ['books', 'rain'] },
    { id: 'p19', userId: 'noor', ts: t(1920), likes: 44, text: `The library was empty except for the radiator and me. Perfect afternoon.`, tags: ['library', 'quiet'] },
    { id: 'p20', userId: 'tomas', ts: t(2160), likes: 31, text: `Shipping is a feature. So is stopping.`, tags: ['code', 'craft'] },
    { id: 'p21', userId: 'ana', ts: t(2880), likes: 67, text: `Twelve cups, three handles, one that warped in the kiln. Keeping the warped one.`, images: [im('p18', 'A tall stack of handmade cream ceramic cups')], tags: ['clay', 'making'] },
    { id: 'p22', userId: 'kenji', ts: t(3240), likes: 40, text: `Walked until the film ran out. Then walked a little more.`, images: [im('p11', 'A wooden bridge through a dark green forest')], tags: ['film', 'walking'] },
    { id: 'p23', userId: 'lena', ts: t(3600), likes: 34, text: `Repotted everything. My hands smell like soil and I am unreasonably happy about it.`, images: [im('p03', 'A scoop of dark soil beside a small plant')], tags: ['plants', 'home'] },
    { id: 'p24', userId: 'sam', ts: t(4320), likes: 55, text: `The best interface I used this week was a paper timetable at a bus stop. No battery, no update.`, tags: ['design', 'transit'] },
    { id: 'p25', userId: 'mae', ts: t(4680), likes: 23, text: `There is a particular joy in a lowercase g that just works.`, tags: ['type', 'craft'] },
    { id: 'p26', userId: 'jules', ts: t(5760), likes: 43, text: `Blue hour, same field, different weather.`, images: [im('p16', 'A field at sunset with a low sun on the horizon')], tags: ['film', 'light'] },
    { id: 'p27', userId: 'noor', ts: t(6000), likes: 39, text: `Reading outside until the light goes. The book can wait.`, images: [im('p12', 'A mountain lake with a small wooden cabin')], tags: ['books', 'quiet'] },
    { id: 'p28', userId: 'tomas', ts: t(7200), likes: 18, text: `A demo is a promise. Do not make promises you cannot keep on a laptop from 2017.`, tags: ['code', 'craft'] },
    { id: 'p29', userId: 'ana', ts: t(7920), likes: 27, text: `The studio is cold but the clay is warm. A reasonable trade.`, tags: ['clay', 'home'] },
    { id: 'p30', userId: 'kenji', ts: t(8640), likes: 36, text: `Last frame of the roll. Always the one you forget you took.`, tags: ['film', 'memory'] },
    { id: 'p31', userId: 'lena', ts: t(9000), likes: 41, text: `Everything is a draft. The plant, the poem, the week.`, tags: ['plants', 'poetry'] },
    { id: 'p32', userId: 'sam', ts: t(9360), likes: 30, text: `Took the long bus home to see the city slowly. Recommended.`, tags: ['cities', 'transit'] },
    { id: 'p35', userId: 'me', ts: t(5000), likes: 21, text: `Walked home the long way. Saw a cat, a good door, and a sunset.`, images: [im('p14', 'A black and white cat resting on a wooden surface')], tags: ['walking', 'light'] },
    { id: 'p36', userId: 'iris', ts: t(11), likes: 27, text: `Recorded the rain on the fire escape. Nine minutes of it. Might be the whole album.`, tags: ['rain', 'radio'] },
    { id: 'p37', userId: 'iris', ts: t(95), likes: 34, text: `A city is mostly transitions. The parts between places are the parts I remember.`, tags: ['cities', 'walking', 'quiet'] },
    { id: 'p38', userId: 'dario', ts: t(44), likes: 19, text: `Took the hill route home. Legs say no, the view says yes.`, tags: ['walking', 'light'] },
    { id: 'p39', userId: 'dario', ts: t(340), likes: 31, text: `Every map is an argument about what matters.`, tags: ['transit', 'design'] },
    { id: 'p40', userId: 'mira', ts: t(70), likes: 42, text: `The kettle, the window, the same chair. A whole day can be this small.`, tags: ['home', 'slow', 'morning'] },
    { id: 'p41', userId: 'mira', ts: t(540), likes: 23, text: `Mended the sleeve instead of replacing the shirt. Three winters older now.`, tags: ['making', 'home'] },
    { id: 'p42', userId: 'eli', ts: t(210), likes: 38, text: `Found a note in a returned book: "page 84, if you get here." I got here.`, tags: ['books', 'library', 'memory'] },
    { id: 'p43', userId: 'eli', ts: t(880), likes: 26, text: `Archive smell is just time with the dust left in.`, tags: ['library', 'slow'] },
    { id: 'p44', userId: 'sana', ts: t(420), likes: 29, text: `The best interview was twenty minutes of silence and one good question.`, tags: ['radio', 'quiet'] },
    { id: 'p45', userId: 'sana', ts: t(1320), likes: 17, text: `Editing audio is mostly deciding what to leave out. Like most things.`, tags: ['radio', 'craft'] },
    { id: 'p46', userId: 'theo', ts: t(760), likes: 36, text: `Made a shelf from a fallen branch. It holds three books and a lot of pride.`, tags: ['making', 'home'] },
    { id: 'p47', userId: 'theo', ts: t(1560), likes: 24, text: `Walked the ridge before the light changed. No photos, just the walk.`, tags: ['walking', 'quiet'] },
    { id: 'p48', userId: 'jules', ts: t(25), likes: 33, text: `Three corners of the same walk. I kept the route in my head.`, tags: ['cities', 'light', 'walking'] },
    { id: 'p49', userId: 'mira', ts: t(150), likes: 28, text: `The chair, the window, the plant. A small study in stillness.`, tags: ['home', 'quiet', 'slow'] },
    { id: 'p50', userId: 'noor', ts: t(260), likes: 47, text: `A stack, a shelf, a room that smells like rain.`, tags: ['books', 'library', 'rain'] },
    { id: 'p51', userId: 'iris', ts: t(470), likes: 39, text: `Three hours on the ridge. The light did all the work.`, tags: ['light', 'walking', 'film'] },
    { id: 'p52', userId: 'lena', ts: t(700), likes: 31, text: `The desk at three times of day. The light changed; the list did not.`, tags: ['plants', 'home', 'slow'] },
    { id: 'p53', userId: 'jules', ts: t(900), likes: 52, text: `Five corners of the city, one walk at a time.`, tags: ['cities', 'light', 'walking'] },
    { id: 'p54', userId: 'me', ts: t(2), likes: 14, text: `The best part of a local-first app is opening it on a train with no signal and finding everything still there.`, tags: ['local', 'slow', 'code'] },
    { id: 'p55', userId: 'iris', ts: t(9), likes: 18, text: `Recorded the market at six. The fishmonger has a better sense of rhythm than most drummers.`, tags: ['radio', 'cities', 'sound'] },
    { id: 'p56', userId: 'dario', ts: t(14), likes: 12, text: `Took the long hill because the map said it was shorter. The map lied. The view apologized.`, tags: ['cycling', 'maps', 'walking'] },
    { id: 'p57', userId: 'mira', ts: t(21), likes: 16, text: `Wool from the market, tea from the tin, rain on the window. A complete afternoon.`, tags: ['home', 'slow', 'making'] },
    { id: 'p58', userId: 'me', ts: t(27), likes: 11, text: `Trying to make the quiet parts of the interface feel intentional instead of empty.`, images: [im('p15', 'A quiet corner with a white chair and a potted plant')], tags: ['design', 'slow'] },
    { id: 'p59', userId: 'eli', ts: t(35), likes: 19, text: `A catalog card from 1978 with a pencil note: ask again in spring. I am asking.`, tags: ['library', 'memory'] },
    { id: 'p60', userId: 'sana', ts: t(42), likes: 21, text: `The interview went quiet for eleven seconds. Kept all of it. The silence explained more than the answer.`, tags: ['radio', 'quiet', 'craft'] },
    { id: 'p61', userId: 'theo', ts: t(50), likes: 15, text: `Fixed the wobbly chair with a scrap of oak. It is now the most reliable thing in the house.`, tags: ['making', 'home', 'wood'] },
    { id: 'p62', userId: 'iris', ts: t(58), likes: 17, text: `A city sounds different at 4am. Fewer voices, more machinery. I like the honesty.`, tags: ['cities', 'sound', 'quiet'] },
    { id: 'p63', userId: 'me', ts: t(66), likes: 13, text: `Coffee, a notebook, and no notifications. The plan is working.`, images: [im('p01', 'Two hands holding cups of coffee with latte art')], tags: ['slow', 'morning', 'quiet'] },
    { id: 'p64', userId: 'dario', ts: t(75), likes: 14, text: `Adjusted a map pin that was wrong for three years. Small civic duty.`, tags: ['maps', 'design', 'cities'] },
    { id: 'p65', userId: 'mira', ts: t(86), likes: 18, text: `The sleeve has been mended twice. I am starting to think it is the shirt that keeps me.`, tags: ['making', 'home', 'slow'] },
    { id: 'p66', userId: 'eli', ts: t(98), likes: 20, text: `Archive box 14: receipts, a pressed leaf, and a letter that never got sent. The best kind of catalog.`, tags: ['library', 'memory', 'paper'] },
    { id: 'p67', userId: 'sana', ts: t(110), likes: 16, text: `Cut the room tone, then put half of it back. The silence was doing a job.`, tags: ['radio', 'craft', 'quiet'] },
    { id: 'p68', userId: 'theo', ts: t(125), likes: 17, text: `Walked the ridge in fog. No view, better attention.`, tags: ['walking', 'quiet', 'weather'] },
    { id: 'p69', userId: 'me', ts: t(140), likes: 15, text: `A small win: the app opens before the kettle finishes.`, tags: ['code', 'slow', 'local'] },
    { id: 'p70', userId: 'priya', ts: t(155), likes: 23, text: `The best ticket machine I have used had one button and a very clear sentence. Design is mostly respect.`, tags: ['design', 'transit', 'cities'] },
    { id: 'p71', userId: 'marco', ts: t(170), likes: 19, text: `Starter is three years old today. No candles, just flour and a quiet apology for the missed feeds.`, tags: ['bread', 'making', 'morning'] },
    { id: 'p72', userId: 'yuki', ts: t(190), likes: 18, text: `Drew the same window four times. The fourth one finally has the weather in it.`, tags: ['drawing', 'craft', 'light'] },
    { id: 'p73', userId: 'sofia', ts: t(210), likes: 21, text: `Found a courtyard behind a building I have walked past for years. Cities keep a second entrance.`, tags: ['cities', 'architecture', 'walking'] },
    { id: 'p74', userId: 'adam', ts: t(230), likes: 14, text: `The migration finished. Nobody noticed. The best kind of infrastructure.`, tags: ['code', 'craft', 'quiet'] },
    { id: 'p75', userId: 'me', ts: t(250), likes: 12, text: `Rearranged the desk, found three cables I do not recognize, kept them anyway. Some habits are universal.`, images: [im('p07', 'A tidy desk with a laptop and a small plant')], tags: ['home', 'slow', 'making'] },
    { id: 'p76', userId: 'ben', ts: t(275), likes: 17, text: `Recorded the last bus from the back seat. The engine is in A, more or less.`, tags: ['radio', 'sound', 'cities'] },
    { id: 'p77', userId: 'ingrid', ts: t(300), likes: 20, text: `Dye bath came out the color of a rainy afternoon. Keeping it.`, tags: ['making', 'wool', 'color'] },
    { id: 'p78', userId: 'ravi', ts: t(330), likes: 24, text: `A bench in the shade is cheaper than a cooling center and works every summer. Keep the bench.`, tags: ['cities', 'design', 'transit'] },
    { id: 'p79', userId: 'clara', ts: t(360), likes: 22, text: `A customer asked for a book that feels like the last ten minutes of daylight. I knew exactly which one.`, tags: ['books', 'light', 'quiet'] },
    { id: 'p80', userId: 'hana', ts: t(395), likes: 19, text: `Waited forty minutes for the light to move. It moved for eight seconds. Worth it.`, tags: ['film', 'light', 'waiting'] },
    { id: 'p81', userId: 'me', ts: t(430), likes: 18, text: `Quiet web update: fewer badges, fewer counts, more room to read. Feels lighter already.`, tags: ['design', 'slow', 'code'] },
    { id: 'p82', userId: 'priya', ts: t(470), likes: 16, text: `A train timetable is a promise written by committee. The good ones still feel human.`, tags: ['transit', 'design', 'cities'] },
    { id: 'p83', userId: 'marco', ts: t(510), likes: 18, text: `First bake of the week. The crust finally sounds like paper, not cardboard.`, tags: ['bread', 'craft', 'morning'] },
    { id: 'p84', userId: 'yuki', ts: t(555), likes: 21, text: `Ink wash, salt, and a little panic. The best drawings usually include all three.`, tags: ['drawing', 'craft', 'making'] },
    { id: 'p85', userId: 'sofia', ts: t(600), likes: 20, text: `Catalogued a box of photographs with no names. Everyone is someone's missing caption.`, tags: ['archives', 'memory', 'cities'] },
    { id: 'p86', userId: 'adam', ts: t(650), likes: 15, text: `Deleted a feature flag. The code got smaller and the app got clearer. Good trade.`, tags: ['code', 'craft', 'slow'] },
    { id: 'p87', userId: 'me', ts: t(705), likes: 14, text: `Walked the long way to the shop and came back with bread and a better mood.`, tags: ['walking', 'morning', 'slow'] },
    { id: 'p88', userId: 'ben', ts: t(760), likes: 19, text: `Mixed the field recording into something with a pulse. The city did most of the work.`, tags: ['music', 'cities', 'sound'] },
    { id: 'p89', userId: 'ingrid', ts: t(820), likes: 18, text: `The loom is warped, the tea is cold, the light is perfect. Staying put.`, tags: ['making', 'home', 'quiet'] },
    { id: 'p90', userId: 'ravi', ts: t(890), likes: 22, text: `Mapped every bench within a ten minute walk. There are fewer than I hoped and more than I feared.`, tags: ['cities', 'maps', 'walking'] },
    { id: 'p91', userId: 'clara', ts: t(960), likes: 17, text: `Shelf talker of the week: for people who like novels about weather and regret.`, tags: ['books', 'quiet', 'craft'] },
    { id: 'p92', userId: 'hana', ts: t(1040), likes: 16, text: `Contact sheet came back. Three frames are keepers, the rest are research.`, tags: ['film', 'craft', 'waiting'] },
    { id: 'p93', userId: 'owen', ts: t(1120), likes: 20, text: `A student wrote a poem about the school bus. It is better than most things I read this year.`, tags: ['poetry', 'teaching', 'morning'] },
    { id: 'p94', userId: 'me', ts: t(1210), likes: 21, text: `The first version of anything is mostly an argument with yourself. The second version listens.`, tags: ['code', 'craft', 'slow'] },
    { id: 'p95', userId: 'owen', ts: t(1310), likes: 15, text: `Football on the field after school. Nobody kept score, everybody slept well.`, tags: ['teaching', 'walking', 'quiet'] },
    { id: 'p96', userId: 'yuki', ts: t(1420), likes: 18, text: `A small drawing of the kettle. It has more personality than the toaster.`, tags: ['drawing', 'home', 'slow'] },
    { id: 'p97', userId: 'leila', ts: t(1540), likes: 19, text: `Glaze test: one green, one brown, one that looks like a mistake I want to keep.`, tags: ['clay', 'color', 'making'] },
    { id: 'p98', userId: 'ingrid', ts: t(1680), likes: 17, text: `Repaired the quilt instead of buying a new one. The repairs are the best part now.`, tags: ['making', 'home', 'slow'] },
    { id: 'p99', userId: 'leila', ts: t(1830), likes: 22, text: `The kiln cooled overnight. Opening it is the closest thing I have to a birthday.`, tags: ['clay', 'making', 'morning'] },
    { id: 'p100', userId: 'me', ts: t(2000), likes: 24, text: `A quiet feed is not an empty feed. It is a feed that knows when to stop.`, tags: ['slow', 'quiet', 'design'] },
    { id: 'p101', userId: 'noor', ts: t(8), likes: 24, text: `Writing by hand again. The ideas arrive slower and leave better.`, images: [im('p19', 'Hands writing in a notebook beside coffee and a tablet')], tags: ['books', 'slow', 'morning'] },
    { id: 'p102', userId: 'theo', ts: t(16), likes: 19, text: `The lake disappeared into the fog. I stayed until it came back.`, images: [im('p20', 'A misty lake and forest at dawn')], tags: ['walking', 'weather', 'quiet'] },
    { id: 'p103', userId: 'dario', ts: t(33), likes: 27, text: `Took the long trail to the falls. Worth the wet socks.`, images: [im('p21', 'A waterfall in a rocky forest')], tags: ['walking', 'water', 'light'] },
    { id: 'p104', userId: 'theo', ts: t(48), likes: 22, text: `A path that asks you to slow down. So I did.`, images: [im('p22', 'A narrow path through tall trees')], tags: ['walking', 'quiet', 'light'] },
    { id: 'p105', userId: 'hana', ts: t(64), likes: 31, text: `A red wall, a pair of shoes, and the rest was luck.`, images: [im('p23', 'White high heels against a deep red wall')], tags: ['film', 'color', 'waiting'] },
    { id: 'p106', userId: 'hana', ts: t(88), likes: 26, text: `One person, one street, one frame.`, images: [im('p24', 'A person crossing an empty street')], tags: ['film', 'cities', 'walking'] },
    { id: 'p107', userId: 'mae', ts: t(105), likes: 18, text: `Good tools are quiet. These are very quiet.`, images: [im('p25', 'Polished forks arranged against a dark background')], tags: ['craft', 'design', 'quiet'] },
    { id: 'p108', userId: 'marco', ts: t(135), likes: 29, text: `Strawberries from the market. Half made it home.`, images: [im('p26', 'Strawberries and raspberries on a pale surface')], tags: ['food', 'market', 'morning'] },
    { id: 'p109', userId: 'ingrid', ts: t(175), likes: 21, text: `A small thing for the window. The light does the rest.`, images: [im('p27', 'A dreamcatcher hanging in warm light')], tags: ['making', 'home', 'light'] },
    { id: 'p110', userId: 'lena', ts: t(215), likes: 34, text: `The garden is doing something pink and I support it.`, images: [im('p28', 'Pink flowers against a blue sky')], tags: ['plants', 'color', 'home'] },
    { id: 'p111', userId: 'sofia', ts: t(275), likes: 23, text: `A courtyard with palms and no schedule.`, images: [im('p29', 'Palm trees on a bright beach')], tags: ['cities', 'travel', 'quiet'] },
    { id: 'p112', userId: 'kenji', ts: t(340), likes: 35, text: `An old car, a good chrome bumper, and a whole afternoon.`, images: [im('p30', 'A vintage car parked on a city street')], tags: ['film', 'cities', 'memory'] },
    { id: 'p113', userId: 'me', ts: t(410), likes: 17, text: `Soup on the stove. The kitchen windows are fogged.`, images: [im('p31', 'Steam rising from a pot in a bright kitchen')], tags: ['home', 'food', 'slow'] },
    { id: 'p114', userId: 'ravi', ts: t(520), likes: 20, text: `The train line at the edge of town. A good place to think.`, images: [im('p32', 'A railway line curving along a coast')], tags: ['transit', 'walking', 'quiet'] },
    { id: 'p115', userId: 'yuki', ts: t(650), likes: 25, text: `A chair, a board, and the last light.`, images: [im('p33', 'A folding chair and a skateboard against a wall')], tags: ['drawing', 'light', 'home'] },
    { id: 'p116', userId: 'noor', ts: t(90), likes: 27, text: `Someone returned a book with a train ticket inside. I hope they got where they were going.`, tags: ['books', 'memory', 'travel'] },
    { id: 'p117', userId: 'tomas', ts: t(240), likes: 21, text: `I stared at a bug for two hours. It was a typo in the config. The config was mine.`, tags: ['code', 'craft'] },
    { id: 'p118', userId: 'ana', ts: t(480), likes: 26, text: `The kiln cracked a piece I loved. The crack is the best part now.`, tags: ['clay', 'making', 'home'] },
    { id: 'p119', userId: 'owen', ts: t(700), likes: 18, text: `The school play ran eleven minutes over and nobody minded.`, tags: ['teaching', 'quiet'] },
    { id: 'p120', userId: 'mira', ts: t(900), likes: 23, text: `The neighbor's cat waits by my door now. I pretend it is a coincidence.`, tags: ['home', 'quiet', 'morning'] },
    { id: 'p121', userId: 'jules', ts: t(24), likes: 48, text: `A coast walk in five frames. The weather did most of the work.`, images: [im('p34', 'A blue bay seen through dark trees'), im('p35', 'A rocky beach under a pale sky'), im('p36', 'A rocky shoreline at low tide'), im('p37', 'A cliff and sea under soft clouds'), im('p38', 'Tall grass moving in the wind')], ratio: '4:3', tags: ['walking', 'coast', 'light'] },
  ];


  const replies = {
    p1: [
      { id: 'r1', userId: 'jules', ts: t(4), text: `This is the whole job.` },
      { id: 'r2', userId: 'lena', ts: t(3), text: `Stealing this for a talk slide.` }
    ],
    p2: [{ id: 'r3', userId: 'noor', ts: t(15), text: `This light.` }],
    p3: [
      { id: 'r4', userId: 'me', ts: t(30), text: `The book changes because you do.` },
      { id: 'r5', userId: 'mae', ts: t(28), text: `Exactly.` }
    ],
    p4: [{ id: 'r6', userId: 'sam', ts: t(48), text: `The best commits are mostly minus signs.` }],
    p7: [{ id: 'r7', userId: 'ana', ts: t(150), text: `The manager has earned it.` }],
    p10: [{ id: 'r8', userId: 'kenji', ts: t(285), text: `The second one.` }],
    p12: [{ id: 'r9', userId: 'noor', ts: t(460), text: `Design out the wait, not the feedback.` }],
    p19: [{ id: 'r10', userId: 'mae', ts: t(1900), text: `That is my ideal afternoon.` }],
    p20: [{ id: 'r11', userId: 'sam', ts: t(2100), text: `Stopping is underrated.` }],
    p24: [{ id: 'r12', userId: 'mae', ts: t(4300), text: `Two years for one arrow. Worth it.` }],
    p31: [{ id: 'r13', userId: 'noor', ts: t(8900), text: `Everything is a draft. Yes.` }],
    p33: [{ id: 'r14', userId: 'jules', ts: t(120), text: `Welcome. It is quiet here.` }]
  };

  let nextReply = 15;
  const addReply = (postId, userId, min, text) => {
    if (!replies[postId]) replies[postId] = [];
    replies[postId].push({ id: 'r' + nextReply++, userId, ts: t(min), text });
  };
  addReply('p54', 'mae', 1, `Train test is the real test.`);
  addReply('p54', 'jules', 0, `Everything still there, including the draft you forgot.`);
  addReply('p55', 'sana', 8, `The fishmonger is the metronome.`);
  addReply('p55', 'ben', 6, `Please send the raw file.`);
  addReply('p55', 'me', 5, `I can hear this.`);
  addReply('p56', 'ravi', 12, `Maps are opinions with coordinates.`);
  addReply('p56', 'mira', 10, `The view earned it.`);
  addReply('p57', 'ingrid', 18, `That is the whole weekend.`);
  addReply('p57', 'ana', 16, `The tin is the important part.`);
  addReply('p58', 'priya', 24, `Empty space is a feature.`);
  addReply('p58', 'tomas', 22, `Ship it.`);
  addReply('p59', 'noor', 30, `I would ask again.`);
  addReply('p59', 'clara', 28, `That note is a whole short story.`);
  addReply('p59', 'sofia', 25, `Cataloguing is time travel with gloves.`);
  addReply('p60', 'iris', 38, `Eleven seconds is a long time in radio.`);
  addReply('p60', 'mae', 35, `The silence did the work.`);
  addReply('p61', 'mira', 45, `The wobbly chair is now the best chair.`);
  addReply('p61', 'ana', 42, `Oak fixes most things.`);
  addReply('p62', 'ben', 52, `4am has the best low end.`);
  addReply('p62', 'dario', 48, `Fewer voices, more truth.`);
  addReply('p63', 'jules', 60, `The plan is working.`);
  addReply('p63', 'noor', 55, `Notebook is the only notification I want.`);
  addReply('p64', 'ravi', 70, `Three years is a long time for a wrong pin.`);
  addReply('p64', 'sam', 66, `Civic duty is a map edit.`);
  addReply('p65', 'ingrid', 80, `The repairs are the biography.`);
  addReply('p65', 'lena', 75, `The shirt keeps you. Obviously.`);
  addReply('p66', 'clara', 90, `Box 14 is the best box.`);
  addReply('p66', 'noor', 85, `The unsent letter wins.`);
  addReply('p66', 'me', 80, `I want to read the whole box.`);
  addReply('p67', 'iris', 100, `Room tone is a character.`);
  addReply('p67', 'ben', 95, `Half back is the right amount.`);
  addReply('p68', 'mira', 115, `Fog is good company.`);
  addReply('p68', 'lena', 110, `No view, better attention. Yes.`);
  addReply('p69', 'adam', 130, `Kettle benchmark is the only benchmark.`);
  addReply('p69', 'tomas', 125, `Fast is a feature when it is quiet.`);
  addReply('p70', 'ravi', 145, `One button and a clear sentence. Perfect.`);
  addReply('p70', 'mae', 140, `Respect is the right word.`);
  addReply('p70', 'sam', 135, `Stealing this for a critique.`);
  addReply('p71', 'ana', 160, `Three years is a proper starter.`);
  addReply('p71', 'theo', 155, `The missed feeds are part of the flavor.`);
  addReply('p71', 'me', 150, `I can smell this through the screen.`);
  addReply('p72', 'hana', 180, `The fourth one always has the weather.`);
  addReply('p72', 'clara', 175, `Keep all four.`);
  addReply('p73', 'ravi', 200, `Cities keep a second entrance. True.`);
  addReply('p73', 'eli', 195, `The courtyard is the reward.`);
  addReply('p74', 'tomas', 220, `The best migration is a boring one.`);
  addReply('p74', 'sam', 215, `Nobody noticed is the goal.`);
  addReply('p75', 'mira', 240, `The cable drawer is universal.`);
  addReply('p75', 'theo', 235, `Keep them. They are a type of hope.`);
  addReply('p76', 'iris', 265, `The engine in A is a gift.`);
  addReply('p76', 'sana', 260, `Back seat acoustics are underrated.`);
  addReply('p77', 'mira', 290, `Rainy afternoon is a color.`);
  addReply('p77', 'leila', 285, `That glaze would make a good cup.`);
  addReply('p78', 'sam', 320, `Benches are infrastructure.`);
  addReply('p78', 'priya', 315, `Shade is a public service.`);
  addReply('p78', 'dario', 310, `And a place to sit with coffee.`);
  addReply('p79', 'noor', 350, `I know exactly which book you mean.`);
  addReply('p79', 'eli', 345, `The last ten minutes of daylight. Perfect.`);
  addReply('p80', 'jules', 385, `Eight seconds is enough.`);
  addReply('p80', 'kenji', 380, `The wait is part of the frame.`);
  addReply('p81', 'priya', 420, `Fewer badges is a design improvement.`);
  addReply('p81', 'tomas', 415, `Room to read. Imagine.`);
  addReply('p82', 'ravi', 460, `A timetable is a promise.`);
  addReply('p82', 'sam', 455, `Committee promises are still promises.`);
  addReply('p83', 'ana', 500, `Paper, not cardboard. Good crust.`);
  addReply('p83', 'theo', 495, `The sound test is real.`);
  addReply('p84', 'hana', 545, `Salt and panic. Every time.`);
  addReply('p84', 'mae', 540, `The best drawings are a little unsafe.`);
  addReply('p85', 'eli', 590, `Missing captions are still captions.`);
  addReply('p85', 'clara', 585, `Everyone is someone's missing caption. Yes.`);
  addReply('p86', 'tomas', 640, `Deleting a flag is a feature.`);
  addReply('p86', 'sam', 635, `Smaller and clearer. Good trade.`);
  addReply('p87', 'mira', 695, `Bread and a better mood. The correct errand.`);
  addReply('p87', 'lena', 690, `The long way is usually the right way.`);
  addReply('p88', 'iris', 750, `The city is the best sample pack.`);
  addReply('p88', 'sana', 745, `I want to hear the pulse.`);
  addReply('p89', 'leila', 810, `Staying put is a practice.`);
  addReply('p89', 'mira', 805, `Perfect light is a valid reason.`);
  addReply('p90', 'dario', 880, `Fewer than hoped, more than feared. Every city.`);
  addReply('p90', 'sam', 875, `Map the benches, save the summer.`);
  addReply('p91', 'noor', 950, `Weather and regret. My whole shelf.`);
  addReply('p91', 'eli', 945, `Shelf talker of the year.`);
  addReply('p92', 'kenji', 1030, `Three keepers is a good roll.`);
  addReply('p92', 'jules', 1025, `The rest is research. Always.`);
  addReply('p93', 'lena', 1110, `The school bus poem is a real poem.`);
  addReply('p93', 'clara', 1105, `Children notice the good stuff.`);
  addReply('p94', 'tomas', 1200, `The second version listens. True.`);
  addReply('p94', 'priya', 1195, `First drafts are arguments.`);
  addReply('p95', 'theo', 1300, `No score, good sleep. The best game.`);
  addReply('p95', 'sam', 1295, `The field after school is a public good.`);
  addReply('p96', 'hana', 1410, `The kettle has range.`);
  addReply('p96', 'mae', 1405, `The toaster is just a box.`);
  addReply('p97', 'ana', 1530, `Keep the mistake.`);
  addReply('p97', 'mira', 1525, `The green one, obviously.`);
  addReply('p98', 'mira', 1670, `The repairs are the best part.`);
  addReply('p98', 'leila', 1665, `Visible mending is a diary.`);
  addReply('p99', 'ana', 1820, `Kiln birthday. Perfect.`);
  addReply('p99', 'theo', 1815, `Opening the kiln is the best morning.`);
  addReply('p100', 'mae', 1990, `A feed that knows when to stop.`);
  addReply('p100', 'noor', 1985, `Quiet is not empty.`);
  addReply('p100', 'jules', 1980, `This is the whole idea.`);

  addReply('p101', 'mae', 7, `The better sentences are always slower.`);
  addReply('p101', 'clara', 6, `Handwriting is a filter.`);
  addReply('p102', 'mira', 14, `Fog is good company.`);
  addReply('p103', 'ravi', 30, `Wet socks are a small price.`);
  addReply('p105', 'yuki', 60, `That red is doing everything.`);
  addReply('p106', 'jules', 84, `The street was waiting for this.`);
  addReply('p107', 'sam', 100, `Quiet tools, loud results.`);
  addReply('p108', 'priya', 130, `Save me a handful.`);
  addReply('p109', 'ana', 170, `The light found it.`);
  addReply('p110', 'ana', 210, `The garden knows.`);
  addReply('p111', 'clara', 270, `A courtyard with no schedule is the dream.`);
  addReply('p112', 'theo', 335, `That chrome has seen things.`);
  addReply('p113', 'mira', 405, `The best kind of weather.`);
  addReply('p114', 'dario', 515, `The edge of town is underrated.`);
  addReply('p115', 'hana', 645, `The last light is the honest one.`);
  addReply('p116', 'eli', 85, `The ticket is the story.`);
  addReply('p117', 'adam', 235, `It is always the config.`);
  addReply('p118', 'leila', 475, `The crack is the signature.`);
  addReply('p119', 'lena', 695, `Nobody minded. That is the review.`);
  addReply('p120', 'clara', 895, `The cat has chosen.`);
  addReply('p121', 'mae', 22, `The third frame.`);
  addReply('p121', 'hana', 20, `The weather always does.`);
  addReply('p121', 'theo', 18, `That last frame is the whole walk.`);

  const chats = [
    { id: 'c1', userId: 'mae', lastRead: t(110), r: 0, replies: [`Deal. I'll bring the good pen.`, `Yes. Exactly that.`, `I'll send you the details tonight.`] },
    { id: 'c2', userId: 'jules', lastRead: t(160), r: 0, replies: [`Ha. You're too kind.`, `Thursday works. I'll text you the corner.`, `Bring a jacket. The roof is windy.`] },
    { id: 'c3', userId: 'noor', lastRead: t(1450), r: 0, replies: [`That one stayed with me too.`, `I'll lend you my copy.`, `Let's talk about it over coffee.`] },
    { id: 'c4', userId: 'tomas', lastRead: t(2700), r: 0, replies: [`On it.`, `Ha. Told you.`, `I'll send a patch later.`] },
    { id: 'c5', userId: 'sam', lastRead: t(4100), r: 0, replies: [`One arrow, two years. That's the job.`, `Glad it reads well.`, `I'll show you the early drafts sometime.`] },
    { id: 'c6', userId: 'iris', lastRead: t(30), r: 0, replies: [`I'll send you the rough cut.`, `It is mostly rain, honestly.`, `Headphones recommended.`] },
    { id: 'c7', userId: 'mira', lastRead: t(500), r: 0, replies: [`Bring the mended one.`, `Tea is already on.`, `No rush at all.`] },
    { id: 'c8', userId: 'priya', lastRead: t(55), r: 0, replies: [`I'll send the next draft.`, `One button. Always.`, `The prototype is in your inbox.`] },
    { id: 'c9', userId: 'marco', lastRead: t(300), r: 0, replies: [`I'll save you the corner piece.`, `Thursday, then.`, `Flour everywhere, as usual.`] },
    { id: 'c10', userId: 'yuki', lastRead: t(20), r: 0, replies: [`I'll bring the sketchbook.`, `The kettle has range.`, `More ink soon.`] },
    { id: 'c11', userId: 'sofia', lastRead: t(800), r: 0, replies: [`I'll send the map reference.`, `The courtyard is worth it.`, `Archives are patient.`] },
    { id: 'c12', userId: 'ben', lastRead: t(60), r: 0, replies: [`Headphones recommended.`, `The city did the work.`, `I'll send the rough mix.`] },
    { id: 'c13', userId: 'clara', lastRead: t(400), r: 0, replies: [`Holding it behind the counter.`, `Weather and regret. Yes.`, `Come by after six.`] },
    { id: 'c14', userId: 'ravi', lastRead: t(1200), r: 0, replies: [`The map is in the shared folder.`, `Benches first.`, `Shade is infrastructure.`] },
    { id: 'c15', userId: 'hana', lastRead: t(145), r: 0, replies: [`On my way.`, `Take your time.`, `Call me when you can.`] },
    { id: 'c16', userId: 'lena', lastRead: t(14), r: 0, replies: [`I love you too.`, `See you at eight.`, `Bring the good glasses.`] },
    { id: 'c17', userId: 'mara', lastRead: t(400), r: 0, replies: [`Who is this?`, `Stop messaging me.`, `I am blocking this number.`] },
    { id: 'c18', userId: 'adam', lastRead: t(10), r: 0, replies: [`Nice work.`, `Sleep well.`, `Roll it back if needed.`] },
    { id: 'c19', userId: 'leila', lastRead: t(200), r: 0, replies: [`I will be there.`, `Tea sounds good.`, `Save me the blue one.`] },
    { id: 'c20', userId: 'owen', lastRead: t(500), r: 0, replies: [`That is a win.`, `Keep the programme.`, `The kids did well.`] },
    { id: 'c21', userId: 'dario', lastRead: t(800), r: 0, replies: [`I will trust the map.`, `Legs are ready.`, `Send the route.`] },
    { id: 'c22', userId: 'theo', lastRead: t(1000), r: 0, replies: [`Send the photo.`, `Pride is earned.`, `The branch lives on.`] },
  ];

  const messages = {
    c1: [
      { id: 'm1', from: 'them', ts: t(130), text: `Are you coming to the type walk on Saturday?` },
      { id: 'm2', from: 'me', ts: t(122), text: `Wouldn't miss it. Rain or shine?` },
      { id: 'm3', from: 'them', ts: t(115), text: `Shine, allegedly.` },
      { id: 'm4', from: 'them', ts: t(20), text: `Bring the small notebook.` }
    ],
    c2: [
      { id: 'm5', from: 'them', ts: t(320), text: `The rain did most of the work.` },
      { id: 'm6', from: 'me', ts: t(310), text: `Still. That rooftop frame is unreal.` },
      { id: 'm7', from: 'them', ts: t(180), text: `There's another walk Thursday if you want in.` },
      { id: 'm8', from: 'them', ts: t(170), text: `Golden hour, east side.` }
    ],
    c3: [
      { id: 'm9', from: 'them', ts: t(1520), text: `Finished the essay collection. You were right.` },
      { id: 'm10', from: 'me', ts: t(1510), text: `Which one stayed with you?` },
      { id: 'm11', from: 'them', ts: t(1490), text: `The one about the house by the sea. Obviously.` }
    ],
    c4: [
      { id: 'm12', from: 'them', ts: t(2900), text: `Pushed the fix. Try it on the slow laptop.` },
      { id: 'm13', from: 'them', ts: t(2890), text: `Also: 400 lines gone.` },
      { id: 'm14', from: 'me', ts: t(2800), text: `Beautiful.` }
    ],
    c5: [
      { id: 'm15', from: 'me', ts: t(4400), text: `Saw the new bus map. Much better.` },
      { id: 'm16', from: 'them', ts: t(4300), text: `Thank you. Two years for one arrow.` },
      { id: 'm17', from: 'me', ts: t(4200), text: `Worth every one.` }
    ],
    c6: [
      { id: 'm18', from: 'them', ts: t(44), text: `I recorded the rain again. It is becoming a habit.` },
      { id: 'm19', from: 'me', ts: t(38), text: `A good habit. Send it over.` }
    ],
    c7: [
      { id: 'm20', from: 'them', ts: t(640), text: `The sleeve held. Three winters and counting.` },
      { id: 'm21', from: 'me', ts: t(600), text: `You have to show me the stitch.` }
    ]
  };

  let nextMessage = 22;
  const addMessage = (chatId, from, min, text) => {
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push({ id: 'm' + nextMessage++, from, ts: t(min), text });
  };
  addMessage('c8', 'them', 120, `The ticket machine redesign is finally moving.`);
  addMessage('c8', 'me', 110, `One button or two?`);
  addMessage('c8', 'them', 90, `One. And a sentence that tells the truth.`);
  addMessage('c8', 'them', 12, `Sent you the prototype.`);
  addMessage('c9', 'them', 500, `The starter survived the weekend.`);
  addMessage('c9', 'me', 480, `Stronger than most of us.`);
  addMessage('c9', 'them', 260, `Bringing a loaf Thursday.`);
  addMessage('c10', 'me', 200, `The fourth window is my favorite.`);
  addMessage('c10', 'them', 180, `It finally has weather.`);
  addMessage('c10', 'them', 90, `Sending the ink drawing.`);
  addMessage('c11', 'them', 1000, `Found the courtyard on the old map.`);
  addMessage('c11', 'me', 950, `The second entrance?`);
  addMessage('c11', 'them', 700, `Exactly. I'll show you.`);
  addMessage('c12', 'them', 150, `Last bus recording is up.`);
  addMessage('c12', 'me', 140, `The engine in A.`);
  addMessage('c12', 'them', 30, `The city is the sample pack.`);
  addMessage('c13', 'me', 600, `That shelf talker is perfect.`);
  addMessage('c13', 'them', 550, `Weather and regret.`);
  addMessage('c13', 'them', 350, `Holding a copy for you.`);
  addMessage('c14', 'them', 1500, `Bench map is done.`);
  addMessage('c14', 'me', 1450, `Fewer than hoped?`);
  addMessage('c14', 'them', 1100, `More than feared. Sending it.`);

  addMessage('c15', 'me', 165, `I'm up. Where are you?`);
  addMessage('c15', 'me', 155, `No rush. Send me the view.`);
  const hanaPlaces = [
    'platform 3', 'the window seat', 'the cafe car', 'the bridge', 'the old market',
    'the north exit', 'the bookshop', 'the river path', 'the tram stop', 'the roof terrace',
    'the corner bakery', 'the museum steps', 'the garden gate', 'the station clock',
    'the last carriage', 'the ferry queue', 'the quiet street'
  ];
  const hanaNotes = [
    'The light is doing that thing again.',
    'Someone is carrying a cello.',
    'The coffee is bad in a useful way.',
    'I found a bench with a view.',
    'The rain started and stopped twice.',
    'A dog just sat on my foot.',
    'The tiles are the good kind of green.',
    'I lost my gloves and found them in my bag.',
    'The city looks better from here.',
    'I am sending you a photo later.',
    'The announcement was mostly static.',
    'A stranger recommended a bakery.',
    'The sky is the color of an old postcard.'
  ];
  for (let i = 0; i < 137; i++) {
    const text = i === 136
      ? `Made it home. Call me when you can.`
      : `${hanaPlaces[i % hanaPlaces.length]}: ${hanaNotes[(i * 7) % hanaNotes.length]}`;
    addMessage('c15', 'them', 130 - i * 0.85, text);
  }

  addMessage('c16', 'them', 300, `I left the book on your step. Page 84.`);
  addMessage('c16', 'me', 295, `You remembered.`);
  addMessage('c16', 'them', 290, `Of course I did.`);
  addMessage('c16', 'me', 200, `Dinner at eight? I'm making the thing with the lemon.`);
  addMessage('c16', 'them', 190, `I'll bring wine and the good glasses.`);
  addMessage('c16', 'them', 60, `Also. I like your face.`);
  addMessage('c16', 'me', 50, `That's convenient.`);
  addMessage('c16', 'them', 15, `I love you. See you at eight.`);
  addMessage('c16', 'me', 10, `I love you too.`);
  addMessage('c16', 'them', 5, `I know. Don't be late.`);

  addMessage('c17', 'them', 380, `You changed your number. That was rude.`);
  addMessage('c17', 'them', 360, `I can see the light in your window from here.`);
  addMessage('c17', 'them', 340, `You should not have posted that photo.`);
  addMessage('c17', 'them', 320, `I know the cafe you go to on Tuesdays.`);
  addMessage('c17', 'them', 300, `Do not tell anyone about this chat.`);
  addMessage('c17', 'them', 280, `I will be outside at seven.`);
  addMessage('c17', 'them', 260, `You have until Friday.`);
  addMessage('c17', 'them', 240, `Do not make me come up.`);
  addMessage('c17', 'them', 220, `This is the only warning you get.`);
  addMessage('c17', 'them', 200, `I know which window is yours.`);
  addMessage('c17', 'them', 180, `See you soon.`);

  addMessage('c18', 'them', 120, `The migration finished.`);
  addMessage('c18', 'me', 115, `Any errors?`);
  addMessage('c18', 'them', 110, `A warning about a warning.`);
  addMessage('c18', 'me', 105, `The best kind.`);
  addMessage('c18', 'them', 100, `I'm going to sleep for a week.`);
  addMessage('c18', 'me', 95, `Deserved.`);

  addMessage('c19', 'them', 300, `Kiln is fixed.`);
  addMessage('c19', 'me', 290, `The bowls?`);
  addMessage('c19', 'them', 280, `Better than before.`);
  addMessage('c19', 'them', 120, `Come by after six.`);
  addMessage('c19', 'me', 110, `I'll bring tea.`);
  addMessage('c19', 'them', 90, `Bring the good kind.`);

  addMessage('c20', 'them', 700, `The school play ran eleven minutes over.`);
  addMessage('c20', 'me', 690, `Did anyone mind?`);
  addMessage('c20', 'them', 680, `Not one person.`);
  addMessage('c20', 'me', 670, `That's the review.`);
  addMessage('c20', 'them', 600, `I'm keeping the programme.`);

  addMessage('c21', 'them', 900, `The hill route is clear.`);
  addMessage('c21', 'me', 890, `Legs say no.`);
  addMessage('c21', 'them', 880, `The view says yes.`);
  addMessage('c21', 'them', 850, `I'll send the map.`);
  addMessage('c21', 'me', 840, `The map lied last time.`);
  addMessage('c21', 'them', 830, `It apologised.`);
  addMessage('c21', 'them', 820, `New route. Promise.`);

  addMessage('c22', 'them', 1200, `Shelf is done.`);
  addMessage('c22', 'me', 1190, `From the fallen branch?`);
  addMessage('c22', 'them', 1180, `Same branch. Three books and a lot of pride.`);
  addMessage('c22', 'me', 1170, `Send a photo.`);
  addMessage('c22', 'them', 1160, `In the morning light.`);

  const follows = {
    me: ['mae', 'jules', 'noor', 'lena', 'iris', 'mira', 'priya', 'marco', 'yuki', 'sofia', 'ben', 'clara', 'hana', 'ravi'],
    mae: ['jules', 'noor', 'tomas', 'iris', 'mira', 'sana', 'priya', 'yuki', 'clara', 'me'],
    jules: ['mae', 'kenji', 'ana', 'theo', 'hana', 'me'],
    noor: ['mae', 'lena', 'sam', 'eli', 'sofia', 'clara', 'me'],
    tomas: ['sam', 'jules', 'dario', 'adam', 'me'],
    ana: ['jules', 'kenji', 'mira', 'lena', 'leila', 'marco'],
    kenji: ['jules', 'ana', 'theo', 'sam', 'hana'],
    lena: ['noor', 'ana', 'mira', 'ingrid', 'owen', 'me'],
    sam: ['tomas', 'noor', 'dario', 'eli', 'ravi'],
    iris: ['mae', 'mira', 'noor', 'ben', 'sana', 'me'],
    dario: ['tomas', 'sam', 'eli', 'ravi'],
    mira: ['ana', 'lena', 'iris', 'mae', 'ingrid', 'leila', 'me'],
    eli: ['noor', 'sam', 'dario', 'sofia', 'clara'],
    sana: ['mae', 'theo', 'iris', 'ben'],
    theo: ['kenji', 'jules', 'sana', 'marco', 'owen'],
    priya: ['mae', 'jules', 'yuki', 'clara', 'ravi', 'me'],
    marco: ['ana', 'theo', 'ben', 'priya', 'leila'],
    yuki: ['priya', 'clara', 'hana', 'mae', 'me'],
    sofia: ['eli', 'noor', 'ravi', 'clara', 'ingrid'],
    adam: ['tomas', 'sam', 'ravi', 'me'],
    leila: ['ana', 'mira', 'ingrid', 'mae', 'marco'],
    ben: ['iris', 'sana', 'marco', 'hana'],
    ingrid: ['mira', 'leila', 'theo', 'lena', 'sofia'],
    ravi: ['sam', 'dario', 'sofia', 'adam', 'priya'],
    clara: ['noor', 'eli', 'yuki', 'priya', 'me'],
    hana: ['jules', 'kenji', 'ben', 'yuki', 'owen'],
    owen: ['noor', 'lena', 'theo', 'clara', 'hana', 'me'],
  };

  return {
    version: 1,
    theme: 'auto',
    auth: null,
    me,
    users,
    follows,
    posts,
    replies,
    chats,
    messages,
    liked: ['p3', 'p12', 'p24', 'p19', 'p54', 'p55', 'p59', 'p63', 'p70', 'p75', 'p78', 'p81', 'p90', 'p94', 'p99', 'p100', 'p101', 'p105', 'p108', 'p110', 'p115', 'p118', 'p121'],
    bookmarked: ['p24', 'p12', 'p57', 'p66', 'p71', 'p79', 'p83', 'p91', 'p96', 'p99', 'p109', 'p114', 'p119', 'p121'],
    uploaded: {}
  };
}
