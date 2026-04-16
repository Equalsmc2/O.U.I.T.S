document.addEventListener("DOMContentLoaded", () => {
  // O.U.T.I.S. Raintooth Internal Engine Setup
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
  
  // Raintooth Military Standard Time
  const updateClock = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    const clockEl = document.getElementById("system-clock");
    if(clockEl) clockEl.innerText = timeString + " RMST"; 
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
    log("[SYSTEM] Calibrating pneumatics... Heating vacuum tubes...", "system");
    log("[SYSTEM] Establishing secure link to Raintooth Relay Network...", "system");

    try {
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      
      log("<br><u>[INTERNAL MEMORY LOGS]:</u>", "gold");
      if (notesSnap.empty) log(" [EMPTY] No data stored in local banks.", "system");
      else notesSnap.docs.forEach((doc, i) => {
        const d = doc.data();
        log(`<span class="timestamp">[${formatTime(d.timestamp)}]</span> LOG_${i + 1}: ${d.text}`);
      });

      const invSnap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = invSnap.docs.map(doc => doc.id);
      
      log("<br><u>[CHASSIS STORAGE STATUS]:</u>", "gold");
      if (invSnap.empty) log(" [EMPTY] Cargo compartments vacant.", "system");
      else invSnap.docs.forEach((doc, i) => {
        log(` C-BAY_${i + 1}: ${doc.data().text}`);
      });

      log("<br>[STATUS: ONLINE] Enter 'directives' for command list.", "system");
    } catch (err) {
      log(`[CRITICAL ERROR] Network connection severed: ${err.message}`, "error");
    }
  };

  const commands = {
    directives: () => `
    <span style="color:#4ddbff; font-weight:bold;">[STANDARD OPERATING DIRECTIVES]:</span>
    log [text]        → Write to internal memory
    logs              → Access internal memory
    expunge [#]       → Delete memory log
    stow [item]       → Place item in chassis storage
    deploy [#]        → Remove item from storage
    status            → Check chassis storage
    sensors           → Check internal/external conditions
    relay             → Intercept Raintooth Morse transmission
    funds [+/- amt]   → Adjust allocated military Scrip
    quartermaster     → View available requisitions
    req [item]        → Deduct Scrip, acquire item
    purge             → Clear terminal screen`,

    // ALIAS FOR MUSCLE MEMORY
    help: function() { return this.directives(); },

    "overseer": () => `
    <span style="color:#ff3333; font-weight:bold;">[COMMAND OVERRIDES]:</span>
    overseer temp [text]      → Override climate sensors
    overseer relay [text]     → Update Morse broadcast
    overseer supply [item;10] → Stock Quartermaster (use semicolon)`,

    log: async (t) => {
      if (!t) return "Syntax Error: log [text]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() });
      return "[SUCCESS] Data secured to memory banks.";
    },
    logs: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = snap.docs.map(doc => doc.id);
      if (snap.empty) return "Memory banks are empty.";
      return snap.docs.map((doc, i) => 
        `<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> LOG_${i+1}: ${doc.data().text}`
      ).join("\n");
    },
    expunge: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.notes[idx]) return "[ERROR] Invalid log designation.";
      await db.collection("notes").doc(cache.notes[idx]).delete();
      return `[SUCCESS] LOG_${idx + 1} permanently expunged.`;
    },
    stow: async (item) => {
      if (!item) return "Syntax Error: stow [item name]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() });
      return `[SUCCESS] '${item}' secured in chassis compartment.`;
    },
    status: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = snap.docs.map(doc => doc.id);
      if (snap.empty) return "Chassis storage is empty.";
      return snap.docs.map((doc, i) => `C-BAY_${i+1}: ${doc.data().text}`).join("\n");
    },
    deploy: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.inventory[idx]) return "[ERROR] Invalid compartment designation.";
      const docRef = await db.collection("inventory").doc(cache.inventory[idx]).get();
      const name = docRef.data().text;
      await db.collection("inventory").doc(cache.inventory[idx]).delete();
      return `[SUCCESS] '${name}' deployed from storage.`;
    },
    sensors: async () => {
      const doc = await db.collection("meta").doc("temperature").get();
      return doc.exists ? `[SENSOR READINGS]: ${doc.data().text}` : "[ERROR] Sensors offline.";
    },
    relay: async () => {
      const doc = await db.collection("meta").doc("broadcast").get();
      return doc.exists ? `[INCOMING RAINTOOTH TRANSMISSION]:\n${doc.data().text}` : "[WARNING] No signal detected.";
    },
    funds: async (input) => {
      const goldRef = db.collection("meta").doc("gold");
      const doc = await goldRef.get();
      let current = doc.exists ? doc.data().amount : 0;
      if (!input) return `[FUNDS]: ${current} Scrip allocated.`;
      const match = input.trim().match(/^([\+\-]?)(\d+)$/);
      if (!match) return "Syntax Error: funds +50 or funds -20";
      const sign = match[1];
      const val = parseInt(match[2]);
      if (sign === "+") current += val;
      else if (sign === "-") current -= val;
      else current = val;
      await goldRef.set({ amount: current, timestamp: Date.now() });
      return `[UPDATE] Funds adjusted. Current balance: ${current} Scrip.`;
    },
    quartermaster: async () => {
      const snap = await db.collection("shop").orderBy("price").get();
      if (snap.empty) return "[NOTICE] Quartermaster has no supplies available.";
      return snap.docs.map((doc, i) => 
        `REQ_${i+1}: ${doc.data().name} — <span style="color:#4ddbff;">${doc.data().price} Scrip</span>`
      ).join("\n");
    },
    req: async (itemName) => {
      if (!itemName) return "Syntax Error: req [item name]";
      const goldRef = db.collection("meta").doc("gold");
      const goldDoc = await goldRef.get();
      const currentGold = goldDoc.exists ? goldDoc.data().amount : 0;
      const shopSnap = await db.collection("shop").where("name", "==", itemName).limit(1).get();
      if (shopSnap.empty) return `[ERROR] Requisition '${itemName}' denied. Item not found.`;
      const itemDoc = shopSnap.docs[0];
      const { price, name } = itemDoc.data();
      if (currentGold < price) return `[DENIED] Insufficient funds. Requires ${price} Scrip. You have ${currentGold}.`;
      await goldRef.set({ amount: currentGold - price, timestamp: Date.now() });
      await db.collection("inventory").add({ text: name, timestamp: Date.now() });
      await db.collection("shop").doc(itemDoc.id).delete();
      return `[APPROVED] Requisition '${name}' secured.\nRemaining Funds: ${currentGold - price} Scrip.`;
    },
    "overseer temp": async (t) => {
      if(!t) return "Syntax Error: overseer temp [text]";
      await db.collection("meta").doc("temperature").set({ text: t, timestamp: Date.now() });
      return `[OVERRIDE] Sensor readings updated.`;
    },
    "overseer relay": async (t) => {
      if(!t) return "Syntax Error: overseer relay [text]";
      await db.collection("meta").doc("broadcast").set({ text: t, timestamp: Date.now() });
      return `[OVERRIDE] Raintooth transmission updated.`;
    },
    "overseer supply": async (input) => {
      const [name, price] = input.split(";");
      if (!name || !price) return "Syntax Error: overseer supply [item name];[price]";
      await db.collection("shop").add({ name: name.trim(), price: parseInt(price), timestamp: Date.now() });
      return `[LOGISTICS] Added '${name.trim()}' to Quartermaster for ${price} Scrip.`;
    },
    purge: () => {
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

      log(`[INPUT]> ${input}`, "user");
      cli.value = "";

      const [cmd, ...args] = input.split(" ");
      const isDm = cmd.toLowerCase() === "overseer";
      
      // FIX: If there is no second word, just trigger the main "overseer" menu
      const commandKey = isDm ? (args[0] ? `overseer ${args[0]}` : "overseer") : cmd.toLowerCase();
      const commandArgs = isDm ? args.slice(1).join(" ") : args.join(" ");

      try {
        if (commands[commandKey]) {
          const result = await commands[commandKey](commandArgs);
          if (result) log(result);
        } else {
          log(`[ERROR] Unrecognized Directive: '${commandKey}'`, "error");
        }
      } catch (err) {
        log(`[FATAL ERROR] Matrix failure: ${err.message}`, "error");
      }
    }
  });

  loadData();

  // --- TELEGRAPHIC RELAY LOGIC ---
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
            <span class="user" style="color:#fff">NODE_${doc.id.slice(0,3).toUpperCase()}></span> 
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
          console.error("Relay failure:", err);
        }
      }
    });
  }
});