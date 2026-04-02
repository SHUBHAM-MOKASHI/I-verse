const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const WORDS = [
  // Indian context - Foods & Drinks
  "Samosa", "Jalebi", "Biryani", "Lassi", "Pani Puri", "Gol Gappa", "Chai", "Vada Pav", "Pav Bhaji", "Gulab Jamun", "Dosa", "Idli", "Butter Chicken", "Rasgulla", "Kulfi", "Paan", "Momo", "Dal Makhani", "Naan", "Roti", "Tikka", "Kachori", "Bhel Puri", "Papdi Chaat", "Ladoo", "Barfi", "Misal Pav", "Dhokla", "Chole Bhature", "Kebabs", "Shahi Tukda", "Kheer",
  
  // Desi Culture & Lifestyle
  "Rickshaw", "Auto", "Traffic Jam", "Bazaar", "Mandir", "Masjid", "Gurudwara", "Bangle", "Saree", "Kurta", "Dhoti", "Sherwani", "Jhumka", "Bindi", "Henna", "Mehndi", "Dhol", "Tabla", "Sitar", "Bonsai", "Yoga", "Ayurveda", "Cricket", "Ludo", "Snake and Ladder", "Kabbadi", "Gully", "Nukkad", "Chai Wala", "Press Wala", "Doodh Wala", "Rickshawala", "Baraat", "Shaadi",
  
  // Bollywood & Entertainment
  "Item Song", "Stunt Man", "Hero", "Heroine", "Villain", "Extra", "Cameraman", "Director", "Action", "Cut", "Superstar", "Big B", "SRK Pose", "Dabangg", "Sholay", "Gabbar Singh", "Mogambo", "Anjali", "Circuit", "Munna Bhai", "Bahu", "Sanskari", "Melodrama", "Dance Sequence", "Award Show", "Red Carpet", "Paparazzi",
  
  // Gen Z & Internet Slang
  "Rizz", "Delulu", "Ghosting", "Main Character", "Red Flag", "Situationship", "Slay", "FOMO", "No Cap", "Sus", "Flex", "Glow Up", "Simp", "Stan", "Tea Spilling", "Vibe Check", "Baddie", "Gucci", "Era", "Soft Launch", "Hard Launch", "Cringe", "Drafts", "POV", "Rent Free", "IYKYK", "Manifest", "Lowkey", "Highkey", "Ate", "Left No Notes", "Salty", "Touch Grass", "Side Eye", "Cap", "Bet", "W", "L", "Based", "Sigma", "Chad", "Giga Chad", "Boomer", "Karen",
  
  // Nature & Animals
  "Elephant", "Tiger", "Peacock", "Cow", "Langur", "Snake", "Cobra", "Mongoose", "Camel", "Gecko", "Butterfly", "Firefly", "Lotus", "Banyan Tree", "Coconut Tree", "Mango", "Himalayas", "Ganga", "Monsoon", "Thunder", "Lightning", "Rainbow", "Cloud", "Sun", "Moon", "Star", "Black Hole", "Galaxy", "Parallel Universe", "Meteor", "Eclipse", "Tsunami", "Volcano", "Waterfall", "Thunderstorm", "Jungle", "Desert", "Coral Reef",
  
  // Objects & Everyday items
  "Smartphone", "Laptop", "Headphones", "Camera", "Mirror", "Hammer", "Bicycle", "Skateboard", "Pizza", "Burger", "Donut", "Electric Guitar", "Microphone", "Dumbbell", "Remote", "Battery", "Whistle", "Coffee Mug", "Toothbrush", "Pillow", "Alarm Clock", "Lipstick", "Nail Polish", "Hair Dryer", "Towel", "Umbrella", "Backpack", "Sunglasses", "Water Bottle", "Key", "Wallet", "Spectacles", "Fan", "Ac", "Cooler", "Bulb", "Iron", "Press", "Bucket", "Mug", "Soap", "Shampoo",

  // Actions & Concepts
  "Skydiving", "Bungee Jumping", "Moonwalk", "Twerking", "Scuba Diving", "Meditation", "Surfing", "Karaoke", "Gossiping", "Sleepwalking", "Weightlifting", "Shadow Boxing", "Fortune Telling", "Magic Trick", "Crying", "Laughing", "Swimming", "Juggling", "Dancing", "Singing", "Fighting", "Hugging", "Thinking", "Dreaming", "Coding", "Cooking", "Driving", "Reading", "Writing", "Sleeping", "Waking Up",

  // Abstract & Hard
  "Gravity", "Deja Vu", "Friendzone", "Karma", "Time Travel", "Infinity", "Silence", "Chaos", "Harmony", "Glitch", "Paradox", "Evolution", "Aura", "Ego", "Nightmare", "Daydream", "Labyrinth", "Mirage", "Echo", "Shadow", "Soul", "Spirit", "Mind", "Heart", "Love", "Hate", "Peace", "War", "Life", "Death", "Time", "Space", "Energy", "Light", "Darkness"
].map(word => word.toUpperCase());

const rooms = new Map();
const socketToRoom = new Map();

