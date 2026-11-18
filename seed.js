// Demo content for Koinara. Everything is local. Reset it from Settings.

const DIM = {
  p01: [800, 533], p02: [800, 469], p03: [800, 533], p04: [800, 477],
  p05: [800, 533], p06: [800, 533], p07: [800, 533], p08: [800, 533],
  p09: [800, 532], p10: [800, 534], p11: [800, 533], p12: [800, 533],
  p13: [800, 532], p14: [800, 550], p15: [800, 590], p16: [800, 533],
  p17: [800, 479], p18: [800, 1200]
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
    { id: 'sam', name: 'Sam Okoye', handle: 'samokoye', bio: 'Design systems, public transport, good bread.', joined: 'May 2022' },
    { id: 'iris', name: 'Iris Bell', handle: 'irisbell', bio: 'Sound, cities, and the space between them.', joined: 'July 2022', avatar: { s: 'av-iris' } },
    { id: 'dario', name: 'Dario Fontana', handle: 'dario', bio: 'Cycling, maps, and very strong coffee.', joined: 'October 2023' },
    { id: 'mira', name: 'Mira Halvorsen', handle: 'mirah', bio: 'Knitting, weather, small rooms.', joined: 'March 2021', avatar: { s: 'av-mira' } },
    { id: 'eli', name: 'Eli Park', handle: 'elipark', bio: 'Libraries, archives, marginal notes.', joined: 'December 2022', avatar: { s: 'av-eli' } },
    { id: 'sana', name: 'Sana Qureshi', handle: 'sanaq', bio: 'Radio producer. Always listening.', joined: 'May 2023' },
    { id: 'theo', name: 'Theo Lindqvist', handle: 'theo', bio: 'Woodwork and long walks.', joined: 'February 2024', avatar: { s: 'av-theo' } }
  ];

  const me = {
    id: 'me',
    name: 'Alex',
    handle: 'alex',
    bio: 'Looking for quieter corners of the internet.',
    joined: 'March 2024',
    avatar: null
  };

  const posts = [
    { id: 'p1', userId: 'mae', ts: t(6), likes: 28, text: `The best kerning is the kind nobody notices. Same with good interfaces.` },
    { id: 'p2', userId: 'jules', ts: t(18), likes: 41, text: `Morning light on the kitchen table. Nothing else happening, which is the point.`, images: [im('p01', 'Two hands holding cups of coffee with latte art')] },
    { id: 'p3', userId: 'noor', ts: t(34), likes: 63, text: `Re-reading a book you loved at twenty is a strange kind of time travel. The sentences are the same. You are not.` },
    { id: 'p4', userId: 'tomas', ts: t(52), likes: 19, text: `Deleted 400 lines today. The feature still works. Best day of the week.` },
    { id: 'p5', userId: 'ana', ts: t(80), likes: 33, text: `The glaze test came out of the kiln a little too green, which is exactly right.`, images: [im('p17', 'Hands shaping a pot on a pottery wheel')] },
    { id: 'p6', userId: 'kenji', ts: t(120), likes: 26, text: `Shot a whole roll at f/8 and hyperfocal. Everything sharp. Feels like cheating.`, images: [im('p04', 'Rolling green hills under a soft sunset')] },
    { id: 'p33', userId: 'me', ts: t(130), likes: 12, text: `Trying this out. Quiet feed, no videos, just words and the occasional photo. Feels right.` },
    { id: 'p7', userId: 'lena', ts: t(160), likes: 71, text: `The plant on my desk has outlived three jobs. I think it is the manager now.`, images: [im('p08', 'A small succulent in a pale pot')] },
    { id: 'p8', userId: 'sam', ts: t(180), likes: 22, text: `A transit map is a design system with consequences. Miss a connection and it is someone's evening.` },
    { id: 'p9', userId: 'mae', ts: t(240), likes: 17, text: `Small type on cheap paper is the real test. Everything looks good at 96pt on a retina display.` },
    { id: 'p10', userId: 'jules', ts: t(300), likes: 38, text: `Two corners of the same city, ten minutes apart.`, images: [im('p05', 'A white geometric building against a pale sky'), im('p06', 'Dark skyscrapers seen from street level')] },
    { id: 'p11', userId: 'noor', ts: t(360), likes: 58, text: `Current stack: one novel, one essay collection, one book I keep pretending I will finish.`, images: [im('p09', 'A stack of colourful books seen from the side')] },
    { id: 'p12', userId: 'tomas', ts: t(480), likes: 45, text: `Hot take: the fastest loading state is the one you designed out.` },
    { id: 'p13', userId: 'ana', ts: t(600), likes: 32, text: `Slow morning. Coffee, clay, no phone until noon. I am telling you this from my phone.` },
    { id: 'p14', userId: 'kenji', ts: t(720), likes: 29, text: `Grain, dust, light leaks. The imperfections are the only honest part.`, images: [im('p13', 'A calm beach at sunset with soft light on the water')] },
    { id: 'p15', userId: 'lena', ts: t(960), likes: 51, text: `A poem I wrote on the back of a receipt is still better than the one I typed.` },
    { id: 'p16', userId: 'sam', ts: t(1200), likes: 24, text: `Good signage does not make you feel smart. It makes you feel like you are already where you should be.` },
    { id: 'p17', userId: 'mae', ts: t(1440), likes: 36, text: `Letter spacing is not decoration. It is breathing room.` },
    { id: 'p34', userId: 'me', ts: t(1500), likes: 6, text: `Collected a few links on slow software and lost them immediately. The intention was there.` },
    { id: 'p18', userId: 'jules', ts: t(1680), likes: 47, text: `A reading room that smells like paper and rain. I stayed until they turned the lights off.`, images: [im('p02', 'Warm shelves full of old books')] },
    { id: 'p19', userId: 'noor', ts: t(1920), likes: 44, text: `The library was empty except for the radiator and me. Perfect afternoon.`, images: [im('p10', 'A curved library with tall wooden shelves')] },
    { id: 'p20', userId: 'tomas', ts: t(2160), likes: 31, text: `Shipping is a feature. So is stopping.` },
    { id: 'p21', userId: 'ana', ts: t(2880), likes: 67, text: `Twelve cups, three handles, one that warped in the kiln. Keeping the warped one.`, images: [im('p18', 'A tall stack of handmade cream ceramic cups')] },
    { id: 'p22', userId: 'kenji', ts: t(3240), likes: 40, text: `Walked until the film ran out. Then walked a little more.`, images: [im('p11', 'A wooden bridge through a dark green forest')] },
    { id: 'p23', userId: 'lena', ts: t(3600), likes: 34, text: `Repotted everything. My hands smell like soil and I am unreasonably happy about it.`, images: [im('p03', 'A scoop of dark soil beside a small plant')] },
    { id: 'p24', userId: 'sam', ts: t(4320), likes: 55, text: `The best interface I used this week was a paper timetable at a bus stop. No battery, no update.` },
    { id: 'p25', userId: 'mae', ts: t(4680), likes: 23, text: `There is a particular joy in a lowercase g that just works.` },
    { id: 'p26', userId: 'jules', ts: t(5760), likes: 43, text: `Blue hour, same field, different weather.`, images: [im('p16', 'A field at sunset with a low sun on the horizon')] },
    { id: 'p27', userId: 'noor', ts: t(6000), likes: 39, text: `Reading outside until the light goes. The book can wait.`, images: [im('p12', 'A mountain lake with a small wooden cabin')] },
    { id: 'p28', userId: 'tomas', ts: t(7200), likes: 18, text: `A demo is a promise. Do not make promises you cannot keep on a laptop from 2017.`, images: [im('p07', 'A tidy desk with a laptop and a small plant')] },
    { id: 'p29', userId: 'ana', ts: t(7920), likes: 27, text: `The studio is cold but the clay is warm. A reasonable trade.`, images: [im('p15', 'A quiet corner with a white chair and a potted plant')] },
    { id: 'p30', userId: 'kenji', ts: t(8640), likes: 36, text: `Last frame of the roll. Always the one you forget you took.` },
    { id: 'p31', userId: 'lena', ts: t(9000), likes: 41, text: `Everything is a draft. The plant, the poem, the week.` },
    { id: 'p32', userId: 'sam', ts: t(9360), likes: 30, text: `Took the long bus home to see the city slowly. Recommended.` },
    { id: 'p35', userId: 'me', ts: t(5000), likes: 21, text: `Walked home the long way. Saw a cat, a good door, and a sunset.`, images: [im('p14', 'A black and white cat resting on a wooden surface')] },
    { id: 'p36', userId: 'iris', ts: t(11), likes: 27, text: `Recorded the rain on the fire escape. Nine minutes of it. Might be the whole album.`, tags: ['rain', 'radio'] },
    { id: 'p37', userId: 'iris', ts: t(95), likes: 34, text: `A city is mostly transitions. The parts between places are the parts I remember.`, images: [im('p06', 'Dark skyscrapers seen from street level')], tags: ['cities', 'walking', 'quiet'] },
    { id: 'p38', userId: 'dario', ts: t(44), likes: 19, text: `Took the hill route home. Legs say no, photos say yes.`, images: [im('p16', 'A field at sunset with a low sun on the horizon')], tags: ['walking', 'light'] },
    { id: 'p39', userId: 'dario', ts: t(340), likes: 31, text: `Every map is an argument about what matters.`, tags: ['transit', 'design'] },
    { id: 'p40', userId: 'mira', ts: t(70), likes: 42, text: `The kettle, the window, the same chair. A whole day can be this small.`, images: [im('p15', 'A quiet corner with a white chair and a potted plant')], tags: ['home', 'slow', 'morning'] },
    { id: 'p41', userId: 'mira', ts: t(540), likes: 23, text: `Mended the sleeve instead of replacing the shirt. Three winters older now.`, tags: ['making', 'home'] },
    { id: 'p42', userId: 'eli', ts: t(210), likes: 38, text: `Found a note in a returned book: "page 84, if you get here." I got here.`, tags: ['books', 'library', 'memory'] },
    { id: 'p43', userId: 'eli', ts: t(880), likes: 26, text: `Archive smell is just time with the dust left in.`, tags: ['library', 'slow'] },
    { id: 'p44', userId: 'sana', ts: t(420), likes: 29, text: `The best interview was twenty minutes of silence and one good question.`, tags: ['radio', 'quiet'] },
    { id: 'p45', userId: 'sana', ts: t(1320), likes: 17, text: `Editing audio is mostly deciding what to leave out. Like most things.`, tags: ['radio', 'craft'] },
    { id: 'p46', userId: 'theo', ts: t(760), likes: 36, text: `Made a shelf from a fallen branch. It holds three books and a lot of pride.`, tags: ['making', 'home'] },
    { id: 'p47', userId: 'theo', ts: t(1560), likes: 24, text: `Walked the ridge before the light changed. No photos, just the walk.`, tags: ['walking', 'quiet'] },
    { id: 'p48', userId: 'jules', ts: t(25), likes: 33, text: `Three corners of the same walk.`, images: [im('p05', 'A white geometric building against a pale sky'), im('p06', 'Dark skyscrapers seen from street level'), im('p10', 'A curved library with tall wooden shelves')], ratio: '16:9', tags: ['cities', 'light', 'walking'] },
    { id: 'p49', userId: 'mira', ts: t(150), likes: 28, text: `The chair, the window, the plant. A small study in stillness.`, images: [im('p15', 'A quiet corner with a white chair and a potted plant'), im('p08', 'A small succulent in a pale pot')], ratio: '1:1', tags: ['home', 'quiet', 'slow'] },
    { id: 'p50', userId: 'noor', ts: t(260), likes: 47, text: `A stack, a shelf, a room that smells like rain.`, images: [im('p09', 'A stack of colourful books seen from the side'), im('p02', 'Warm shelves full of old books'), im('p10', 'A curved library with tall wooden shelves')], ratio: '4:3', tags: ['books', 'library', 'rain'] },
    { id: 'p51', userId: 'iris', ts: t(470), likes: 39, text: `Three frames from the ridge. The light did all the work.`, images: [im('p04', 'Rolling green hills under a soft sunset'), im('p13', 'A calm beach at sunset with soft light on the water'), im('p16', 'A field at sunset with a low sun on the horizon')], ratio: '16:9', tags: ['light', 'walking', 'film'] },
    { id: 'p52', userId: 'lena', ts: t(700), likes: 31, text: `A portrait of the desk at three times of day.`, images: [im('p18', 'A tall stack of handmade cream ceramic cups'), im('p07', 'A tidy desk with a laptop and a small plant'), im('p15', 'A quiet corner with a white chair and a potted plant')], ratio: '3:4', tags: ['plants', 'home', 'slow'] },
    { id: 'p53', userId: 'jules', ts: t(900), likes: 52, text: `Five corners of the city, one square at a time.`, images: [im('p05', 'A white geometric building against a pale sky'), im('p06', 'Dark skyscrapers seen from street level'), im('p10', 'A curved library with tall wooden shelves'), im('p13', 'A calm beach at sunset with soft light on the water'), im('p16', 'A field at sunset with a low sun on the horizon')], ratio: '1:1', tags: ['cities', 'light', 'walking'] }
  ];

  const POST_TAGS = {
    p1: ['type', 'craft'], p2: ['morning', 'light', 'coffee'], p3: ['books', 'memory'],
    p4: ['code', 'craft'], p5: ['clay', 'making'], p6: ['film', 'light', 'walking'],
    p7: ['plants', 'home'], p8: ['transit', 'design'], p9: ['type', 'paper'],
    p10: ['cities', 'light'], p11: ['books', 'quiet'], p12: ['code', 'slow'],
    p13: ['morning', 'slow'], p14: ['film', 'light'], p15: ['books', 'poetry'],
    p16: ['design', 'cities'], p17: ['type', 'craft'], p18: ['books', 'rain'],
    p19: ['library', 'quiet'], p20: ['code', 'craft'], p21: ['clay', 'making'],
    p22: ['film', 'walking'], p23: ['plants', 'home'], p24: ['design', 'transit'],
    p25: ['type', 'craft'], p26: ['film', 'light'], p27: ['books', 'quiet'],
    p28: ['code', 'craft'], p29: ['clay', 'home'], p30: ['film', 'memory'],
    p31: ['plants', 'poetry'], p32: ['cities', 'transit'], p33: ['slow', 'quiet'],
    p34: ['slow', 'quiet'], p35: ['walking', 'light']
  };
  for (const p of posts) if (!p.tags) p.tags = POST_TAGS[p.id] || [];

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

  const chats = [
    { id: 'c1', userId: 'mae', lastRead: t(110), r: 0, replies: [`Deal. I'll bring the good pen.`, `Yes. Exactly that.`, `I'll send you the details tonight.`] },
    { id: 'c2', userId: 'jules', lastRead: t(160), r: 0, replies: [`Ha. You're too kind.`, `Thursday works. I'll text you the corner.`, `Bring a jacket. The roof is windy.`] },
    { id: 'c3', userId: 'noor', lastRead: t(1450), r: 0, replies: [`That one stayed with me too.`, `I'll lend you my copy.`, `Let's talk about it over coffee.`] },
    { id: 'c4', userId: 'tomas', lastRead: t(2700), r: 0, replies: [`On it.`, `Ha. Told you.`, `I'll send a patch later.`] },
    { id: 'c5', userId: 'sam', lastRead: t(4100), r: 0, replies: [`One arrow, two years. That's the job.`, `Glad it reads well.`, `I'll show you the early drafts sometime.`] },
    { id: 'c6', userId: 'iris', lastRead: t(30), r: 0, replies: [`I'll send you the rough cut.`, `It is mostly rain, honestly.`, `Headphones recommended.`] },
    { id: 'c7', userId: 'mira', lastRead: t(500), r: 0, replies: [`Bring the mended one.`, `Tea is already on.`, `No rush at all.`] }
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

  const follows = {
    me: ['mae', 'jules', 'noor', 'lena', 'iris', 'mira'],
    mae: ['jules', 'noor', 'tomas', 'iris', 'mira', 'sana', 'me'],
    jules: ['mae', 'kenji', 'ana', 'theo', 'me'],
    noor: ['mae', 'lena', 'sam', 'eli', 'me'],
    tomas: ['sam', 'jules', 'dario', 'me'],
    ana: ['jules', 'kenji', 'mira', 'lena'],
    kenji: ['jules', 'ana', 'theo', 'sam'],
    lena: ['noor', 'ana', 'mira', 'me'],
    sam: ['tomas', 'noor', 'dario', 'eli'],
    iris: ['mae', 'mira', 'noor', 'me'],
    dario: ['tomas', 'sam', 'eli'],
    mira: ['ana', 'lena', 'iris', 'mae', 'me'],
    eli: ['noor', 'sam', 'dario'],
    sana: ['mae', 'theo', 'iris'],
    theo: ['kenji', 'jules', 'sana']
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
    liked: ['p3', 'p12', 'p24', 'p19'],
    bookmarked: ['p24', 'p12'],
    uploaded: {}
  };
}
