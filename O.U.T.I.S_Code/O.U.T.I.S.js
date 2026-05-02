document.addEventListener("DOMContentLoaded", () => {
  // O.U.T.I.S. Internal Engine Setup
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
    if(clockEl) clockEl.innerText = timeString + " SYS"; 
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
    log("[SYSTEM] Initializing system routines...", "system");
    log("[SYSTEM] Fetching database records...", "system");

    try {
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      
      log("<br><u>[SAVED NOTES]:</u>", "gold");
      if (notesSnap.empty) log(" [NULL] No notes found.", "system");
      else notesSnap.docs.forEach((doc, i) => {
        const d = doc.data();
        log(`<span class="timestamp">[${formatTime(d.timestamp)}]</span> NOTE_0${i + 1}: ${d.text}`);
      });

      const invSnap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = invSnap.docs.map(doc => doc.id);
      
      log("<br><u>[INVENTORY]:</u>", "gold");
      if (invSnap.empty) log(" [NULL] Inventory is empty.", "system");
      else invSnap.docs.forEach((doc, i) => {
        log(` ITEM_0${i + 1}: ${doc.data().text}`);
      });

      log("<br>[STATUS: ONLINE] Type 'help' to view available commands.", "system");
    } catch (err) {
      log(`[FATAL ERROR] Database connection failed: ${err.message}`, "error");
    }
  };

  // 🛠️ NORMALIZED COMMANDS OBJECT
  const commands = {
    commands: () => `
    <span style="color:#ffbf00; font-weight:bold;">[ SYSTEM COMMANDS ]:</span>
    write [text]    → Save a new note
    read            → Read all saved notes
    rm [#]          → Delete a note by number
    store [item]    → Add an item to your inventory
    take [#]        → Remove an item from inventory by number
    inv             → Check your inventory
    weather         → Check current weather conditions
    radio           → Intercept radio signals
    bank [+/- amt]  → Manage your coins
    shop            → View available items in the shop
    buy [item]      → Buy an item from the shop
    clear           → Clear the terminal display
    help            → Show this menu`,

    help: function() { return this.commands(); },

    admin: () => `
    <span style="color:#d93829; font-weight:bold;">[ ADMIN COMMANDS ]:</span>
    admin weather [text]     → Alter weather conditions
    admin radio [text]       → Update radio broadcast
    admin stock [item;10]    → Upload items to shop (use semicolon for price)`,

    write: async (t) => {
      if (!t) return "Syntax Error: write [text]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() });
      return "[SUCCESS] Note saved.";
    },
    read: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] No notes exist.";
      return snap.docs.map((doc, i) => 
        `<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> NOTE_0${i+1}: ${doc.data().text}`
      ).join("\n");
    },
    rm: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.notes[idx]) return "[ERROR] Invalid note number.";
      await db.collection("notes").doc(cache.notes[idx]).delete();
      return `[EXECUTED] Note_0${idx + 1} deleted.`;
    },
    store: async (item) => {
      if (!item) return "Syntax Error: store [item name]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() });
      return `[SUCCESS] '${item}' added to inventory.`;
    },
    inv: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] Inventory is empty.";
      return snap.docs.map((doc, i) => `ITEM_0${i+1}: ${doc.data().text}`).join("\n");
    },
    take: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.inventory[idx]) return "[ERROR] Invalid item number.";
      const docRef = await db.collection("inventory").doc(cache.inventory[idx]).get();
      const name = docRef.data().text;
      await db.collection("inventory").doc(cache.inventory[idx]).delete();
      return `[EXECUTED] '${name}' removed from inventory.`;
    },
    weather: async () => {
      const doc = await db.collection("meta").doc("temperature").get();
      return doc.exists ? `[WEATHER]: ${doc.data().text}` : "[ERROR] Sensors offline.";
    },
    radio: async () => {
      const doc = await db.collection("meta").doc("broadcast").get();
      return doc.exists ? `[RADIO INTERCEPT]:\n${doc.data().text}` : "[SILENCE] No signals detected.";
    },
    bank: async (input) => {
      const goldRef = db.collection("meta").doc("gold");
      const doc = await goldRef.get();
      let current = doc.exists ? doc.data().amount : 0;
      if (!input) return `[BANK]: ${current} Coins available.`;
      
      const match = input.trim().match(/^([\+\-]?)(\d+)$/);
      if (!match) return "Syntax Error: bank +50 or bank -20";
      
      const sign = match[1];
      const val = parseInt(match[2]);
      if (sign === "+") current += val;
      else if (sign === "-") current -= val;
      else current = val;
      
      await goldRef.set({ amount: current, timestamp: Date.now() });
      return `[SUCCESS] Bank updated: ${current} Coins.`;
    },
    shop: async () => {
      const snap = await db.collection("shop").orderBy("price").get();
      if (snap.empty) return "[NULL] Shop is empty.";
      return snap.docs.map((doc, i) => 
        `ITEM_0${i+1}: ${doc.data().name} — <span style="color:#ffbf00;">${doc.data().price} Coins</span>`
      ).join("\n");
    },
    buy: async (itemName) => {
      if (!itemName) return "Syntax Error: buy [item name]";
      const goldRef = db.collection("meta").doc("gold");
      const goldDoc = await goldRef.get();
      const currentGold = goldDoc.exists ? goldDoc.data().amount : 0;
      
      const shopSnap = await db.collection("shop").where("name", "==", itemName).limit(1).get();
      if (shopSnap.empty) return `[ERROR] Item '${itemName}' does not exist in the shop.`;
      
      const itemDoc = shopSnap.docs[0];
      const { price, name } = itemDoc.data();
      
      if (currentGold < price) return `[DENIED] Insufficient funds. Requires ${price} Coins. You have ${currentGold}.`;
      
      await goldRef.set({ amount: currentGold - price, timestamp: Date.now() });
      await db.collection("inventory").add({ text: name, timestamp: Date.now() });
      await db.collection("shop").doc(itemDoc.id).delete();
      return `[SUCCESS] Bought '${name}'.\nRemaining Balance: ${currentGold - price} Coins.`;
    },
    "admin weather": async (t) => {
      if(!t) return "Syntax Error: admin weather [text]";
      await db.collection("meta").doc("temperature").set({ text: t, timestamp: Date.now() });
      return `[ADMIN] Weather updated.`;
    },
    "admin radio": async (t) => {
      if(!t) return "Syntax Error: admin radio [text]";
      await db.collection("meta").doc("broadcast").set({ text: t, timestamp: Date.now() });
      return `[ADMIN] Radio updated.`;
    },
    "admin stock": async (input) => {
      const [name, price] = input.split(";");
      if (!name || !price) return "Syntax Error: admin stock [item name];[price]";
      await db.collection("shop").add({ name: name.trim(), price: parseInt(price), timestamp: Date.now() });
      return `[ADMIN] '${name.trim()}' added to shop for ${price} Coins.`;
    },
    clear: () => {
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

      log(`[EXEC]> ${input}`, "user");
      cli.value = "";

      const [cmd, ...args] = input.split(" ");
      const isDm = cmd.toLowerCase() === "admin";
      
      const commandKey = isDm ? (args[0] ? `admin ${args[0].toLowerCase()}` : "admin") : cmd.toLowerCase();
      const commandArgs = isDm ? args.slice(1).join(" ") : args.join(" ");

      try {
        if (commands[commandKey]) {
          const result = await commands[commandKey](commandArgs);
          if (result) log(result);
        } else {
          log(`[ERROR] Unknown command: '${commandKey}'. Type 'help' for a list of commands.`, "error");
        }
      } catch (err) {
        log(`[CRITICAL ERROR] Logic exception: ${err.message}`, "error");
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
          console.error("Chat sync failure:", err);
        }
      }
    });
  }
});