// Remove intervalId and other non-serializable data before sending to clients
const sanitizeRoom = (room) => {
  if (!room) return null;
  const { intervalId, ...safeRoom } = room;
  return safeRoom;
};

const getRandomWords = (count, usedWords = []) => {
  // Filter out words already used in this room
  let available = WORDS.filter(w => !usedWords.includes(w));
  
  // If we have very few words left, just use the whole pool to avoid errors
  if (available.length < count) available = WORDS;

  const shuffled = [...available].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const getWordHint = (word) => {
  return word.split('').map(c => c === ' ' ? ' ' : '_').join(' ');
};

const revealHint = (word, currentHint) => {
  const letters = word.split('');
  const hintArray = currentHint.split(' ');
  const hiddenIndices = [];
  letters.forEach((l, i) => { if (l !== ' ' && hintArray[i] === '_') hiddenIndices.push(i); });
  if (hiddenIndices.length === 0) return currentHint;
  const randomIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
  hintArray[randomIndex] = letters[randomIndex];
  return hintArray.join(' ');
};

const getLevenshteinDistance = (a, b) => {
  const matrix = [];
  for(let i=0; i<=b.length; i++){ matrix[i] = [i]; }
  for(let j=0; j<=a.length; j++){ matrix[0][j] = j; }
  for(let i=1; i<=b.length; i++){
    for(let j=1; j<=a.length; j++){
      if(b.charAt(i-1) === a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
};

const nextTurn = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach(p => p.hasGuessed = false);
  
  if (room.drawerIndex >= room.players.length) {
    room.drawerIndex = 0;
    room.currentRound++;
  }

  if (room.currentRound > room.settings.rounds) {
    room.status = 'game_over';
    io.to(roomId).emit('game_over', { players: room.players });
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    return;
  }

  const drawer = room.players[room.drawerIndex];
  if (!drawer) return;
  
  room.players.forEach(p => p.isDrawer = (p.id === drawer.id));
  
  room.status = 'choosing_word';
  const wordChoices = getRandomWords(room.settings.wordsCount || 3, room.usedWords);
  
  io.to(roomId).emit('room_updated', sanitizeRoom(room));
  io.to(drawer.id).emit('word_choices', wordChoices);
  io.to(roomId).emit('chat_message', { system: true, text: `${drawer.name} is choosing a word...` });
};

const startTimer = (roomId, time, onExpire) => {
  const room = rooms.get(roomId);
  if (!room) return;
  
  if (room.intervalId) clearInterval(room.intervalId);
  room.timer = time;

  const wordLen = room.currentWord.replace(/\s/g, '').length;
  const hintTimes = [];
  if (wordLen === 3) {
    hintTimes.push(Math.floor(time / 2));
  } else if (wordLen > 3) {
    hintTimes.push(Math.floor(time * (2/3)));
    hintTimes.push(Math.floor(time * (1/3)));
  }
  
  io.to(roomId).emit('timer_update', room.timer);
  
  room.intervalId = setInterval(() => {
    room.timer--;
    
    if (hintTimes.includes(room.timer)) {
      room.wordHints = revealHint(room.currentWord, room.wordHints);
      io.to(roomId).emit('room_updated', sanitizeRoom(room));
      io.to(roomId).emit('chat_message', { system: true, text: `💡 Hint: A letter has been revealed!` });
    }

    io.to(roomId).emit('timer_update', room.timer);
    
    if (room.timer <= 0) {
      clearInterval(room.intervalId);
      onExpire();
    }
  }, 1000);
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', ({ roomId, playerName, avatar, settings }, callback) => {
    if (rooms.has(roomId)) {
      if (typeof callback === 'function') return callback({ error: 'Room already exists' });
      return;
    }
    
    const newRoom = {
      id: roomId,
      settings: settings || { rounds: 3, wordsCount: 3, drawTime: 60, guessTime: 30 },
      players: [{ id: socket.id, name: playerName, avatar: avatar || '🐶', score: 0, isDrawer: false, hasGuessed: false }],
      status: 'waiting',
      currentRound: 1,
      drawerIndex: 0,
      currentWord: '',
      wordHints: '',
      timer: 0,
      intervalId: null,
      disconnectedPlayers: [],
      usedWords: [] // Track used words to prevent repetition
    };
    
    rooms.set(roomId, newRoom);
    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);
    
    if (typeof callback === 'function') callback({ success: true, room: sanitizeRoom(newRoom) });
    io.to(roomId).emit('room_updated', sanitizeRoom(newRoom));
  });

  socket.on('join_room', ({ roomId, playerName, avatar }, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      if (typeof callback === 'function') return callback({ error: 'Room not found' });
      return;
    }
    if (room.players.length >= 10) {
      if (typeof callback === 'function') return callback({ error: 'Room is full' });
      return;
    }

    // Prevent duplicate entries for the same socket
    if (!room.players.some(p => p.id === socket.id)) {
      // Check if re-joining with same name
      let restoredScore = 0;
      if (room.disconnectedPlayers) {
        const oldPlayerIdx = room.disconnectedPlayers.findIndex(
          p => p.name.toLowerCase() === playerName.toLowerCase()
        );
        if (oldPlayerIdx !== -1) {
          restoredScore = room.disconnectedPlayers[oldPlayerIdx].score;
          room.disconnectedPlayers.splice(oldPlayerIdx, 1);
        }
      }
      
      room.players.push({ id: socket.id, name: playerName, avatar: avatar || '🐶', score: restoredScore, isDrawer: false, hasGuessed: false });
    }
    
    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);
    
    if (typeof callback === 'function') callback({ success: true, room: sanitizeRoom(room) });
    io.to(roomId).emit('room_updated', sanitizeRoom(room));
    io.to(roomId).emit('chat_message', { system: true, text: `${playerName} joined the room!` });
  });

  socket.on('start_game', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.status === 'waiting' && room.players.length > 1) {
      if (room.players[0].id === socket.id) {
        room.currentRound = 1;
        room.drawerIndex = 0;
        nextTurn(roomId);
      }
    }
  });

  socket.on('word_chosen', ({ roomId, word }) => {
    const room = rooms.get(roomId);
    if (room && room.status === 'choosing_word') {
      room.currentWord = word;
      room.usedWords.push(word); // Store chosen word to prevent duplicate play
      room.status = 'playing';
      room.wordHints = getWordHint(word);
      io.to(roomId).emit('room_updated', sanitizeRoom(room));
      io.to(roomId).emit('clear_canvas');
      io.to(roomId).emit('chat_message', { system: true, text: `The word has been chosen! Start guessing.` });
      
      startTimer(roomId, room.settings.drawTime, () => {
        // Time up
        io.to(roomId).emit('chat_message', { system: true, text: `Time's up! The word was ${room.currentWord}` });
        room.status = 'round_end';
        io.to(roomId).emit('room_updated', sanitizeRoom(room));
        
        setTimeout(() => {
          room.drawerIndex++;
          nextTurn(roomId);
        }, 3000);
      });
    }
  });

  socket.on('draw_line', ({ roomId, line }) => {
    socket.to(roomId).emit('draw_line', line);
  });

  socket.on('clear_canvas', (roomId) => {
    socket.to(roomId).emit('clear_canvas');
  });

  socket.on('chat_message', ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Check guess
    if (room.status === 'playing' && !player.isDrawer) {
      if (text.trim().toUpperCase() === room.currentWord) {
        if (!player.hasGuessed) {
          player.hasGuessed = true;
          // Calculate score based on time
          const points = Math.max(10, Math.floor((room.timer / room.settings.drawTime) * 100));
          player.score += points;
          
          // Drawer also gets points
          const drawer = room.players[room.drawerIndex];
          if (drawer) drawer.score += 10;
          
          io.to(roomId).emit('chat_message', { system: true, text: `${player.name} guessed the word! 🎉` });
          io.to(roomId).emit('correct_guess', { playerId: player.id, playerName: player.name });
          io.to(roomId).emit('room_updated', sanitizeRoom(room));
          
          // Check if everyone guessed
          const allGuessed = room.players.filter(p => !p.isDrawer).every(p => p.hasGuessed);
          if (allGuessed) {
            clearInterval(room.intervalId);
            io.to(roomId).emit('chat_message', { system: true, text: `Everyone guessed the word! The word was ${room.currentWord}` });
            room.status = 'round_end';
            io.to(roomId).emit('room_updated', sanitizeRoom(room));
            setTimeout(() => {
              room.drawerIndex++;
              nextTurn(roomId);
            }, 3000);
          }
        }
        return; // Don't broadcast the actual word
      } else if (!player.hasGuessed) {
        const guess = text.trim().toUpperCase();
        if (guess.length > 2) {
          const distance = getLevenshteinDistance(guess, room.currentWord);
          if (distance === 1 || (distance === 2 && room.currentWord.length > 5)) {
            socket.emit('chat_message', { system: true, text: `🎯 '${text}' is very close! Keep trying.` });
          }
        }
      }
    }

    io.to(roomId).emit('chat_message', { system: false, sender: player.name, text });
  });

  socket.on('reaction', ({ roomId, type }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    io.to(roomId).emit('reaction_received', {
      id: Math.random().toString(),
      type,
      playerName: player.name,
      x: 10 + Math.random() * 80 // random percentage across the bottom (10% to 90%)
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        room.players = room.players.filter(p => p.id !== socket.id);
        
        if (player) {
          if (!room.disconnectedPlayers) room.disconnectedPlayers = [];
          room.disconnectedPlayers.push(player);
        }
        
        if (room.players.length === 0) {
          if (room.intervalId) clearInterval(room.intervalId);
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('room_updated', sanitizeRoom(room));
          if (player) {
            io.to(roomId).emit('chat_message', { system: true, text: `${player.name} left the room.` });
          }
          // If the drawer left while playing, skip turn
          if (player && player.isDrawer && room.status === 'playing') {
            clearInterval(room.intervalId);
            io.to(roomId).emit('chat_message', { system: true, text: `Drawer left, turn skipped.` });
            room.drawerIndex++;
            nextTurn(roomId);
          }
        }
      }
      socketToRoom.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on http://localhost:${PORT}`);
});
