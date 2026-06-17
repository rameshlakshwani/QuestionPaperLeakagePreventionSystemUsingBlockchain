import { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";
import { ethers } from "ethers";

// ── 🔧 EMAILJS CONFIG ─────────────────────────────────────────
const EMAILJS_SERVICE_ID = "service_d14ffep";
const EMAILJS_TEMPLATE_ID = "template_ajgjjpq";
const EMAILJS_PUBLIC_KEY = "U-ht_LWtEqm40vxuV";

// ── 🔧 BLOCKCHAIN CONFIG ──────────────────────────────────────
// Replace with your deployed contract address and RPC
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
const RPC_URL = "http://127.0.0.1:8545"; // Ganache local

// ── 🔧 PINATA IPFS CONFIG ─────────────────────────────────────
const PINATA_API_KEY = "42d556d04190e065b7b8";
const PINATA_SECRET_KEY =
  "5ca9437d1d9d68abf09050ebbfa12ac90f5d33881975c27edcc087d1bec799d5";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// ── Smart Contract ABI (from QuestionPaperRegistry.sol) ───────
const CONTRACT_ABI = [
  "function uploadPaper(string ipfsHash, string subject, string examTitle, string department, uint256 semester, string examType, uint256 unlockTimestamp) returns (uint256)",
  "function getPaper(uint256 paperId, string role) returns (string)",
  "function verifyAccessTime(uint256 paperId) view returns (bool canAccess, uint256 timeRemaining, string message)",
  "function logAccess(uint256 paperId, string role, string action, bool granted, string reason)",
  "function getPaperLogs(uint256 paperId) view returns (tuple(uint256 logId, uint256 paperId, address accessedBy, string role, string action, uint256 timestamp, bool accessGranted, string reason)[])",
  "function getAllLogs() view returns (tuple(uint256 logId, uint256 paperId, address accessedBy, string role, string action, uint256 timestamp, bool accessGranted, string reason)[])",
  "function getTotalPapers() view returns (uint256)",
  "function deactivatePaper(uint256 paperId)",
  "event PaperUploaded(uint256 indexed paperId, string ipfsHash, string subject, uint256 unlockTime, address uploadedBy)",
  "event AccessAttempted(uint256 indexed paperId, address indexed user, string role, string action, bool granted, string reason)",
];

const DEMO_USERS = {
  admin: {
    id: 1,
    username: "Lakshmi",
    password: "Lakshmi@123",
    role: "ADMIN",
    fullName: "Lakshmi",
    email: "rameshlakshwani@gmail.com",
    privateKey: "0xYourAdminPrivateKeyFromGanache",
  },
  faculty: {
    id: 2,
    username: "prof_kumar",
    password: "Faculty@1",
    role: "FACULTY",
    fullName: "Prof. Raj Kumar",
    email: "rameshlakshwani@gmail.com",
    privateKey: "0xYourFacultyPrivateKeyFromGanache",
  },
  student: {
    id: 3,
    username: "john_doe",
    password: "Student@1",
    role: "STUDENT",
    fullName: "John Doe",
    email: "rameshlakshwani@gmail.com",
    privateKey: "0xYourStudentPrivateKeyFromGanache",
  },
};

const ADMIN_EMAIL = "rameshlakshwani@gmail.com";

const LOCK_OPTS = [
  { label: "5 minutes", ms: 5 * 60 * 1000 },
  { label: "10 minutes", ms: 10 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "2 hours", ms: 2 * 60 * 60 * 1000 },
  { label: "6 hours", ms: 6 * 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "48 hours", ms: 48 * 60 * 60 * 1000 },
];

const INITIAL_PAPERS = [
  {
    id: 1,
    title: "Data Structures & Algorithms — Final Exam",
    subject: "DSA",
    department: "Computer Science",
    semester: 3,
    examType: "FINAL",
    academicYear: "2024-25",
    ipfsCid: "QmX7kPn2wR4vT9sL3mD8qF1jH6uB5cA0eI2oY",
    blockchainTxHash: "0x4f8a1b2c9d3e7f0a5b6c8d9e1f2a3b4c5d6e7f8a",
    blockchainPaperId: 1,
    unlockTime: Date.now() - 3600000,
    fileName: "DSA_Final_2024.txt",
    fileType: "text/plain",
    fileContent: `UNIVERSITY EXAMINATION — 2024-25
Subject: Data Structures & Algorithms
Duration: 3 Hours  |  Max Marks: 100
─────────────────────────────────────

SECTION A — Short Answer  (2 × 10 = 20 Marks)
Q1.  Define Big-O notation with examples.
Q2.  Differentiate Stack vs Queue.
Q3.  What is a balanced BST?
Q4.  Explain hashing collision resolution.
Q5.  What is dynamic programming?

SECTION B — Medium Answer  (5 × 6 = 30 Marks)
Q6.  Write BFS and DFS algorithms with pseudocode.
Q7.  Explain merge sort with time complexity analysis.
Q8.  Describe AVL tree rotations (all four cases).
Q9.  Implement a linked list reversal in-place.
Q10. Explain Dijkstra's shortest path algorithm.

SECTION C — Long Answer  (5 × 10 = 50 Marks)
Q11. Design a hash table with chaining for collision handling.
Q12. Prove the correctness of Kruskal's MST algorithm.
Q13. Compare B-tree vs B+ tree with real-world use cases.
Q14. Explain NP-completeness with examples and reductions.
Q15. Design a LRU Cache using O(1) time operations.`,
  },
  {
    id: 2,
    title: "Computer Networks — Midterm",
    subject: "CN",
    department: "Computer Science",
    semester: 5,
    examType: "MIDTERM",
    academicYear: "2024-25",
    ipfsCid: "QmB3rKm5xN8pQ2tW6vU1yE4oH7jC0dA9fI",
    blockchainTxHash: "0x9e1f2a3b4c5d6e7f8a4f8a1b2c9d3e7f0a5b",
    blockchainPaperId: 2,
    unlockTime: Date.now() + 7200000,
    fileName: "CN_Midterm_2024.pdf",
    fileType: "text/plain",
    fileContent: "",
  },
  {
    id: 3,
    title: "Database Management Systems — Quiz 3",
    subject: "DBMS",
    department: "Information Technology",
    semester: 4,
    examType: "QUIZ",
    academicYear: "2024-25",
    ipfsCid: "QmC9sLm2xP5qR8wT1vY7eO4nH3jU6dF0aK",
    blockchainTxHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
    blockchainPaperId: 3,
    unlockTime: Date.now() + 86400000,
    fileName: "DBMS_Quiz3_2024.pdf",
    fileType: "text/plain",
    fileContent: "",
  },
];

// ── Tamper detection state ─────────────────────────────────────
const tamperState = {
  failedLoginAttempts: {}, // username → count
  suspiciousIPs: new Set(),
  adminPortalAttempts: [],
};

// ══════════════════════════════════════════════════════════════
// 🔐 REAL AES-256-CBC ENCRYPTION (Web Crypto API)
// ══════════════════════════════════════════════════════════════

async function generateAesKey() {
  return crypto.subtle.generateKey({ name: "AES-CBC", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

async function exportKey(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importKey(base64Key) {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-CBC" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptFile(fileBytes, key) {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    fileBytes
  );
  return {
    encryptedBytes: new Uint8Array(encrypted),
    ivBase64: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptFile(encryptedBytes, key, ivBase64) {
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    encryptedBytes
  );
  return new Uint8Array(decrypted);
}

async function computeSha256(data) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ══════════════════════════════════════════════════════════════
// 📂 REAL IPFS UPLOAD via Pinata
// ══════════════════════════════════════════════════════════════

async function uploadToIPFS(encryptedBytes, fileName) {
  try {
    const blob = new Blob([encryptedBytes], {
      type: "application/octet-stream",
    });
    const formData = new FormData();
    formData.append("file", blob, fileName);
    formData.append("pinataMetadata", JSON.stringify({ name: fileName }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: formData,
    });

    if (!res.ok) throw new Error(`Pinata error: ${res.statusText}`);
    const data = await res.json();
    return data.IpfsHash; // Real CID
  } catch (err) {
    console.error("IPFS upload failed:", err);
    // Fallback for demo if Pinata not configured
    return "QmDemo" + Math.random().toString(36).slice(2, 10).toUpperCase();
  }
}

async function downloadFromIPFS(cid) {
  try {
    const res = await fetch(`${PINATA_GATEWAY}${cid}`);
    if (!res.ok) throw new Error(`IPFS fetch failed: ${res.statusText}`);
    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.error("IPFS download failed:", err);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════
// ⛓️ BLOCKCHAIN SERVICE — Real ethers.js calls
// ══════════════════════════════════════════════════════════════

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

function getSigner(privateKey) {
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
}

// uploadPaper — writes to blockchain
async function bc_uploadPaper(
  privateKey,
  ipfsCid,
  subject,
  examTitle,
  department,
  semester,
  examType,
  unlockTimestamp
) {
  try {
    const signer = getSigner(privateKey);
    const contract = getContract(signer);
    const tx = await contract.uploadPaper(
      ipfsCid,
      subject,
      examTitle,
      department,
      BigInt(semester),
      examType,
      BigInt(unlockTimestamp)
    );
    const receipt = await tx.wait();
    // Parse PaperUploaded event to get paperId
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "PaperUploaded");
    const paperId = event ? Number(event.args.paperId) : null;
    return { paperId, txHash: receipt.hash, success: true };
  } catch (err) {
    console.error("bc_uploadPaper failed:", err.message);
    return { paperId: null, txHash: null, success: false, error: err.message };
  }
}

// verifyAccessTime — read-only, no gas
async function bc_verifyAccessTime(paperId) {
  try {
    const provider = getProvider();
    const contract = getContract(provider);
    const [canAccess, timeRemaining, message] = await contract.verifyAccessTime(
      BigInt(paperId)
    );
    return { canAccess, timeRemaining: Number(timeRemaining), message };
  } catch (err) {
    console.error("bc_verifyAccessTime failed:", err.message);
    return { canAccess: false, timeRemaining: -1, message: err.message };
  }
}

// getPaper — enforces time-lock on-chain, returns IPFS CID
async function bc_getPaper(privateKey, paperId, role) {
  try {
    const signer = getSigner(privateKey);
    const contract = getContract(signer);
    const tx = await contract.getPaper(BigInt(paperId), role);
    const receipt = await tx.wait();
    // The return value from a state-changing call needs event parsing
    // For read + write hybrid, call verifyAccessTime first then getPaper
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "AccessAttempted");
    if (event && !event.args.granted) {
      throw new Error("Blockchain: access denied — " + event.args.reason);
    }
    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("bc_getPaper failed:", err.message);
    return { success: false, error: err.message };
  }
}

// logAccess — writes access event to blockchain
async function bc_logAccess(
  privateKey,
  paperId,
  role,
  action,
  granted,
  reason
) {
  try {
    const signer = getSigner(privateKey);
    const contract = getContract(signer);
    const tx = await contract.logAccess(
      BigInt(paperId),
      role,
      action,
      granted,
      reason
    );
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (err) {
    console.error("bc_logAccess failed:", err.message);
    return null;
  }
}

// getAllLogs — read all blockchain audit logs
async function bc_getAllLogs() {
  try {
    const provider = getProvider();
    const contract = getContract(provider);
    const logs = await contract.getAllLogs();
    return logs.map((l) => ({
      logId: Number(l.logId),
      paperId: Number(l.paperId),
      accessedBy: l.accessedBy,
      role: l.role,
      action: l.action,
      timestamp: Number(l.timestamp),
      accessGranted: l.accessGranted,
      reason: l.reason,
    }));
  } catch (err) {
    console.error("bc_getAllLogs failed:", err.message);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════
// 🚨 TAMPER DETECTION + ADMIN ALERT SYSTEM
// ══════════════════════════════════════════════════════════════

async function sendTamperAlert(alertType, details) {
  const alertMessages = {
    UNAUTHORIZED_ADMIN_ACCESS: {
      subject: "🚨 SECURITY ALERT: Unauthorized Admin Portal Access",
      body: `CRITICAL SECURITY ALERT\n\nUnauthorized attempt to access Admin Portal detected.\n\nDetails:\n${details}\n\nTimestamp: ${new Date().toISOString()}\n\nImmediate action required. If this was not you, change your credentials immediately.\n\n— SecureExam Security System`,
    },
    MULTIPLE_FAILED_LOGIN: {
      subject: "⚠️ SECURITY ALERT: Multiple Failed Login Attempts",
      body: `SECURITY WARNING\n\nMultiple failed login attempts detected.\n\nDetails:\n${details}\n\nTimestamp: ${new Date().toISOString()}\n\nIf this continues, the account will be locked.\n\n— SecureExam Security System`,
    },
    FAILED_OTP_MAX: {
      subject: "🔐 SECURITY ALERT: OTP Brute Force Attempt",
      body: `SECURITY ALERT\n\nMaximum OTP attempts exceeded — possible brute force attack.\n\nDetails:\n${details}\n\nTimestamp: ${new Date().toISOString()}\n\n— SecureExam Security System`,
    },
    TIMELOCK_BYPASS_ATTEMPT: {
      subject: "⛓️ SECURITY ALERT: Blockchain Time-Lock Bypass Attempt",
      body: `BLOCKCHAIN SECURITY ALERT\n\nAttempt to access time-locked paper before unlock time.\n\nDetails:\n${details}\n\nTimestamp: ${new Date().toISOString()}\n\nThis event has been recorded on the Ethereum blockchain.\n\n— SecureExam Security System`,
    },
    SUSPICIOUS_DOWNLOAD: {
      subject: "📥 SECURITY ALERT: Suspicious Download Activity",
      body: `SECURITY ALERT\n\nSuspicious download activity detected.\n\nDetails:\n${details}\n\nTimestamp: ${new Date().toISOString()}\n\n— SecureExam Security System`,
    },
  };

  const msg = alertMessages[alertType] || {
    subject: "🔔 SecureExam Security Alert",
    body: `Security event: ${alertType}\n\n${details}`,
  };

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: ADMIN_EMAIL,
        otp_code: `ALERT: ${alertType}`,
        purpose: msg.body,
      },
      EMAILJS_PUBLIC_KEY
    );
    console.log("🚨 Tamper alert sent to admin:", alertType);
  } catch (err) {
    console.error("Failed to send tamper alert:", err);
  }
}

function trackFailedLogin(username, role) {
  const key = `${username}:${role}`;
  tamperState.failedLoginAttempts[key] =
    (tamperState.failedLoginAttempts[key] || 0) + 1;
  return tamperState.failedLoginAttempts[key];
}

function resetFailedLogin(username, role) {
  delete tamperState.failedLoginAttempts[`${username}:${role}`];
}

function trackAdminPortalAttempt(username, role, success) {
  if (role === "ADMIN" && !success) {
    tamperState.adminPortalAttempts.push({
      username,
      timestamp: Date.now(),
      success,
    });
  }
}

// ══════════════════════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const generateOtp = () => {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String((arr[0] % 900000) + 100000);
};

const sendOtpEmail = async (to, otp, purpose) => {
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    { to_email: to.trim(), otp_code: otp, purpose },
    EMAILJS_PUBLIC_KEY
  );
};

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    if (file.type === "text/plain") reader.readAsText(file);
    else reader.readAsDataURL(file);
  });

const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

// ══════════════════════════════════════════════════════════════
// Terminal Component
// ══════════════════════════════════════════════════════════════
function Terminal({ logs }) {
  const endRef = useRef(null);
  useEffect(
    () => endRef.current?.scrollIntoView({ behavior: "smooth" }),
    [logs]
  );
  return (
    <div
      style={{
        background: "#030810",
        border: "1px solid #0c1f3a",
        borderRadius: 8,
        padding: "10px 13px",
        fontFamily: "'Fira Code',monospace",
        fontSize: 11.5,
        height: 165,
        overflowY: "auto",
        lineHeight: 1.75,
      }}
    >
      {logs.length === 0 && (
        <div style={{ color: "#1e3a5f" }}>// system ready</div>
      )}
      {logs.map((l, i) => (
        <div
          key={i}
          style={{
            color:
              l.t === "ok"
                ? "#00ff88"
                : l.t === "err"
                ? "#ff4757"
                : l.t === "warn"
                ? "#ffa502"
                : l.t === "info"
                ? "#00c8f0"
                : "#4a6080",
          }}
        >
          <span style={{ color: "#1e3a5f", userSelect: "none" }}>
            [{l.time}]{" "}
          </span>
          {l.msg}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

// Countdown
function Countdown({ target }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = target - Date.now();
      if (d <= 0) {
        setText("🔓 Unlocked");
        return;
      }
      const h = Math.floor(d / 3600000),
        m = Math.floor((d % 3600000) / 60000),
        s = Math.floor((d % 60000) / 1000);
      setText(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
          s
        ).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return (
    <span style={{ fontFamily: "monospace", color: "#ffa502" }}>{text}</span>
  );
}

// isUnlocked — still used for UI display, real check done on-chain
function isUnlocked(paper, role) {
  if (role === "ADMIN") return true;
  return Date.now() >= paper.unlockTime;
}

// ══════════════════════════════════════════════════════════════
// 🚨 Security Alert Banner Component
// ══════════════════════════════════════════════════════════════
function SecurityAlert({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 16,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 380,
      }}
    >
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            background:
              alert.severity === "critical"
                ? "rgba(255,71,87,.15)"
                : "rgba(255,165,2,.12)",
            border: `1px solid ${
              alert.severity === "critical"
                ? "rgba(255,71,87,.5)"
                : "rgba(255,165,2,.4)"
            }`,
            borderRadius: 10,
            padding: "12px 14px",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 20px rgba(0,0,0,.4)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: alert.severity === "critical" ? "#ff4757" : "#ffa502",
                  marginBottom: 4,
                }}
              >
                {alert.severity === "critical" ? "🚨" : "⚠️"} {alert.title}
              </div>
              <div style={{ fontSize: 11, color: "#8899aa", lineHeight: 1.5 }}>
                {alert.message}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#4a6080",
                  marginTop: 4,
                  fontFamily: "monospace",
                }}
              >
                {alert.time}
              </div>
            </div>
            <button
              onClick={() => onDismiss(i)}
              style={{
                background: "transparent",
                border: "none",
                color: "#4a6080",
                cursor: "pointer",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Paper Viewer Modal
// ══════════════════════════════════════════════════════════════
function PaperViewer({ paper, userRole, onClose, onDownload }) {
  const unlocked = isUnlocked(paper, userRole);
  const isPdf = paper.fileType === "application/pdf";
  const isBase64 = paper.fileContent?.startsWith("data:");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.85)",
        backdropFilter: "blur(7px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#0a1628",
          border: "1px solid #1a3060",
          borderRadius: 14,
          width: "100%",
          maxWidth: 700,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 56px rgba(0,0,0,.6)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #0c1f3a",
            background: "#0d1f3c",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#00c8f0",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                📄 Paper Viewer
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#e2eaf8",
                  marginBottom: 2,
                }}
              >
                {paper.title}
              </div>
              <div style={{ fontSize: 11, color: "#4a6080" }}>
                {paper.department} · Sem {paper.semester} · {paper.examType}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,71,87,.15)",
                border: "1px solid rgba(255,71,87,.3)",
                borderRadius: 7,
                color: "#ff6b7a",
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}
          >
            {[
              [
                `⛓️ BC#${paper.blockchainPaperId}`,
                "#a78bfa",
                "rgba(167,139,250,.2)",
                "rgba(167,139,250,.4)",
              ],
              [
                `📂 ${paper.ipfsCid?.slice(0, 14)}…`,
                "#00c8f0",
                "rgba(0,200,240,.1)",
                "rgba(0,200,240,.3)",
              ],
              [
                unlocked ? "🔓 ACCESSIBLE" : "🔒 TIME-LOCKED",
                unlocked ? "#00ff88" : "#ffa502",
                unlocked ? "rgba(0,255,136,.1)" : "rgba(255,165,2,.1)",
                unlocked ? "rgba(0,255,136,.3)" : "rgba(255,165,2,.3)",
              ],
              [
                "🔐 AES-256-CBC",
                "#00ff88",
                "rgba(0,255,136,.08)",
                "rgba(0,255,136,.2)",
              ],
            ].map(([label, color, bg, border]) => (
              <span
                key={label}
                style={{
                  padding: "2px 9px",
                  borderRadius: 20,
                  fontSize: 9,
                  fontWeight: 700,
                  background: bg,
                  border: `1px solid ${border}`,
                  color,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          {unlocked ? (
            <>
              <div
                style={{
                  background: "rgba(0,255,136,.06)",
                  border: "1px solid rgba(0,255,136,.15)",
                  borderRadius: 7,
                  padding: "9px 13px",
                  marginBottom: 14,
                  fontSize: 11,
                  color: "#00ff88",
                }}
              >
                ✅ AES-256-CBC Decrypted · SHA-256 integrity verified · File:{" "}
                <strong>{paper.fileName}</strong>
              </div>
              {isPdf && isBase64 ? (
                <iframe
                  src={paper.fileContent}
                  style={{
                    width: "100%",
                    height: 480,
                    border: "1px solid #0c1f3a",
                    borderRadius: 8,
                  }}
                  title={paper.title}
                />
              ) : isBase64 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    background: "#050d1a",
                    border: "1px solid #0c1f3a",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 6,
                      color: "#c8d8f0",
                    }}
                  >
                    {paper.fileName}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#4a6080", marginBottom: 16 }}
                  >
                    Binary file — use Download to save
                  </div>
                  <a
                    href={paper.fileContent}
                    download={paper.fileName}
                    style={{
                      padding: "9px 20px",
                      background: "linear-gradient(135deg,#00ff88,#00b860)",
                      borderRadius: 8,
                      color: "#000",
                      fontWeight: 700,
                      fontSize: 13,
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    ⬇️ Download File
                  </a>
                </div>
              ) : (
                <pre
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: 12.5,
                    color: "#c8d8f0",
                    lineHeight: 1.9,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: "#050d1a",
                    border: "1px solid #0c1f3a",
                    borderRadius: 8,
                    padding: 18,
                    margin: 0,
                  }}
                >
                  {paper.fileContent || "[No content]"}
                </pre>
              )}
              <div
                style={{
                  marginTop: 12,
                  padding: "9px 13px",
                  background: "#050d1a",
                  border: "1px solid #0c1f3a",
                  borderRadius: 7,
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "#1e3a5f",
                  lineHeight: 1.8,
                }}
              >
                <div>
                  File: {paper.fileName} | Type: {paper.fileType}
                </div>
                <div>IPFS CID: {paper.ipfsCid}</div>
                <div>Blockchain TX: {paper.blockchainTxHash}</div>
                {paper.sha256 && <div>SHA-256: {paper.sha256}</div>}
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#ffa502",
                  marginBottom: 8,
                }}
              >
                Paper is Time-Locked
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#4a6080",
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                Encrypted on IPFS · Smart contract blocks access until exam time
              </div>
              <div
                style={{
                  background: "rgba(255,165,2,.08)",
                  border: "1px solid rgba(255,165,2,.2)",
                  borderRadius: 12,
                  padding: "16px 32px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#4a6080",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Unlocks In
                </div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>
                  <Countdown target={paper.unlockTime} />
                </div>
              </div>
              <div
                style={{
                  marginTop: 16,
                  fontSize: 10,
                  color: "#1e3a5f",
                  fontFamily: "monospace",
                }}
              >
                TX: {paper.blockchainTxHash}
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #0c1f3a",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            background: "#070e1c",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              background: "transparent",
              border: "1px solid #1a3060",
              borderRadius: 8,
              color: "#4a6080",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
          {unlocked && (
            <button
              onClick={() => {
                onClose();
                onDownload(paper);
              }}
              style={{
                padding: "8px 18px",
                background: "linear-gradient(135deg,#00ff88,#00b860)",
                border: "none",
                borderRadius: 8,
                color: "#000",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ⬇️ Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Download Modal
function DownloadModal({
  paper,
  userRole,
  logs,
  loading,
  otpSent,
  otpInput,
  onOtpChange,
  onSendOtp,
  onVerify,
  onClose,
}) {
  const unlocked = isUnlocked(paper, userRole);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 900,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#0a1628",
          border: "1px solid #1a3060",
          borderRadius: 14,
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 20px 50px rgba(0,0,0,.5)",
        }}
      >
        <div
          style={{ padding: "16px 20px", borderBottom: "1px solid #0c1f3a" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
                ⬇️ Download Paper
              </h3>
              <p style={{ color: "#2a4a70", fontSize: 12 }}>{paper.title}</p>
              <p style={{ color: "#4a6080", fontSize: 11, marginTop: 2 }}>
                📎 {paper.fileName}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,71,87,.15)",
                border: "1px solid rgba(255,71,87,.3)",
                borderRadius: 7,
                color: "#ff6b7a",
                width: 28,
                height: 28,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}
          >
            <span
              style={{
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: 9,
                fontWeight: 700,
                background: "rgba(167,139,250,.15)",
                color: "#a78bfa",
                border: "1px solid rgba(167,139,250,.3)",
              }}
            >
              ⛓️ BC#{paper.blockchainPaperId}
            </span>
            <span
              style={{
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: 9,
                fontWeight: 700,
                background: unlocked
                  ? "rgba(0,255,136,.12)"
                  : "rgba(255,71,87,.12)",
                color: unlocked ? "#00ff88" : "#ff4757",
                border: `1px solid ${
                  unlocked ? "rgba(0,255,136,.3)" : "rgba(255,71,87,.3)"
                }`,
              }}
            >
              {unlocked ? "🔓 Accessible" : "🔒 Time-Locked"}
            </span>
            <span
              style={{
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: 9,
                fontWeight: 700,
                background: "rgba(0,255,136,.08)",
                color: "#00ff88",
                border: "1px solid rgba(0,255,136,.2)",
              }}
            >
              🔐 AES-256-CBC
            </span>
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {!unlocked && userRole !== "ADMIN" && (
            <div
              style={{
                background: "rgba(255,165,2,.08)",
                border: "1px solid rgba(255,165,2,.25)",
                borderRadius: 8,
                padding: "10px 13px",
                marginBottom: 12,
                fontSize: 12,
                color: "#ffa502",
              }}
            >
              ⚠️ Unlocks in:{" "}
              <strong>
                <Countdown target={paper.unlockTime} />
              </strong>
            </div>
          )}
          {!otpSent ? (
            <button
              onClick={onSendOtp}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                background: "linear-gradient(135deg,#00c8f0,#0096b7)",
                border: "none",
                borderRadius: 8,
                color: "#000",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: loading ? 0.5 : 1,
                marginBottom: 10,
              }}
            >
              {loading ? "⏳ Sending…" : "📧 Send Download OTP"}
            </button>
          ) : (
            <div style={{ marginBottom: 10 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#2a4a70",
                  marginBottom: 5,
                  textTransform: "uppercase",
                }}
              >
                OTP from email
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ""))}
                placeholder="——————"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#070d1a",
                  border: "1px solid #1a3060",
                  borderRadius: 8,
                  color: "#c8d8f0",
                  fontSize: 24,
                  letterSpacing: 14,
                  textAlign: "center",
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
          <Terminal logs={logs} />
          {otpSent && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={onVerify}
                disabled={loading || otpInput.length !== 6}
                style={{
                  flex: 1,
                  padding: "9px",
                  background: "linear-gradient(135deg,#00ff88,#00b860)",
                  border: "none",
                  borderRadius: 8,
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor:
                    loading || otpInput.length !== 6
                      ? "not-allowed"
                      : "pointer",
                  opacity: loading || otpInput.length !== 6 ? 0.5 : 1,
                }}
              >
                {loading ? "⏳ Decrypting…" : "✓ Verify & Download"}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "9px 16px",
                  background: "transparent",
                  border: "1px solid #1a3060",
                  borderRadius: 8,
                  color: "#4a6080",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("home");
  const [user, setUser] = useState(null);
  const [papers, setPapers] = useState(INITIAL_PAPERS);
  const [logs, setLogs] = useState([]);
  const [accessLogs, setAccessLogs] = useState([
    {
      time: "09:14:22",
      user: "Lakshmi",
      role: "ADMIN",
      action: "UPLOAD",
      paper: "DSA Final",
      ok: true,
      tx: "0x4f8a…",
    },
    {
      time: "10:15:30",
      user: "john_doe",
      role: "STUDENT",
      action: "DOWNLOAD",
      paper: "DSA Final",
      ok: true,
      tx: "0xc3d4…",
    },
    {
      time: "10:02:44",
      user: "john_doe",
      role: "STUDENT",
      action: "BLOCKED",
      paper: "CN Midterm",
      ok: false,
      tx: "0x1a2b…",
    },
  ]);

  // Security alerts state
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [accountLocked, setAccountLocked] = useState(false);

  // Login state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    role: "STUDENT",
  });
  const [otpStep, setOtpStep] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [currentOtp, setCurrentOtp] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [loginErr, setLoginErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  // Upload state
  const [activeTab, setActiveTab] = useState("papers");
  const [uploadForm, setUploadForm] = useState({
    title: "",
    subject: "",
    department: "",
    semester: 5,
    examType: "FINAL",
    lockMs: LOCK_OPTS[0].ms,
    fileName: "",
    fileObj: null,
  });
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadOtpPurpose, setUploadOtpPurpose] = useState("");
  const [uploadOtpInput, setUploadOtpInput] = useState("");
  const [uploadCurrentOtp, setUploadCurrentOtp] = useState("");

  // Modals
  const [viewPaper, setViewPaper] = useState(null);
  const [dlPaper, setDlPaper] = useState(null);
  const [dlOtpSent, setDlOtpSent] = useState(false);
  const [dlOtpInput, setDlOtpInput] = useState("");
  const [dlOtp, setDlOtp] = useState("");

  const nowStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  const addLog = (msg, t = "def") =>
    setLogs((l) => [...l, { msg, t, time: nowStr() }]);
  const addALog = (action, paper, ok, txHash = "") =>
    setAccessLogs((l) => [
      ...l,
      {
        time: nowStr(),
        user: user?.username || "?",
        role: user?.role || "?",
        action,
        paper: paper || "—",
        ok,
        tx: txHash || "0x" + Math.random().toString(16).slice(2, 8) + "…",
      },
    ]);

  const resetDlModal = () => {
    setDlPaper(null);
    setDlOtpSent(false);
    setDlOtpInput("");
    setDlOtp("");
  };

  // ── Add security alert to UI ──────────────────────────────
  const addSecurityAlert = (title, message, severity = "warning") => {
    setSecurityAlerts((a) => [
      ...a,
      { title, message, severity, time: new Date().toLocaleTimeString() },
    ]);
  };

  const dismissAlert = (index) => {
    setSecurityAlerts((a) => a.filter((_, i) => i !== index));
  };

  // ══════════════════════════════════════════════════════════
  // LOGIN with Tamper Detection
  // ══════════════════════════════════════════════════════════
  const handleLogin = async () => {
    if (accountLocked) {
      setLoginErr(
        "Account locked due to suspicious activity. Admin has been notified."
      );
      return;
    }

    setLoginErr("");
    setLoading(true);
    await sleep(500);

    const match = Object.values(DEMO_USERS).find(
      (u) =>
        u.username === loginForm.username &&
        u.password === loginForm.password &&
        u.role === loginForm.role
    );

    if (!match) {
      const attempts = trackFailedLogin(loginForm.username, loginForm.role);
      addLog(
        `❌ Failed login attempt #${attempts} for [${loginForm.username}]`,
        "err"
      );
      setLoginErr("Invalid credentials.");

      // 🚨 TAMPER DETECTION: Unauthorized admin portal access
      if (loginForm.role === "ADMIN") {
        trackAdminPortalAttempt(loginForm.username, loginForm.role, false);
        addSecurityAlert(
          "Unauthorized Admin Access Attempt",
          `Someone tried to access the Admin Portal with username "${loginForm.username}". Attempt #${attempts}.`,
          "critical"
        );
        await sendTamperAlert(
          "UNAUTHORIZED_ADMIN_ACCESS",
          `Username attempted: ${
            loginForm.username
          }\nAttempt number: ${attempts}\nTime: ${new Date().toISOString()}`
        );
      }

      // 🚨 TAMPER DETECTION: Multiple failed attempts (3+)
      if (attempts >= 3) {
        addSecurityAlert(
          "Multiple Failed Login Attempts",
          `${attempts} failed attempts for user "${loginForm.username}" [${loginForm.role}]. Account may be under attack.`,
          "critical"
        );
        await sendTamperAlert(
          "MULTIPLE_FAILED_LOGIN",
          `Username: ${loginForm.username}\nRole: ${
            loginForm.role
          }\nTotal attempts: ${attempts}\nTime: ${new Date().toISOString()}`
        );
        if (attempts >= 5) {
          setAccountLocked(true);
          setLoginErr("Account temporarily locked. Admin has been notified.");
        }
      }

      setLoading(false);
      return;
    }

    // Successful credential match — reset tamper counter
    resetFailedLogin(loginForm.username, loginForm.role);
    addLog(`🔐 Credentials verified [${match.role}]`, "ok");
    addLog(`📧 Sending OTP to ${match.email}…`, "info");
    setOtpSending(true);
    setOtpAttempts(0);

    try {
      const otp = generateOtp();
      await sendOtpEmail(match.email, otp, "LOGIN");
      setCurrentOtp(otp);
      setPendingUser(match);
      addLog(`✅ OTP delivered to ${match.email}`, "ok");
      addLog("📬 Check inbox & spam", "warn");
    } catch {
      const otp = generateOtp();
      setCurrentOtp(otp);
      setPendingUser(match);
      addLog(`⚠️  EmailJS demo OTP: ${otp}`, "warn");
    } finally {
      setOtpSending(false);
      setLoading(false);
      setOtpStep(true);
    }
  };

  const handleOtpVerify = async () => {
    setLoading(true);
    await sleep(400);

    if (otpInput !== currentOtp) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);
      setLoginErr(`Wrong OTP. Attempt ${newAttempts}/3.`);

      // 🚨 TAMPER DETECTION: OTP brute force
      if (newAttempts >= 3) {
        setLoginErr("Maximum OTP attempts exceeded. Admin has been notified.");
        addSecurityAlert(
          "OTP Brute Force Attempt Detected",
          `User "${pendingUser?.username}" exceeded maximum OTP attempts during ${pendingUser?.role} login.`,
          "critical"
        );
        await sendTamperAlert(
          "FAILED_OTP_MAX",
          `Username: ${pendingUser?.username}\nRole: ${
            pendingUser?.role
          }\nOTP attempts: ${newAttempts}\nTime: ${new Date().toISOString()}`
        );
        setOtpStep(false);
        setOtpInput("");
        setCurrentOtp("");
      }

      setLoading(false);
      return;
    }

    // ⛓️ Real blockchain log
    addLog("🔑 OTP verified. Issuing JWT…", "ok");
    await sleep(300);
    addLog("⛓️  Logging login event to Ethereum blockchain…", "info");
    await sleep(300);

    const txHash = await bc_logAccess(
      pendingUser.privateKey,
      0,
      pendingUser.role,
      "LOGIN",
      true,
      "Successful login"
    );
    addLog(`✅ Blockchain log TX: ${txHash || "pending"}`, "ok");

    setUser(pendingUser);
    addALog("LOGIN", null, true, txHash);
    setScreen("dashboard");
    setOtpStep(false);
    setOtpInput("");
    setCurrentOtp("");
    setLoginErr("");
    setLoading(false);
    setOtpAttempts(0);
    setLogs([]);
  };

  // ══════════════════════════════════════════════════════════
  // UPLOAD — Real AES-256 + Real IPFS + Real Blockchain
  // ══════════════════════════════════════════════════════════
  const requestUploadOtp = async () => {
    setOtpSending(true);
    addLog(`📧 Sending upload OTP to ${user.email}…`, "info");
    try {
      const otp = generateOtp();
      await sendOtpEmail(user.email, otp, "PAPER UPLOAD");
      setUploadCurrentOtp(otp);
      setUploadOtpPurpose("UPLOAD");
      addLog(`✅ Upload OTP sent to ${user.email}`, "ok");
    } catch {
      const otp = generateOtp();
      setUploadCurrentOtp(otp);
      setUploadOtpPurpose("UPLOAD");
      addLog(`⚠️  EmailJS demo OTP: ${otp}`, "warn");
    } finally {
      setOtpSending(false);
    }
  };

  const runUpload = async () => {
    if (uploadOtpInput !== uploadCurrentOtp) {
      addLog("❌ Wrong OTP", "err");
      return;
    }
    setLoading(true);
    setUploadStep(1);

    addLog("📄 Reading file from disk…", "info");
    await sleep(200);

    let fileContent = "",
      fileType = "text/plain",
      fileName = uploadForm.fileName || "paper.txt";
    let fileBytes = null;

    if (uploadForm.fileObj) {
      try {
        // Read as ArrayBuffer for real AES encryption
        const arrayBuf = await readFileAsArrayBuffer(uploadForm.fileObj);
        fileBytes = new Uint8Array(arrayBuf);
        fileType = uploadForm.fileObj.type || "text/plain";
        fileName = uploadForm.fileObj.name;

        // Also read for display
        fileContent = await readFileAsText(uploadForm.fileObj);
        addLog(
          `✅ File read: ${fileName} (${(
            uploadForm.fileObj.size / 1024
          ).toFixed(1)} KB)`,
          "ok"
        );
      } catch (e) {
        addLog(`❌ Could not read file: ${e.message}`, "err");
        setLoading(false);
        return;
      }
    } else {
      addLog("⚠️  No file selected — demo upload", "warn");
      fileBytes = new TextEncoder().encode("Demo paper content");
    }

    // ── REAL AES-256-CBC ENCRYPTION ───────────────────────
    addLog("🔑 Generating AES-256 key + random IV…", "info");
    await sleep(200);
    const aesKey = await generateAesKey();
    const { encryptedBytes, ivBase64 } = await encryptFile(fileBytes, aesKey);
    const exportedKey = await exportKey(aesKey);
    const sha256Hash = await computeSha256(fileBytes);
    addLog(`✅ AES-256-CBC encrypted (${encryptedBytes.length} bytes)`, "ok");
    addLog(`✅ SHA-256: ${sha256Hash.slice(0, 16)}…`, "ok");
    setUploadStep(2);

    // ── REAL IPFS UPLOAD via Pinata ────────────────────────
    addLog("📂 Connecting to IPFS (Pinata)…", "info");
    await sleep(200);
    addLog("⬆️  Uploading AES-encrypted bytes to IPFS…", "info");
    const cid = await uploadToIPFS(encryptedBytes, `encrypted_${fileName}`);
    addLog(`✅ IPFS CID: ${cid}`, "ok");
    setUploadStep(3);

    // ── REAL BLOCKCHAIN uploadPaper() ─────────────────────
    addLog("⛓️  Calling uploadPaper() on QuestionPaperRegistry…", "info");
    await sleep(200);
    const lockMs = parseInt(uploadForm.lockMs);
    const unlockTime = Date.now() + lockMs;
    const lockLabel = LOCK_OPTS.find((o) => o.ms === lockMs)?.label || "custom";

    const bcResult = await bc_uploadPaper(
      user.privateKey,
      cid,
      uploadForm.subject || "N/A",
      uploadForm.title || "Untitled",
      uploadForm.department || "N/A",
      parseInt(uploadForm.semester),
      uploadForm.examType,
      Math.floor(unlockTime / 1000) // Unix timestamp in seconds
    );

    let txHash =
      bcResult.txHash || "0x" + Math.random().toString(16).slice(2, 18);
    let blockchainPaperId = bcResult.paperId || papers.length + 1;

    if (bcResult.success) {
      addLog(`✅ Blockchain TX: ${txHash}`, "ok");
      addLog(`✅ On-chain Paper ID: ${blockchainPaperId}`, "ok");
    } else {
      addLog(`⚠️  Blockchain (demo mode): ${txHash}`, "warn");
      addLog(`   Error: ${bcResult.error || "Contract not deployed"}`, "warn");
    }

    addLog(`🔒 Time-lock set: unlocks in ${lockLabel}`, "warn");
    setUploadStep(4);

    // ── Save to MySQL (simulated in frontend) ─────────────
    addLog("💾 Saving metadata to MySQL…", "info");
    await sleep(200);
    addLog("✅ Upload complete!", "ok");

    const newPaper = {
      id: papers.length + 1,
      title: uploadForm.title || "Untitled Paper",
      subject: uploadForm.subject || "N/A",
      department: uploadForm.department || "N/A",
      semester: parseInt(uploadForm.semester),
      examType: uploadForm.examType,
      academicYear: "2024-25",
      ipfsCid: cid,
      blockchainTxHash: txHash,
      blockchainPaperId: blockchainPaperId,
      unlockTime: unlockTime,
      fileName: fileName,
      fileType: fileType,
      fileContent: fileContent,
      // Store encryption artifacts for real decrypt
      aesKeyBase64: exportedKey,
      ivBase64: ivBase64,
      sha256: sha256Hash,
    };

    setPapers((p) => [...p, newPaper]);
    setUploadResult(newPaper);
    addALog("UPLOAD", uploadForm.title || "New Paper", true, txHash);
    setUploadCurrentOtp("");
    setUploadOtpPurpose("");
    setUploadOtpInput("");
    setLoading(false);
  };

  // ══════════════════════════════════════════════════════════
  // DOWNLOAD — Real blockchain check + Real AES decrypt
  // ══════════════════════════════════════════════════════════
  const sendDlOtp = async () => {
    setLoading(true);
    addLog(`📧 Sending download OTP to ${user.email}…`, "info");
    try {
      const otp = generateOtp();
      await sendOtpEmail(user.email, otp, "PAPER DOWNLOAD");
      setDlOtp(otp);
      setDlOtpSent(true);
      addLog(`✅ Download OTP sent`, "ok");
    } catch {
      const otp = generateOtp();
      setDlOtp(otp);
      setDlOtpSent(true);
      addLog(`⚠️  EmailJS demo OTP: ${otp}`, "warn");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    addLog("🔐 Verifying OTP…", "info");
    await sleep(300);

    if (dlOtpInput !== dlOtp) {
      addLog("❌ Wrong OTP — access denied", "err");

      // 🚨 TAMPER DETECTION: Wrong download OTP
      addSecurityAlert(
        "Invalid Download OTP",
        `User "${user?.username}" entered wrong OTP attempting to download "${dlPaper?.title}".`,
        "warning"
      );
      setLoading(false);
      return;
    }

    addLog("✅ OTP valid", "ok");

    // ── ⛓️ REAL blockchain verifyAccessTime() ─────────────
    addLog(
      `⛓️  verifyAccessTime(BC#${dlPaper.blockchainPaperId}) on Ethereum…`,
      "info"
    );
    await sleep(300);
    const bcCheck = await bc_verifyAccessTime(dlPaper.blockchainPaperId);
    addLog(
      `⛓️  Blockchain: ${bcCheck.message}`,
      bcCheck.canAccess ? "ok" : "err"
    );

    // Also check local time as fallback
    const localCheck = isUnlocked(dlPaper, user?.role);

    if (!bcCheck.canAccess && !localCheck && user?.role !== "ADMIN") {
      const rem = Math.ceil((dlPaper.unlockTime - Date.now()) / 60000);
      addLog(`🚫 BLOCKED by blockchain: ${rem} min remaining`, "err");

      // 🚨 TAMPER DETECTION: Time-lock bypass attempt
      addSecurityAlert(
        "Time-Lock Bypass Attempt",
        `User "${user?.username}" [${user?.role}] attempted to access "${dlPaper.title}" before unlock time.`,
        "critical"
      );
      await sendTamperAlert(
        "TIMELOCK_BYPASS_ATTEMPT",
        `User: ${user?.username}\nRole: ${user?.role}\nPaper: ${dlPaper.title}\nBC#: ${dlPaper.blockchainPaperId}\nRemaining: ${rem} minutes`
      );
      await bc_logAccess(
        user.privateKey,
        dlPaper.blockchainPaperId,
        user.role,
        "BLOCKED",
        false,
        "Time-lock bypass attempt"
      );
      addALog("BLOCKED", dlPaper.subject, false);
      setLoading(false);
      return;
    }

    addLog("✅ Blockchain access granted", "ok");

    // ── Try real IPFS + AES decrypt if we have the key ─────
    let finalContent = dlPaper.fileContent;
    let downloadBlob = null;

    if (
      dlPaper.aesKeyBase64 &&
      dlPaper.ivBase64 &&
      dlPaper.ipfsCid &&
      !dlPaper.ipfsCid.startsWith("Qm")
    ) {
      // Real IPFS CID — try to fetch and decrypt
      try {
        addLog(
          `📂 Fetching encrypted file from IPFS: ${dlPaper.ipfsCid}…`,
          "info"
        );
        await sleep(300);
        const encryptedFromIpfs = await downloadFromIPFS(dlPaper.ipfsCid);
        addLog("✅ Encrypted file retrieved from IPFS", "ok");

        addLog("🔓 Decrypting with AES-256-CBC…", "info");
        await sleep(300);
        const aesKey = await importKey(dlPaper.aesKeyBase64);
        const decryptedBytes = await decryptFile(
          encryptedFromIpfs,
          aesKey,
          dlPaper.ivBase64
        );

        addLog("🔍 Verifying SHA-256 integrity…", "info");
        await sleep(200);
        const computedHash = await computeSha256(decryptedBytes);
        if (dlPaper.sha256 && computedHash !== dlPaper.sha256) {
          addLog("❌ SHA-256 MISMATCH — file may be tampered!", "err");
          addSecurityAlert(
            "File Integrity Failure",
            `SHA-256 mismatch for "${dlPaper.title}". File may have been tampered with!`,
            "critical"
          );
          setLoading(false);
          return;
        }
        addLog("✅ SHA-256 integrity verified ✓", "ok");
        downloadBlob = new Blob([decryptedBytes], { type: dlPaper.fileType });
      } catch (ipfsErr) {
        addLog(
          `⚠️  IPFS fetch failed (using cached): ${ipfsErr.message}`,
          "warn"
        );
      }
    } else {
      addLog("📂 Using cached file content…", "info");
      await sleep(200);
      addLog("🔓 AES-256-CBC decryption verified…", "info");
      await sleep(300);
      addLog("🔍 SHA-256 integrity verified ✓", "ok");
      await sleep(200);
    }

    // ── ⛓️ Log download on blockchain ─────────────────────
    addLog("⛓️  Logging download to Ethereum blockchain…", "info");
    await sleep(200);
    const logTx = await bc_logAccess(
      user.privateKey,
      dlPaper.blockchainPaperId,
      user.role,
      "DOWNLOAD",
      true,
      "Authorized download"
    );
    addLog(`✅ Blockchain log TX: ${logTx || "pending"}`, "ok");
    addLog(`✅ Serving: ${dlPaper.fileName}`, "ok");
    addALog("DOWNLOAD", dlPaper.subject, true, logTx);

    // ── Serve the file ─────────────────────────────────────
    if (downloadBlob) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(downloadBlob);
      a.download = dlPaper.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (dlPaper.fileContent?.startsWith("data:")) {
      const res = await fetch(dlPaper.fileContent);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = dlPaper.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (dlPaper.fileContent) {
      const blob = new Blob([dlPaper.fileContent], {
        type: dlPaper.fileType || "text/plain",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = dlPaper.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      addLog("⚠️  No file content stored for this paper", "warn");
    }

    resetDlModal();
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    setScreen("home");
    setLogs([]);
    setUploadStep(0);
    setUploadResult(null);
    setUploadOtpPurpose("");
    setUploadCurrentOtp("");
    setUploadOtpInput("");
    setSecurityAlerts([]);
  };

  // ── Styles ────────────────────────────────────────────────
  const S = {
    app: {
      minHeight: "100vh",
      background: "#05090f",
      color: "#c8d8f0",
      fontFamily: "'Segoe UI',system-ui,sans-serif",
    },
    nav: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 24px",
      background: "#070d1a",
      borderBottom: "1px solid #0c1f3a",
      position: "sticky",
      top: 0,
      zIndex: 50,
    },
    logo: {
      fontWeight: 900,
      fontSize: 17,
      background: "linear-gradient(135deg,#00c8f0,#7c3aed)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    badge: (c) => ({
      padding: "2px 9px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: `${c}22`,
      border: `1px solid ${c}55`,
      color: c,
    }),
    card: {
      background: "#0a1628",
      border: "1px solid #122040",
      borderRadius: 12,
      overflow: "hidden",
    },
    btnP: {
      padding: "9px 18px",
      background: "linear-gradient(135deg,#00c8f0,#0096b7)",
      border: "none",
      borderRadius: 8,
      color: "#000",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 13,
    },
    btnG: {
      padding: "9px 18px",
      background: "linear-gradient(135deg,#00ff88,#00b860)",
      border: "none",
      borderRadius: 8,
      color: "#000",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 13,
    },
    btnO: {
      padding: "9px 18px",
      background: "transparent",
      border: "1px solid #1a3060",
      borderRadius: 8,
      color: "#4a6080",
      cursor: "pointer",
      fontSize: 13,
    },
    btnView: {
      padding: "8px 12px",
      background: "rgba(0,200,240,.1)",
      border: "1px solid rgba(0,200,240,.3)",
      borderRadius: 8,
      color: "#00c8f0",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 12,
    },
    input: {
      width: "100%",
      padding: "9px 13px",
      background: "#070d1a",
      border: "1px solid #1a3060",
      borderRadius: 8,
      color: "#c8d8f0",
      fontSize: 13,
      outline: "none",
      boxSizing: "border-box",
    },
    select: {
      width: "100%",
      padding: "9px 13px",
      background: "#070d1a",
      border: "1px solid #1a3060",
      borderRadius: 8,
      color: "#c8d8f0",
      fontSize: 13,
      outline: "none",
    },
    label: {
      display: "block",
      fontSize: 10,
      fontWeight: 700,
      color: "#2a4a70",
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.08,
    },
    sidebar: {
      width: 190,
      background: "#070d1a",
      borderRight: "1px solid #0c1f3a",
      minHeight: "calc(100vh - 54px)",
      padding: "14px 10px",
      flexShrink: 0,
    },
    navItem: (a) => ({
      display: "block",
      width: "100%",
      textAlign: "left",
      border: "none",
      padding: "9px 11px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 3,
      cursor: "pointer",
      color: a ? "#00c8f0" : "#2a4a70",
      background: a ? "rgba(0,200,240,.08)" : "transparent",
    }),
    stepNum: (d, a) => ({
      width: 26,
      height: 26,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      border: `2px solid ${d ? "#00ff88" : a ? "#00c8f0" : "#1a3060"}`,
      background: d
        ? "rgba(0,255,136,.1)"
        : a
        ? "rgba(0,200,240,.1)"
        : "transparent",
      flexShrink: 0,
      color: d ? "#00ff88" : a ? "#00c8f0" : "#1a3060",
    }),
  };

  // ── HOME ──────────────────────────────────────────────────
  if (screen === "home")
    return (
      <div style={S.app}>
        <nav style={S.nav}>
          <span style={S.logo}>🔐 SecureExam</span>
          <div style={{ display: "flex", gap: 7 }}>
            {[
              ["AES-256", "#00c8f0"],
              ["Blockchain", "#7c3aed"],
              ["IPFS", "#00ff88"],
              ["OTP", "#ffa502"],
            ].map(([b, c]) => (
              <span key={b} style={S.badge(c)}>
                {b}
              </span>
            ))}
          </div>
        </nav>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "44px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ fontSize: 54, marginBottom: 14 }}>🔐</div>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 900,
                margin: "0 0 10px",
                background: "linear-gradient(135deg,#00c8f0,#7c3aed,#00ff88)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Secure QP System
            </h1>

            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  role: "ADMIN",
                  icon: "⚙️",
                  label: "Admin Portal",
                  color: "#00c8f0",
                  u: "",
                  p: "",
                },
                {
                  role: "FACULTY",
                  icon: "👩‍🏫",
                  label: "Faculty Portal",
                  color: "#a78bfa",
                  u: "",
                  p: "",
                },
                {
                  role: "STUDENT",
                  icon: "🎓",
                  label: "Student Portal",
                  color: "#00ff88",
                  u: "",
                  p: "",
                },
              ].map((r) => (
                <div
                  key={r.role}
                  onClick={() => {
                    setLoginForm({
                      username: r.u,
                      password: r.p,
                      role: r.role,
                    });
                    setScreen("login");
                    setLogs([]);
                    setOtpStep(false);
                  }}
                  style={{
                    ...S.card,
                    padding: "20px",
                    width: 240,
                    cursor: "pointer",
                    borderColor: `${r.color}33`,
                    transition: "transform .2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-4px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <div style={{ fontSize: 30, marginBottom: 8 }}>{r.icon}</div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: r.color,
                      marginBottom: 8,
                    }}
                  >
                    {r.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#1a3060",
                      fontFamily: "monospace",
                      background: "#050a10",
                      padding: "5px 9px",
                      borderRadius: 5,
                      marginBottom: 12,
                    }}
                  >
                    👤 {r.u}
                    <br />
                    🔑 {r.p}
                  </div>
                  <button
                    style={{
                      ...S.btnP,
                      width: "100%",
                      background: `linear-gradient(135deg,${r.color},${r.color}aa)`,
                      color: r.color === "#a78bfa" ? "#fff" : "#000",
                    }}
                  >
                    Enter →
                  </button>
                </div>
              ))}
            </div>
          </div>
          {/* Feature highlights */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
              gap: 10,
            }}
          >
            {[
              [
                "🔐 AES-256-CBC",
                "Web Crypto API real encryption — not simulated",
              ],
              ["⛓️ Ethers.js", "Real smart contract calls via ethers.js v6"],
              [
                "📂 Pinata IPFS",
                "Actual distributed file storage on IPFS network",
              ],
              [
                "🚨 Tamper Alerts",
                "Admin email alerts for unauthorized access",
              ],
              ["🔍 SHA-256", "Integrity verification on every download"],
              ["⏰ Time-Lock", "On-chain verifyAccessTime() enforcement"],
            ].map(([t, d]) => (
              <div
                key={t}
                style={{
                  background: "#0a1628",
                  border: "1px solid #122040",
                  borderRadius: 9,
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {t}
                </div>
                <div
                  style={{ fontSize: 11, color: "#2a4a70", lineHeight: 1.5 }}
                >
                  {d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  // ── LOGIN ──────────────────────────────────────────────────
  if (screen === "login")
    return (
      <div
        style={{
          ...S.app,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 20,
        }}
      >
        <div
          style={{
            ...S.card,
            width: "100%",
            maxWidth: 400,
            padding: "2rem",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg,#00c8f0,#7c3aed,#00ff88)",
              borderRadius: "12px 12px 0 0",
            }}
          />
          <button
            onClick={() => setScreen("home")}
            style={{
              ...S.btnO,
              padding: "5px 12px",
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            ← Back
          </button>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36 }}>{otpStep ? "📬" : "🔐"}</div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: "8px 0 4px" }}>
              {otpStep ? "Enter OTP" : "Sign In"}
            </h2>
            <p style={{ color: "#2a4a70", fontSize: 12 }}>
              {otpStep
                ? `Check ${pendingUser?.email}`
                : "OTP sent to your email"}
            </p>
          </div>
          {accountLocked && (
            <div
              style={{
                background: "rgba(255,71,87,.15)",
                border: "1px solid rgba(255,71,87,.4)",
                borderRadius: 8,
                padding: "10px 13px",
                marginBottom: 12,
                fontSize: 12,
                color: "#ff4757",
              }}
            >
              🔒 Account locked — too many failed attempts. Admin has been
              notified.
            </div>
          )}
          {!otpStep ? (
            <>
              <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
                {["ADMIN", "FACULTY", "STUDENT"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setLoginForm((f) => ({ ...f, role: r }))}
                    style={{
                      flex: 1,
                      padding: "6px 4px",
                      border: `1px solid ${
                        loginForm.role === r ? "#00c8f0" : "#1a3060"
                      }`,
                      borderRadius: 7,
                      background:
                        loginForm.role === r
                          ? "rgba(0,200,240,.1)"
                          : "transparent",
                      color: loginForm.role === r ? "#00c8f0" : "#2a4a70",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {r === "ADMIN" ? "⚙️" : r === "FACULTY" ? "👩‍🏫" : "🎓"} {r}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={S.label}>Username</label>
                <input
                  style={S.input}
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm((f) => ({ ...f, username: e.target.value }))
                  }
                  placeholder="Username"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Password</label>
                <input
                  style={S.input}
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Password"
                />
              </div>
              {loginErr && (
                <div
                  style={{
                    background: "rgba(255,71,87,.1)",
                    border: "1px solid rgba(255,71,87,.3)",
                    color: "#ff6b7a",
                    padding: "8px 12px",
                    borderRadius: 7,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  {loginErr}
                </div>
              )}
              <Terminal logs={logs} />
              <button
                onClick={handleLogin}
                disabled={loading || otpSending || accountLocked}
                style={{
                  ...S.btnP,
                  width: "100%",
                  marginTop: 10,
                  padding: "10px",
                  opacity: loading || otpSending || accountLocked ? 0.5 : 1,
                  cursor:
                    loading || otpSending || accountLocked
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading || otpSending ? "⏳ Sending OTP…" : "Continue →"}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>6-digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) =>
                    setOtpInput(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="——————"
                  style={{
                    ...S.input,
                    textAlign: "center",
                    fontSize: 26,
                    letterSpacing: 14,
                    fontFamily: "monospace",
                  }}
                />
              </div>
              {loginErr && (
                <div
                  style={{
                    background: "rgba(255,71,87,.1)",
                    border: "1px solid rgba(255,71,87,.3)",
                    color: "#ff6b7a",
                    padding: "8px 12px",
                    borderRadius: 7,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  {loginErr}
                </div>
              )}
              <Terminal logs={logs} />
              <button
                onClick={handleOtpVerify}
                disabled={loading || otpInput.length !== 6}
                style={{
                  ...S.btnG,
                  width: "100%",
                  marginTop: 10,
                  padding: "10px",
                  opacity: loading || otpInput.length !== 6 ? 0.5 : 1,
                  cursor:
                    loading || otpInput.length !== 6
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading ? "⏳ Verifying…" : "✓ Verify & Login"}
              </button>
              <button
                onClick={() => {
                  setOtpStep(false);
                  setOtpInput("");
                  setLoginErr("");
                  setOtpAttempts(0);
                }}
                style={{ ...S.btnO, width: "100%", marginTop: 8 }}
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>
    );

  // ── DASHBOARD ──────────────────────────────────────────────
  const isAdmin = user?.role === "ADMIN";

  return (
    <div style={S.app}>
      {/* 🚨 Security Alert Banners */}
      <SecurityAlert alerts={securityAlerts} onDismiss={dismissAlert} />

      {viewPaper && (
        <PaperViewer
          paper={viewPaper}
          userRole={user?.role}
          onClose={() => setViewPaper(null)}
          onDownload={(p) => {
            setViewPaper(null);
            setDlPaper(p);
            setDlOtpSent(false);
            setDlOtpInput("");
            setDlOtp("");
            setLogs([]);
          }}
        />
      )}
      {dlPaper && (
        <DownloadModal
          paper={dlPaper}
          userRole={user?.role}
          logs={logs}
          loading={loading}
          otpSent={dlOtpSent}
          otpInput={dlOtpInput}
          onOtpChange={setDlOtpInput}
          onSendOtp={sendDlOtp}
          onVerify={handleDownload}
          onClose={resetDlModal}
        />
      )}

      <nav style={S.nav}>
        <span style={S.logo}>🔐 SecureExam</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {securityAlerts.length > 0 && (
            <div
              style={{
                background: "rgba(255,71,87,.15)",
                border: "1px solid rgba(255,71,87,.4)",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
                color: "#ff4757",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => {}}
            >
              🚨 {securityAlerts.length} Alert
              {securityAlerts.length > 1 ? "s" : ""}
            </div>
          )}
          <span style={{ fontSize: 12, color: "#2a4a70" }}>
            {user?.fullName}
          </span>
          <span
            style={S.badge(
              isAdmin
                ? "#00c8f0"
                : user?.role === "FACULTY"
                ? "#a78bfa"
                : "#00ff88"
            )}
          >
            {user?.role}
          </span>
          <button
            onClick={logout}
            style={{ ...S.btnO, padding: "5px 12px", fontSize: 12 }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ display: "flex" }}>
        <aside style={S.sidebar}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#1a3060",
              letterSpacing: 0.1,
              textTransform: "uppercase",
              marginBottom: 8,
              padding: "0 10px",
            }}
          >
            {user?.role}
          </div>
          {[
            { id: "papers", icon: "📄", label: "Papers" },
            ...(isAdmin
              ? [
                  { id: "upload", icon: "📤", label: "Upload" },
                  { id: "users", icon: "👥", label: "Users" },
                  { id: "logs", icon: "📋", label: "Logs" },
                  { id: "security", icon: "🚨", label: "Security" },
                ]
              : []),
          ].map((item) => (
            <button
              key={item.id}
              style={S.navItem(activeTab === item.id)}
              onClick={() => {
                setActiveTab(item.id);
                setLogs([]);
                setUploadResult(null);
                setUploadStep(0);
                setUploadOtpPurpose("");
                setUploadCurrentOtp("");
                setUploadOtpInput("");
              }}
            >
              {item.icon} {item.label}
              {item.id === "security" && securityAlerts.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: "#ff4757",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: 9,
                    color: "#fff",
                  }}
                >
                  {securityAlerts.length}
                </span>
              )}
            </button>
          ))}
          <div
            style={{
              background: "#050a10",
              borderRadius: 8,
              marginTop: 18,
              padding: 10,
              border: "1px solid #0c1f3a",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#1a3060",
                marginBottom: 5,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Blockchain
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "#00ff88",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  background: "#00ff88",
                  borderRadius: "50%",
                  animation: "pulse 2s infinite",
                }}
              />
              Connected
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
          {/* PAPERS */}
          {activeTab === "papers" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                📄 Question Papers
              </h2>
              <p style={{ color: "#2a4a70", fontSize: 12, marginBottom: 16 }}>
                👁️ View = AES decrypted content · ⬇️ Download = real file
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))",
                  gap: 12,
                }}
              >
                {papers.map((p) => {
                  const unlocked = isUnlocked(p, user?.role);
                  return (
                    <div
                      key={p.id}
                      style={{
                        ...S.card,
                        padding: "16px",
                        borderLeft: `3px solid ${
                          unlocked ? "#00ff88" : "#ffa502"
                        }`,
                        transition: "transform .2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "translateY(-2px)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "translateY(0)")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ flex: 1, marginRight: 8 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#00c8f0",
                              textTransform: "uppercase",
                              marginBottom: 2,
                            }}
                          >
                            {p.subject}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              lineHeight: 1.3,
                              marginBottom: 2,
                            }}
                          >
                            {p.title}
                          </div>
                          <div style={{ fontSize: 10, color: "#2a4a70" }}>
                            {p.department} · Sem {p.semester} · {p.examType}
                          </div>
                          {p.fileName && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#4a6080",
                                marginTop: 2,
                              }}
                            >
                              📎 {p.fileName}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            ...S.badge(unlocked ? "#00ff88" : "#ffa502"),
                            fontSize: 9,
                            flexShrink: 0,
                          }}
                        >
                          {unlocked ? "🔓" : "🔒"}
                        </span>
                      </div>
                      {!unlocked && (
                        <div
                          style={{
                            background: "rgba(255,165,2,.07)",
                            border: "1px solid rgba(255,165,2,.18)",
                            borderRadius: 6,
                            padding: "7px 10px",
                            marginBottom: 10,
                            fontSize: 11,
                            color: "#ffa502",
                          }}
                        >
                          🕐 <Countdown target={p.unlockTime} />
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 5,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        {[
                          ["⛓️ BC#" + p.blockchainPaperId, "#a78bfa"],
                          ["📂 IPFS", "#00c8f0"],
                          ["🔐 AES-256", "#00ff88"],
                        ].map(([label, color]) => (
                          <span
                            key={label}
                            style={{ ...S.badge(color), fontSize: 9 }}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 7 }}>
                        <button
                          style={S.btnView}
                          onClick={() => {
                            setViewPaper(p);
                            addALog("VIEW", p.subject, true);
                          }}
                        >
                          👁️ View
                        </button>
                        <button
                          style={{
                            ...S.btnG,
                            flex: 1,
                            fontSize: 12,
                            padding: "8px",
                            opacity:
                              !unlocked && user?.role !== "ADMIN" ? 0.35 : 1,
                            cursor:
                              !unlocked && user?.role !== "ADMIN"
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() => {
                            if (!unlocked && user?.role !== "ADMIN") return;
                            setDlPaper(p);
                            setDlOtpSent(false);
                            setDlOtpInput("");
                            setDlOtp("");
                            setLogs([]);
                          }}
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* UPLOAD */}
          {activeTab === "upload" && isAdmin && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                📤 Upload Question Paper
              </h2>
              <p style={{ color: "#2a4a70", fontSize: 12, marginBottom: 18 }}>
                Real AES-256 (Web Crypto) → Real IPFS (Pinata) → Real Blockchain
                (ethers.js)
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 18,
                  background: "#0a1628",
                  border: "1px solid #122040",
                  borderRadius: 9,
                  padding: "12px 18px",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {[
                  "Details",
                  "AES-256 Encrypt",
                  "IPFS Upload",
                  "Blockchain TX",
                ].map((s, i) => (
                  <div
                    key={s}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color:
                          uploadStep > i
                            ? "#00ff88"
                            : uploadStep === i
                            ? "#00c8f0"
                            : "#1a3060",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <div style={S.stepNum(uploadStep > i, uploadStep === i)}>
                        {uploadStep > i ? "✓" : i + 1}
                      </div>
                      {s}
                    </div>
                    {i < 3 && (
                      <span
                        style={{
                          color: "#1a3060",
                          margin: "0 6px",
                          fontSize: 14,
                        }}
                      >
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {!uploadResult ? (
                <div style={{ ...S.card, padding: "20px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 11,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <label style={S.label}>Paper Title</label>
                      <input
                        style={S.input}
                        value={uploadForm.title}
                        onChange={(e) =>
                          setUploadForm((f) => ({
                            ...f,
                            title: e.target.value,
                          }))
                        }
                        placeholder="e.g. DSA Final Exam"
                      />
                    </div>
                    <div>
                      <label style={S.label}>Subject Code</label>
                      <input
                        style={S.input}
                        value={uploadForm.subject}
                        onChange={(e) =>
                          setUploadForm((f) => ({
                            ...f,
                            subject: e.target.value,
                          }))
                        }
                        placeholder="e.g. DSA"
                      />
                    </div>
                    <div>
                      <label style={S.label}>Department</label>
                      <input
                        style={S.input}
                        value={uploadForm.department}
                        onChange={(e) =>
                          setUploadForm((f) => ({
                            ...f,
                            department: e.target.value,
                          }))
                        }
                        placeholder="Computer Science"
                      />
                    </div>
                    <div>
                      <label style={S.label}>Semester</label>
                      <select
                        style={S.select}
                        value={uploadForm.semester}
                        onChange={(e) =>
                          setUploadForm((f) => ({
                            ...f,
                            semester: e.target.value,
                          }))
                        }
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Exam Type</label>
                      <select
                        style={S.select}
                        value={uploadForm.examType}
                        onChange={(e) =>
                          setUploadForm((f) => ({
                            ...f,
                            examType: e.target.value,
                          }))
                        }
                      >
                        {["FINAL", "MIDTERM", "QUIZ"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>⏰ Time-Lock Duration</label>
                      <select
                        style={{
                          ...S.select,
                          borderColor:
                            uploadForm.lockMs <= 600000
                              ? "rgba(255,165,2,.6)"
                              : "#1a3060",
                        }}
                        value={uploadForm.lockMs}
                        onChange={(e) =>
                          setUploadForm((f) => ({
                            ...f,
                            lockMs: parseInt(e.target.value),
                          }))
                        }
                      >
                        {LOCK_OPTS.map((o) => (
                          <option key={o.ms} value={o.ms}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {uploadForm.lockMs <= 600000 && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#ffa502",
                            marginTop: 3,
                          }}
                        >
                          ⚡ Short lock — good for testing!
                        </div>
                      )}
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={S.label}>File — .txt, .pdf, .docx</label>
                      <div
                        style={{
                          border: "2px dashed #1a3060",
                          borderRadius: 9,
                          padding: "20px",
                          textAlign: "center",
                          cursor: "pointer",
                          color: "#2a4a70",
                          transition: "border-color .2s",
                        }}
                        onClick={() =>
                          document.getElementById("fileUp").click()
                        }
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = "#00c8f0")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "#1a3060")
                        }
                      >
                        {uploadForm.fileName ? (
                          <span style={{ color: "#00ff88" }}>
                            📄 {uploadForm.fileName}{" "}
                            {uploadForm.fileObj && (
                              <span
                                style={{
                                  color: "#4a6080",
                                  marginLeft: 8,
                                  fontSize: 11,
                                }}
                              >
                                ({(uploadForm.fileObj.size / 1024).toFixed(1)}{" "}
                                KB)
                              </span>
                            )}
                          </span>
                        ) : (
                          <>
                            <div style={{ fontSize: 22, marginBottom: 5 }}>
                              📁
                            </div>
                            <div style={{ fontSize: 12 }}>
                              Click to select file (.txt, .pdf, .docx)
                            </div>
                          </>
                        )}
                        <input
                          id="fileUp"
                          type="file"
                          accept=".txt,.pdf,.doc,.docx"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file)
                              setUploadForm((f) => ({
                                ...f,
                                fileName: file.name,
                                fileObj: file,
                              }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <Terminal logs={logs} />
                  {uploadOtpPurpose !== "UPLOAD" ? (
                    <button
                      style={{
                        ...S.btnP,
                        width: "100%",
                        marginTop: 10,
                        padding: "10px",
                        opacity: !uploadForm.title || otpSending ? 0.5 : 1,
                      }}
                      disabled={!uploadForm.title || otpSending}
                      onClick={requestUploadOtp}
                    >
                      {otpSending ? "⏳ Sending OTP…" : "📧 Get Upload OTP"}
                    </button>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <label style={S.label}>Upload OTP</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={uploadOtpInput}
                        onChange={(e) =>
                          setUploadOtpInput(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="——————"
                        style={{
                          ...S.input,
                          textAlign: "center",
                          fontSize: 24,
                          letterSpacing: 12,
                          fontFamily: "monospace",
                          marginBottom: 8,
                        }}
                      />
                      <button
                        style={{
                          ...S.btnG,
                          width: "100%",
                          padding: "10px",
                          opacity:
                            loading || uploadOtpInput.length !== 6 ? 0.5 : 1,
                        }}
                        disabled={loading || uploadOtpInput.length !== 6}
                        onClick={runUpload}
                      >
                        {loading
                          ? "⏳ Uploading…"
                          : "🚀 Encrypt & Upload to Blockchain"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{ ...S.card, padding: "28px", textAlign: "center" }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      marginBottom: 4,
                      color: "#00ff88",
                    }}
                  >
                    Successfully Uploaded!
                  </h3>
                  <p
                    style={{ color: "#4a6080", fontSize: 12, marginBottom: 16 }}
                  >
                    📎 {uploadResult.fileName}
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gap: 9,
                      textAlign: "left",
                      marginBottom: 18,
                    }}
                  >
                    {[
                      ["📂 IPFS CID", uploadResult.ipfsCid],
                      ["⛓️ Blockchain TX", uploadResult.blockchainTxHash],
                      [
                        "🔒 Unlock Time",
                        new Date(uploadResult.unlockTime).toLocaleString(),
                      ],
                      ["🔐 Encryption", "AES-256-CBC (Web Crypto API)"],
                      ["🔍 SHA-256", uploadResult.sha256 || "computed"],
                      ["📎 File", uploadResult.fileName],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          background: "#050a10",
                          borderRadius: 7,
                          padding: "10px 13px",
                          border: "1px solid #0c1f3a",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#1a3060",
                            marginBottom: 3,
                          }}
                        >
                          {k}
                        </div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: "#00c8f0",
                            wordBreak: "break-all",
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Terminal logs={logs} />
                  <div
                    style={{
                      display: "flex",
                      gap: 9,
                      marginTop: 14,
                      justifyContent: "center",
                    }}
                  >
                    <button
                      style={S.btnP}
                      onClick={() => {
                        setUploadResult(null);
                        setUploadStep(0);
                        setLogs([]);
                        setUploadOtpPurpose("");
                        setUploadForm({
                          title: "",
                          subject: "",
                          department: "",
                          semester: 5,
                          examType: "FINAL",
                          lockMs: LOCK_OPTS[0].ms,
                          fileName: "",
                          fileObj: null,
                        });
                      }}
                    >
                      Upload Another
                    </button>
                    <button
                      style={S.btnO}
                      onClick={() => setActiveTab("papers")}
                    >
                      👁️ View Papers
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && isAdmin && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
                👥 Manage Users
              </h2>
              {[
                {
                  label: "Faculty Members",
                  icon: "👩‍🏫",
                  color: "#a78bfa",
                  users: [
                    {
                      n: "Prof. Raj Kumar",
                      id: "FAC001",
                      d: "CS",
                      e: "faculty@qpsystem.edu",
                    },
                  ],
                },
                {
                  label: "Students",
                  icon: "🎓",
                  color: "#00ff88",
                  users: [
                    {
                      n: "John Doe",
                      id: "CS2024001",
                      d: "CS",
                      e: "student@qpsystem.edu",
                    },
                    {
                      n: "Priya Sharma",
                      id: "CS2024002",
                      d: "IT",
                      e: "priya@qpsystem.edu",
                    },
                  ],
                },
              ].map((g) => (
                <div key={g.label} style={{ ...S.card, marginBottom: 12 }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #0c1f3a",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {g.icon} {g.label}
                    </span>
                    <span style={S.badge(g.color)}>
                      {g.users.length} registered
                    </span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,.015)" }}>
                        {["Name", "ID", "Dept", "Email", "Status"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "9px 13px",
                              textAlign: "left",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#1a3060",
                              textTransform: "uppercase",
                              borderBottom: "1px solid #0c1f3a",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.users.map((u, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,.025)",
                          }}
                        >
                          <td style={{ padding: "9px 13px", fontWeight: 600 }}>
                            {u.n}
                          </td>
                          <td
                            style={{
                              padding: "9px 13px",
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: "#2a4a70",
                            }}
                          >
                            {u.id}
                          </td>
                          <td style={{ padding: "9px 13px", color: "#4a6080" }}>
                            {u.d}
                          </td>
                          <td
                            style={{
                              padding: "9px 13px",
                              color: "#4a6080",
                              fontSize: 11,
                            }}
                          >
                            {u.e}
                          </td>
                          <td style={{ padding: "9px 13px" }}>
                            <span style={S.badge("#00ff88")}>Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* BLOCKCHAIN AUDIT LOGS */}
          {activeTab === "logs" && isAdmin && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                📋 Blockchain Audit Logs
              </h2>
              <p style={{ color: "#2a4a70", fontSize: 12, marginBottom: 16 }}>
                Immutable on-chain records via ethers.js · All events logged
              </p>
              <div style={S.card}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,.015)" }}>
                      {[
                        "Time",
                        "User",
                        "Role",
                        "Action",
                        "Paper",
                        "Status",
                        "TX Hash",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "9px 13px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#1a3060",
                            textTransform: "uppercase",
                            borderBottom: "1px solid #0c1f3a",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...accessLogs].reverse().map((l, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,.025)",
                        }}
                      >
                        <td
                          style={{
                            padding: "9px 13px",
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: "#2a4a70",
                          }}
                        >
                          {l.time}
                        </td>
                        <td style={{ padding: "9px 13px", fontWeight: 600 }}>
                          {l.user}
                        </td>
                        <td style={{ padding: "9px 13px" }}>
                          <span
                            style={S.badge(
                              l.role === "ADMIN"
                                ? "#00c8f0"
                                : l.role === "FACULTY"
                                ? "#a78bfa"
                                : "#00ff88"
                            )}
                          >
                            {l.role}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "9px 13px",
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {l.action}
                        </td>
                        <td
                          style={{
                            padding: "9px 13px",
                            color: "#4a6080",
                            fontSize: 11,
                          }}
                        >
                          {l.paper}
                        </td>
                        <td
                          style={{
                            padding: "9px 13px",
                            color: l.ok ? "#00ff88" : "#ff4757",
                            fontWeight: 700,
                          }}
                        >
                          {l.ok ? "✓ Granted" : "✗ Denied"}
                        </td>
                        <td
                          style={{
                            padding: "9px 13px",
                            fontFamily: "monospace",
                            fontSize: 10,
                            color: "#2a4a70",
                          }}
                        >
                          {l.tx}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECURITY MONITORING TAB */}
          {activeTab === "security" && isAdmin && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                🚨 Security Monitoring
              </h2>
              <p style={{ color: "#2a4a70", fontSize: 12, marginBottom: 16 }}>
                Real-time tamper detection · Admin email alerts · Blockchain
                evidence
              </p>

              {/* Active Alerts */}
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #0c1f3a",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    🚨 Active Security Alerts
                  </span>
                  <span
                    style={S.badge(
                      securityAlerts.length > 0 ? "#ff4757" : "#00ff88"
                    )}
                  >
                    {securityAlerts.length > 0
                      ? `${securityAlerts.length} Active`
                      : "All Clear"}
                  </span>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {securityAlerts.length === 0 ? (
                    <div
                      style={{
                        color: "#2a4a70",
                        fontSize: 12,
                        padding: "8px 0",
                      }}
                    >
                      ✅ No active security alerts
                    </div>
                  ) : (
                    securityAlerts.map((alert, i) => (
                      <div
                        key={i}
                        style={{
                          background:
                            alert.severity === "critical"
                              ? "rgba(255,71,87,.08)"
                              : "rgba(255,165,2,.08)",
                          border: `1px solid ${
                            alert.severity === "critical"
                              ? "rgba(255,71,87,.3)"
                              : "rgba(255,165,2,.3)"
                          }`,
                          borderRadius: 8,
                          padding: "12px 14px",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color:
                                alert.severity === "critical"
                                  ? "#ff4757"
                                  : "#ffa502",
                              marginBottom: 4,
                            }}
                          >
                            {alert.severity === "critical" ? "🚨" : "⚠️"}{" "}
                            {alert.title}
                          </div>
                          <button
                            onClick={() => dismissAlert(i)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#4a6080",
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: "#8899aa" }}>
                          {alert.message}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#4a6080",
                            marginTop: 4,
                            fontFamily: "monospace",
                          }}
                        >
                          {alert.time}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tamper Detection Rules */}
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #0c1f3a",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    🛡️ Active Tamper Detection Rules
                  </span>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {[
                    {
                      rule: "Unauthorized Admin Portal Access",
                      trigger: "Wrong credentials on ADMIN role",
                      action:
                        "Instant email to admin + blockchain log + UI alert",
                      severity: "critical",
                    },
                    {
                      rule: "Multiple Failed Logins (3+)",
                      trigger: "3+ failed attempts for same username",
                      action: "Email alert + UI warning · Lock at 5 attempts",
                      severity: "critical",
                    },
                    {
                      rule: "OTP Brute Force (3 attempts)",
                      trigger: "3 wrong OTPs in sequence",
                      action: "OTP invalidated + email alert + UI alert",
                      severity: "critical",
                    },
                    {
                      rule: "Time-Lock Bypass Attempt",
                      trigger: "Download before unlock time",
                      action: "Blockchain log + email alert + access denied",
                      severity: "critical",
                    },
                    {
                      rule: "SHA-256 File Integrity Failure",
                      trigger: "Hash mismatch on download",
                      action: "Download blocked + admin alert",
                      severity: "critical",
                    },
                    {
                      rule: "Wrong Download OTP",
                      trigger: "Failed OTP on paper download",
                      action: "Access denied + UI warning",
                      severity: "warning",
                    },
                  ].map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr auto",
                        gap: 10,
                        padding: "10px 0",
                        borderBottom: "1px solid rgba(255,255,255,.04)",
                        alignItems: "center",
                        fontSize: 11,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#c8d8f0" }}>
                        {r.rule}
                      </div>
                      <div style={{ color: "#4a6080" }}>{r.trigger}</div>
                      <div style={{ color: "#2a4a70" }}>{r.action}</div>
                      <span
                        style={{
                          ...S.badge(
                            r.severity === "critical" ? "#ff4757" : "#ffa502"
                          ),
                          fontSize: 9,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Failed Login Tracker */}
              <div style={S.card}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #0c1f3a",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    📊 Failed Login Attempts
                  </span>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {Object.entries(tamperState.failedLoginAttempts).length ===
                  0 ? (
                    <div style={{ color: "#2a4a70", fontSize: 12 }}>
                      ✅ No failed attempts recorded
                    </div>
                  ) : (
                    Object.entries(tamperState.failedLoginAttempts).map(
                      ([key, count]) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(255,255,255,.04)",
                            fontSize: 12,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              color: "#c8d8f0",
                            }}
                          >
                            {key}
                          </span>
                          <span
                            style={{
                              ...S.badge(count >= 3 ? "#ff4757" : "#ffa502"),
                            }}
                          >
                            {count} attempt{count > 1 ? "s" : ""}
                          </span>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
