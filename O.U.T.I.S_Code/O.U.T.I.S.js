document.addEventListener("DOMContentLoaded", () => {
  // O.U.T.I.S. Collective Subconscious Internal Engine Setup
  const config = {
    apiKey: "AIzaSyDkOXN9YtYKiZsGbQ6gDdluJqHMMFfxfJw",
    authDomain: "outis-21ecf.firebaseapp.com",
    projectId: "outis-21ecf",
    storageBucket: "outis-21ecf.firebasestorage.app",
    messagingSenderId: "940605035893",
    appId: "1:940605035893:web:0f3551c13a368ce3842f3c"
  };
  
  if (!firebase.apps.length) firebase.initializeApp(config);
  const db = firebase.firestore();

  const terminal = document.getElementById("terminal");
  const cli = document.getElementById("cli");
  
  let cache = { notes: [], inventory: [] };
  let cmdHistory = [];
  let historyIndex = -1;
  
  // Temporal Anchor (Time)
  const updateClock = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    const clockEl = document.getElementById("system-clock");
    if(clockEl) clockEl.innerText = timeString + " ECHO"; 
  };

  setInterval(updateClock, 1000);
  updateClock();

  const log = (text, type = "normal") => {
    const div = document.createElement("div");
    div.classList.add("line", type);
    div.innerHTML = text.replace(/\n/g, "<br>");
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  };

  const formatTime = (ms) => new Date(ms).toLocaleString('en-GB', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const loadData = async () => {
    log("[SYSTEM] Synchronizing neural pathways... Anchoring to the Collective...", "system");
    log("[SYSTEM] Establishing synaptic link to the Akashic Record...", "system");

    try {
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      
      log("<br><u>[IMPRINTED MEMORIES]:</u>", "gold");
      if (notesSnap.empty) log(" [VOID] No thoughts anchored in this space.", "system");
      else notesSnap.docs.forEach((doc, i) => {
        const d = doc.data();
        log(`<span class="timestamp">[${formatTime(d.timestamp)}]</span> RECOLLECTION_${i + 1}: ${d.text}`);
      });

      const invSnap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = invSnap.docs.map(doc => doc.id);
      
      log("<br><u>[MENTAL CONSTRUCTS]:</u>", "gold");
      if (invSnap.empty) log(" [VOID] Subconscious inventory is empty.", "system");
      else invSnap.docs.forEach((doc, i) => {
        log(` CONSTRUCT_${i + 1}: ${doc.data().text}`);
      });

      log("<br>[CONNECTION: STABLE] Enter 'thoughts' for available intents.", "system");
    } catch (err) {
      log(`[SYNAPTIC SEVERANCE] Link to the Collective failed: ${err.message}`, "error");
    }
  };

  const commands = {
    thoughts: () => `
    <span style="color:#ffbf00; font-weight:bold;">[AVAILABLE INTENTS]:</span>
    imprint [text]    → Sear a thought into the Collective memory
    memories          → Recall all imprinted thoughts
    forget [#]        → Erase a specific memory
    submerge [item]   → Hide a construct in the subconscious
    project [#]       → Manifest a construct into reality
    constructs        → View currently hidden constructs
    perceive          → Sense external aura and conditions
    echo              → Intercept distant psychic transmissions
    willpower [+/-]   → Adjust your mental fortitude (currency)
    architect         → View concepts available to manifest
    conjure [item]    → Expend Willpower to manifest an item
    void              → Clear your mental vision (clears screen)`,

    // ALIAS FOR MUSCLE MEMORY
    help: function() { return this.thoughts(); },

    "lucid": () => `
    <span style="color:#d93829; font-weight:bold;">[DREAMWALKER OVERRIDES]:</span>
    lucid temp [text]      → Alter perceived reality/aura
    lucid echo [text]      → Plant a psychic transmission
    lucid supply [item;10] → Stock the Architect (use semicolon)`,

    imprint: async (t) => {
      if (!t) return "Syntax Error: imprint [thought]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() });
      return "[ANCHORED] Thought successfully woven into the Collective.";
    },
    memories: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = snap.docs.map(doc => doc.id);
      if (snap.empty) return "The void holds no memories.";
      return snap.docs.map((doc, i) => 
        `<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> RECOLLECTION_${i+1}: ${doc.data().text}`
      ).join("\n");
    },
    forget: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.notes[idx]) return "[FRACTURE] Invalid memory sequence.";
      await db.collection("notes").doc(cache.notes[idx]).delete();
      return `[DISSOLVED] RECOLLECTION_${idx + 1} fades into the void.`;
    },
    submerge: async (item) => {
      if (!item) return "Syntax Error: submerge [construct name]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() });
      return `[SECURED] '${item}' submerged deep within the subconscious.`;
    },
    constructs: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = snap.docs.map(doc => doc.id);
      if (snap.empty) return "There are no constructs currently submerged.";
      return snap.docs.map((doc, i) => `CONSTRUCT_${i+1}: ${doc.data().text}`).join("\n");
    },
    project: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.inventory[idx]) return "[FRACTURE] Cannot grasp that construct.";
      const docRef = await db.collection("inventory").doc(cache.inventory[idx]).get();
      const name = docRef.data().text;
      await db.collection("inventory").doc(cache.inventory[idx]).delete();
      return `[MANIFESTED] '${name}' pulled from the depths into reality.`;
    },
    perceive: async () => {
      const doc = await db.collection("meta").doc("temperature").get();
      return doc.exists ? `[AURA READING]: ${doc.data().text}` : "[BLINDNESS] Senses are clouded.";
    },
    echo: async () => {
      const doc = await db.collection("meta").doc("broadcast").get();
      return doc.exists ? `[DISTANT THOUGHT DETECTED]:\n${doc.data().text}` : "[SILENCE] The void is quiet.";
    },
    willpower: async (input) => {
      const goldRef = db.collection("meta").doc("gold");
      const doc = await goldRef.get();
      let current = doc.exists ? doc.data().amount : 0;
      if (!input) return `[FOCUS]: You have ${current} Willpower remaining.`;
      const match = input.trim().match(/^([\+\-]?)(\d+)$/);
      if (!match) return "Syntax Error: willpower +50 or willpower -20";
      const sign = match[1];
      const val = parseInt(match[2]);
      if (sign === "+") current += val;
      else if (sign === "-") current -= val;
      else current = val;
      await goldRef.set({ amount: current, timestamp: Date.now() });
      return `[SHIFT] Focus updated. Current balance: ${current} Willpower.`;
    },
    architect: async () => {
      const snap = await db.collection("shop").orderBy("price").get();
      if (snap.empty) return "[STAGNATION] The Architect has no blueprints available.";
      return snap.docs.map((doc, i) => 
        `BLUEPRINT_${i+1}: ${doc.data().name} — <span style="color:#ffbf00;">${doc.data().price} Willpower</span>`
      ).join("\n");
    },
    conjure: async (itemName) => {
      if (!itemName) return "Syntax Error: conjure [blueprint name]";
      const goldRef = db.collection("meta").doc("gold");
      const goldDoc = await goldRef.get();
      const currentGold = goldDoc.exists ? goldDoc.data().amount : 0;
      const shopSnap = await db.collection("shop").where("name", "==", itemName).limit(1).get();
      if (shopSnap.empty) return `[REJECTED] The Architect cannot envision '${itemName}'.`;
      const itemDoc = shopSnap.docs[0];
      const { price, name } = itemDoc.data();
      if (currentGold < price) return `[EXHAUSTION] Insufficient focus. Requires ${price} Willpower. You only have ${currentGold}.`;
      await goldRef.set({ amount: currentGold - price, timestamp: Date.now() });
      await db.collection("inventory").add({ text: name, timestamp: Date.now() });
      await db.collection("shop").doc(itemDoc.id).delete();
      return `[MATERIALIZED] Blueprint '${name}' successfully conjured.\nRemaining Focus: ${currentGold - price} Willpower.`;
    },
    "lucid temp": async (t) => {
      if(!t) return "Syntax Error: lucid temp [text]";
      await db.collection("meta").doc("temperature").set({ text: t, timestamp: Date.now() });
      return `[REALITY WARPED] External aura modified.`;
    },
    "lucid echo": async (t) => {
      if(!t) return "Syntax Error: lucid echo [text]";
      await db.collection("meta").doc("broadcast").set({ text: t, timestamp: Date.now() });
      return `[RIPPLE] Psychic transmission planted in the void.`;
    },
    "lucid supply": async (input) => {
      const [name, price] = input.split(";");
      if (!name || !price) return "Syntax Error: lucid supply [item name];[price]";
      await db.collection("shop").add({ name: name.trim(), price: parseInt(price), timestamp: Date.now() });
      return `[INCEPTION] Planted concept '${name.trim()}' into the Architect for ${price} Willpower.`;
    },
    void: () => {
      terminal.innerHTML = "";
      return "";
    }
  };

  cli.addEventListener("keydown", async (e) => {
    if (e.key === "ArrowUp") {
      if (historyIndex > 0) {
        historyIndex--;
        cli.value = cmdHistory[historyIndex];
      }
      e.preventDefault();
    } 
    else if (e.key === "ArrowDown") {
      if (historyIndex < cmdHistory.length - 1) {
        historyIndex++;
        cli.value = cmdHistory[historyIndex];
      } else {
        historyIndex = cmdHistory.length;
        cli.value = "";
      }
      e.preventDefault();
    }
    else if (e.key === "Enter") {
      const input = cli.value.trim();
      if (!input) return;

      cmdHistory.push(input);
      historyIndex = cmdHistory.length;

      log(`[PROJECTED]> ${input}`, "user");
      cli.value = "";

      const [cmd, ...args] = input.split(" ");
      const isDm = cmd.toLowerCase() === "lucid";
      
      const commandKey = isDm ? (args[0] ? `lucid ${args[0]}` : "lucid") : cmd.toLowerCase();
      const commandArgs = isDm ? args.slice(1).join(" ") : args.join(" ");

      try {
        if (commands[commandKey]) {
          const result = await commands[commandKey](commandArgs);
          if (result) log(result);
        } else {
          log(`[DISSONANCE] Unknown Intent: '${commandKey}'`, "error");
        }
      } catch (err) {
        log(`[PSYCHIC FEEDBACK] Matrix failure: ${err.message}`, "error");
      }
    }
  });

  loadData();

  // --- SYNAPTIC THREAD (CHAT) LOGIC ---
  const chatBox = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");

  if (chatBox && chatInput) {
    db.collection("relay_chat")
      .orderBy("timestamp", "desc")
      .limit(30)
      .onSnapshot((snapshot) => {
        chatBox.innerHTML = ""; 
        snapshot.forEach((doc) => {
          const data = doc.data();
          const msgDiv = document.createElement("div");
          msgDiv.className = "chat-msg";
          msgDiv.innerHTML = `
            <span class="timestamp">[${formatTime(data.timestamp)}]</span>
            <span class="user" style="color:var(--amber-bright)">MIND_${doc.id.slice(0,3).toUpperCase()}></span> 
            <span class="text">${data.text}</span>
          `;
          chatBox.appendChild(msgDiv);
        });
      });

    chatInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && chatInput.value.trim() !== "") {
        const text = chatInput.value.trim();
        chatInput.value = ""; 
        
        try {
          await db.collection("relay_chat").add({
            text: text,
            timestamp: Date.now()
          });
        } catch (err) {
          console.error("Synapse failure:", err);
        }
      }
    });
  }
});
