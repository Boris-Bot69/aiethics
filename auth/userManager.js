import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_DB_PATH = path.join(__dirname, "..", "users_db.json");
const SALT_ROUNDS = 10;

/**
 * Ensure the users database file exists
 */
export async function ensureUsersDB() {
    try {
        await fs.access(USERS_DB_PATH);
    } catch {
        await fs.writeFile(USERS_DB_PATH, JSON.stringify([], null, 2), "utf-8");
    }
}

/**
 * Read all users from the database
 */
async function readUsers() {
    await ensureUsersDB();
    const content = await fs.readFile(USERS_DB_PATH, "utf-8");
    return JSON.parse(content);
}

/**
 * Write users to the database
 */
async function writeUsers(users) {
    await fs.writeFile(USERS_DB_PATH, JSON.stringify(users, null, 2), "utf-8");
}

/**
 * Create a new user with hashed password
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @param {number} expirationDays - Days until access expires (default 7)
 * @param {string} createdBy - Who created this user (default "admin")
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function createUser(username, password, expirationDays = 7, createdBy = "admin") {
    const users = await readUsers();

    // Check if username already exists
    const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
        return { success: false, error: "Username already exists" };
    }

    // Validate inputs
    if (!username || username.length < 3) {
        return { success: false, error: "Username must be at least 3 characters" };
    }
    if (!password || password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters" };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

    const newUser = {
        id: uuidv4(),
        username,
        passwordHash,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdBy,
        active: true
    };

    users.push(newUser);
    await writeUsers(users);

    // Return user without password hash
    const { passwordHash: _, ...safeUser } = newUser;
    return { success: true, user: safeUser };
}

/**
 * Validate user credentials and check expiration
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<{valid: boolean, username?: string, expiresAt?: string, remainingMs?: number, error?: string}>}
 */
export async function validateUser(username, password) {
    const users = await readUsers();

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return { valid: false, error: "Invalid username or password" };
    }

    if (!user.active) {
        return { valid: false, error: "Account is deactivated" };
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
        return { valid: false, error: "Invalid username or password" };
    }

    const now = new Date();
    const expiresAt = new Date(user.expiresAt);

    if (now > expiresAt) {
        return { valid: false, error: "Account has expired. Please contact administrator." };
    }

    const remainingMs = expiresAt.getTime() - now.getTime();

    return {
        valid: true,
        username: user.username,
        expiresAt: user.expiresAt,
        remainingMs
    };
}

/**
 * Delete a user by username
 * @param {string} username - Username to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteUser(username) {
    const users = await readUsers();

    const index = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (index === -1) {
        return { success: false, error: "User not found" };
    }

    users.splice(index, 1);
    await writeUsers(users);

    return { success: true };
}

/**
 * List all users (without password hashes)
 * @returns {Promise<Array<object>>}
 */
export async function listUsers() {
    const users = await readUsers();

    return users.map(user => {
        const { passwordHash, ...safeUser } = user;

        // Add status field
        const now = new Date();
        const expiresAt = new Date(user.expiresAt);
        const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

        let status;
        if (!user.active) {
            status = "inactive";
        } else if (now > expiresAt) {
            status = "expired";
        } else if (daysUntilExpiry <= 2) {
            status = "expiring_soon";
        } else {
            status = "active";
        }

        return { ...safeUser, status, daysUntilExpiry: Math.ceil(daysUntilExpiry) };
    });
}

/**
 * Extend a user's access by a number of days
 * @param {string} username - Username
 * @param {number} days - Number of days to extend
 * @returns {Promise<{success: boolean, newExpiresAt?: string, error?: string}>}
 */
export async function extendAccess(username, days) {
    const users = await readUsers();

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return { success: false, error: "User not found" };
    }

    if (days <= 0) {
        return { success: false, error: "Days must be positive" };
    }

    // Extend from current expiration or from now if already expired
    const currentExpiry = new Date(user.expiresAt);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;

    const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    user.expiresAt = newExpiresAt.toISOString();
    user.active = true; // Reactivate if extending

    await writeUsers(users);

    return { success: true, newExpiresAt: user.expiresAt };
}

/**
 * Get a single user by username (without password hash)
 * @param {string} username - Username
 * @returns {Promise<object|null>}
 */
export async function getUser(username) {
    const users = await readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

/**
 * Deactivate a user (soft delete)
 * @param {string} username - Username
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deactivateUser(username) {
    const users = await readUsers();

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return { success: false, error: "User not found" };
    }

    user.active = false;
    await writeUsers(users);

    return { success: true };
}
