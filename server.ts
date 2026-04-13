import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "db.json");
const JWT_SECRET = process.env.JWT_SECRET || "demo-secret-key";

// Helper to read/write DB
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
const writeDB = (data: any) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Register
  app.post("/api/register", async (req, res) => {
    const { name, phone, email, password } = req.body;
    const db = readDB();

    if (db.users.find((u: any) => u.email === email || u.phone === phone)) {
      return res.status(400).json({ message: "User already exists with this email or phone." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      name,
      phone,
      email,
      password: hashedPassword,
      balance: 1000 // Initial virtual balance
    };

    db.users.push(newUser);
    writeDB(db);

    res.status(201).json({ message: "Registration successful!" });
  });

  // Login
  app.post("/api/login", async (req, res) => {
    const { identifier, password } = req.body;
    const db = readDB();

    const user = db.users.find((u: any) => u.email === identifier || u.phone === identifier);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, balance: user.balance, role: user.role || 'user' } });
  });

  // Get User Data (Protected)
  app.get("/api/user", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const db = readDB();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        balance: user.balance, 
        role: user.role || 'user',
        investments: user.investments || []
      });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // --- Chart & Admin API ---

  // Get Chart Data
  app.get("/api/chart", (req, res) => {
    const db = readDB();
    res.json(db.chartData.slice(-50)); // Return last 50 points
  });

  // Get Admin Settings
  app.get("/api/admin/settings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const db = readDB();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Forbidden." });

      res.json(db.adminSettings);
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // Update Admin Settings
  app.post("/api/admin/settings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const db = readDB();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Forbidden." });

      db.adminSettings = { ...db.adminSettings, ...req.body };
      writeDB(db);
      res.json(db.adminSettings);
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // Admin: Get All Active Investments
  app.get("/api/admin/investments", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const db = readDB();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Forbidden." });

      const allActiveInvestments: any[] = [];
      db.users.forEach((u: any) => {
        if (u.investments) {
          u.investments.forEach((inv: any) => {
            if (inv.active) {
              allActiveInvestments.push({
                ...inv,
                userId: u.id,
                userName: u.name
              });
            }
          });
        }
      });

      res.json(allActiveInvestments);
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // --- Deposit Management ---

  // User: Submit Deposit Request
  app.post("/api/deposit/request", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { amount, transactionId } = req.body;
      
      if (!amount || !transactionId) {
        return res.status(400).json({ message: "Amount and Transaction ID are required." });
      }

      const db = readDB();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      const newRequest = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        amount: parseFloat(amount),
        transactionId,
        status: "pending",
        timestamp: new Date().toISOString()
      };

      if (!db.depositRequests) db.depositRequests = [];
      db.depositRequests.push(newRequest);
      writeDB(db);

      res.json({ message: "Deposit request submitted successfully. Waiting for admin approval.", request: newRequest });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // Admin: Get All Deposit Requests
  app.get("/api/admin/deposits", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const db = readDB();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Forbidden." });

      res.json(db.depositRequests || []);
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // Admin: Approve/Reject Deposit Request
  app.post("/api/admin/deposits/action", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { requestId, action } = req.body; // action: 'approve' or 'reject'
      
      const db = readDB();
      const admin = db.users.find((u: any) => u.id === decoded.userId);
      if (!admin || admin.role !== 'admin') return res.status(403).json({ message: "Forbidden." });

      const requestIndex = db.depositRequests.findIndex((r: any) => r.id === requestId);
      if (requestIndex === -1) return res.status(404).json({ message: "Request not found." });

      const depositRequest = db.depositRequests[requestIndex];
      if (depositRequest.status !== 'pending') {
        return res.status(400).json({ message: "Request already processed." });
      }

      if (action === 'approve') {
        const userIndex = db.users.findIndex((u: any) => u.id === depositRequest.userId);
        if (userIndex !== -1) {
          db.users[userIndex].balance += depositRequest.amount;
          if (!db.users[userIndex].investments) db.users[userIndex].investments = [];
          db.users[userIndex].investments.push({
            id: Date.now().toString(),
            amount: depositRequest.amount,
            type: 'add',
            status: 'completed',
            timestamp: new Date().toISOString(),
            active: false,
            direction: 'deposit'
          });
        }
        depositRequest.status = 'approved';
      } else {
        depositRequest.status = 'rejected';
      }

      writeDB(db);
      res.json({ message: `Request ${action}d successfully.`, request: depositRequest });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // --- Withdrawal Management ---

  // User: Submit Withdrawal Request
  app.post("/api/withdrawal/request", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { amount, method, bankDetails, bikashNumber } = req.body;
      
      if (!amount || !method) {
        return res.status(400).json({ message: "Amount and Method are required." });
      }

      const db = readDB();
      const userIndex = db.users.findIndex((u: any) => u.id === decoded.userId);
      if (userIndex === -1) return res.status(404).json({ message: "User not found." });

      const user = db.users[userIndex];
      const withdrawalAmount = parseFloat(amount);

      if (user.balance < withdrawalAmount) {
        return res.status(400).json({ message: "Insufficient balance." });
      }

      const newRequest = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        amount: withdrawalAmount,
        method, // 'bank' or 'bikash'
        bankDetails: method === 'bank' ? bankDetails : null,
        bikashNumber: method === 'bikash' ? bikashNumber : null,
        status: "pending",
        timestamp: new Date().toISOString()
      };

      // Deduct balance immediately to prevent double spending
      db.users[userIndex].balance -= withdrawalAmount;
      
      if (!db.withdrawalRequests) db.withdrawalRequests = [];
      db.withdrawalRequests.push(newRequest);
      writeDB(db);

      res.json({ message: "Withdrawal request submitted successfully. Waiting for admin approval.", request: newRequest });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // Admin: Get All Withdrawal Requests
  app.get("/api/admin/withdrawals", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const db = readDB();
      const user = db.users.find((u: any) => u.id === decoded.userId);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Forbidden." });

      res.json(db.withdrawalRequests || []);
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // Admin: Approve/Reject Withdrawal Request
  app.post("/api/admin/withdrawals/action", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { requestId, action } = req.body; // action: 'approve' or 'reject'
      
      const db = readDB();
      const admin = db.users.find((u: any) => u.id === decoded.userId);
      if (!admin || admin.role !== 'admin') return res.status(403).json({ message: "Forbidden." });

      const requestIndex = db.withdrawalRequests.findIndex((r: any) => r.id === requestId);
      if (requestIndex === -1) return res.status(404).json({ message: "Request not found." });

      const withdrawalRequest = db.withdrawalRequests[requestIndex];
      if (withdrawalRequest.status !== 'pending') {
        return res.status(400).json({ message: "Request already processed." });
      }

      if (action === 'approve') {
        const userIndex = db.users.findIndex((u: any) => u.id === withdrawalRequest.userId);
        if (userIndex !== -1) {
          if (!db.users[userIndex].investments) db.users[userIndex].investments = [];
          db.users[userIndex].investments.push({
            id: Date.now().toString(),
            amount: withdrawalRequest.amount,
            type: 'withdraw',
            status: 'completed',
            timestamp: new Date().toISOString(),
            active: false,
            direction: 'withdrawal'
          });
        }
        withdrawalRequest.status = 'approved';
      } else {
        // Refund balance if rejected
        const userIndex = db.users.findIndex((u: any) => u.id === withdrawalRequest.userId);
        if (userIndex !== -1) {
          db.users[userIndex].balance += withdrawalRequest.amount;
        }
        withdrawalRequest.status = 'rejected';
      }

      writeDB(db);
      res.json({ message: `Request ${action}d successfully.`, request: withdrawalRequest });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // --- Background Chart Generation ---
  let currentCandle: any = null;
  const CANDLE_DURATION = 30000; // 30 seconds per candle

  setInterval(() => {
    const db = readDB();
    const settings = db.adminSettings;
    let nextPrice = settings.lastPrice;

    if (settings.mode === 'auto') {
      const change = (Math.random() - 0.5) * 2 * settings.volatility * nextPrice;
      nextPrice += change;
    } else if (settings.mode === 'manual' && settings.manualTarget !== null) {
      const diff = settings.manualTarget - nextPrice;
      const step = diff * 0.1;
      nextPrice += step;
    }

    const now = Date.now();
    const candleTime = Math.floor(now / CANDLE_DURATION) * (CANDLE_DURATION / 1000);

    if (!currentCandle || currentCandle.time !== candleTime) {
      if (currentCandle) {
        // Fix the previous candle
        const exists = db.chartData.some((c: any) => c.time === currentCandle.time);
        if (!exists) {
          db.chartData.push(currentCandle);
          if (db.chartData.length > 200) db.chartData.shift();
        }

        // Evaluate trades that were placed during this candle
        db.users.forEach((user: any) => {
          if (user.investments) {
            user.investments.forEach((inv: any) => {
              if (inv.active && inv.expiryTime <= candleTime) {
                const isUp = currentCandle.close > inv.entryPrice;
                const won = (inv.direction === 'up' && isUp) || (inv.direction === 'down' && !isUp);
                
                inv.active = false;
                inv.status = won ? 'won' : 'lost';
                inv.finalPrice = currentCandle.close;
                
                if (won) {
                  const profit = inv.amount * 1.8; // 80% profit
                  user.balance += profit;
                  inv.payout = profit;
                } else {
                  inv.payout = 0;
                }
              }
            });
          }
        });
      }
      // Start new candle
      currentCandle = {
        time: candleTime,
        open: nextPrice,
        high: nextPrice,
        low: nextPrice,
        close: nextPrice
      };
    } else {
      // Update current candle
      currentCandle.high = Math.max(currentCandle.high, nextPrice);
      currentCandle.low = Math.min(currentCandle.low, nextPrice);
      currentCandle.close = nextPrice;
    }

    db.adminSettings.lastPrice = nextPrice;
    
    // Update user trades (investments) - Live feedback
    db.users.forEach((user: any) => {
      if (user.investments) {
        user.investments.forEach((inv: any) => {
          if (inv.active) {
            const isUp = nextPrice > inv.entryPrice;
            const currentlyWinning = (inv.direction === 'up' && isUp) || (inv.direction === 'down' && !isUp);
            inv.currentValue = currentlyWinning ? inv.amount * 1.8 : 0;
            inv.isWinning = currentlyWinning;
          }
        });
      }
    });

    writeDB(db);
  }, 1000);

  // Get Current Live Candle
  app.get("/api/chart/live", (req, res) => {
    res.json(currentCandle);
  });

  // Investment API
  app.post("/api/invest", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { amount, direction } = req.body; // direction: 'up' or 'down'
      
      if (amount < 500) {
        return res.status(400).json({ message: "Minimum investment amount is 500." });
      }

      const db = readDB();
      const userIndex = db.users.findIndex((u: any) => u.id === decoded.userId);
      if (userIndex === -1) return res.status(404).json({ message: "User not found." });

      if (db.users[userIndex].balance < amount) {
        return res.status(400).json({ message: "Insufficient balance." });
      }

      const entryPrice = db.adminSettings.lastPrice;
      const now = Date.now();
      const expiryTime = (Math.floor(now / CANDLE_DURATION) + 1) * (CANDLE_DURATION / 1000); // End of current candle

      const investment = {
        id: Date.now().toString(),
        amount,
        direction,
        entryPrice,
        expiryTime,
        currentValue: 0,
        active: true,
        timestamp: new Date().toISOString()
      };

      db.users[userIndex].balance -= amount;
      if (!db.users[userIndex].investments) db.users[userIndex].investments = [];
      db.users[userIndex].investments.push(investment);

      writeDB(db);
      res.json({ investment, balance: db.users[userIndex].balance });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  app.post("/api/close-investment", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { investmentId } = req.body;
      
      const db = readDB();
      const userIndex = db.users.findIndex((u: any) => u.id === decoded.userId);
      if (userIndex === -1) return res.status(404).json({ message: "User not found." });

      const invIndex = db.users[userIndex].investments.findIndex((i: any) => i.id === investmentId && i.active);
      if (invIndex === -1) return res.status(404).json({ message: "Active investment not found." });

      const investment = db.users[userIndex].investments[invIndex];
      const finalValue = investment.currentValue;

      db.users[userIndex].balance += finalValue;
      db.users[userIndex].investments[invIndex].active = false;
      db.users[userIndex].investments[invIndex].finalValue = finalValue;

      writeDB(db);
      res.json({ balance: db.users[userIndex].balance });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // Update Balance (Simulation)
  app.post("/api/update-balance", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided." });

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const { amount, type } = req.body; // type: 'add' or 'withdraw'
      
      const db = readDB();
      const userIndex = db.users.findIndex((u: any) => u.id === decoded.userId);
      if (userIndex === -1) return res.status(404).json({ message: "User not found." });

      if (type === "add") {
        db.users[userIndex].balance += amount;
      } else if (type === "withdraw") {
        if (db.users[userIndex].balance < amount) {
          return res.status(400).json({ message: "Insufficient balance." });
        }
        db.users[userIndex].balance -= amount;
      }

      writeDB(db);
      res.json({ balance: db.users[userIndex].balance });
    } catch (err) {
      res.status(401).json({ message: "Invalid token." });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
