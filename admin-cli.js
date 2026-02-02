#!/usr/bin/env node
/**
 * Admin CLI for User Management
 *
 * Usage:
 *   node admin-cli.js add <username> <password> [days]  - Add user (default 7 days)
 *   node admin-cli.js remove <username>                  - Remove user
 *   node admin-cli.js list                               - List all users
 *   node admin-cli.js extend <username> <days>           - Extend access
 */

import {
    createUser,
    deleteUser,
    listUsers,
    extendAccess,
    ensureUsersDB
} from "./auth/userManager.js";

const [,, command, ...args] = process.argv;

function printUsage() {
    console.log(`
Admin CLI - User Management
============================

Commands:
  add <username> <password> [days]  - Add a new user (default 7 days)
  remove <username>                  - Remove a user
  list                               - List all users
  extend <username> <days>           - Extend user's access

Examples:
  node admin-cli.js add teacher1 SecurePass123
  node admin-cli.js add workshop2 Pass456 30
  node admin-cli.js list
  node admin-cli.js extend teacher1 14
  node admin-cli.js remove teacher1
`);
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getStatusEmoji(status) {
    switch (status) {
        case "active": return "\u{1F7E2}"; // Green circle
        case "expiring_soon": return "\u{1F7E1}"; // Yellow circle
        case "expired": return "\u{1F534}"; // Red circle
        case "inactive": return "\u26AA"; // White circle
        default: return "\u2753"; // Question mark
    }
}

async function main() {
    await ensureUsersDB();

    if (!command) {
        printUsage();
        process.exit(0);
    }

    switch (command.toLowerCase()) {
        case "add": {
            const [username, password, daysStr] = args;
            if (!username || !password) {
                console.error("Error: Username and password are required");
                console.log("Usage: node admin-cli.js add <username> <password> [days]");
                process.exit(1);
            }

            const days = daysStr ? parseInt(daysStr, 10) : 7;
            if (isNaN(days) || days <= 0) {
                console.error("Error: Days must be a positive number");
                process.exit(1);
            }

            console.log(`Creating user "${username}" with ${days}-day access...`);
            const result = await createUser(username, password, days);

            if (result.success) {
                console.log("\u2705 User created successfully!");
                console.log(`   Username: ${result.user.username}`);
                console.log(`   Expires:  ${formatDate(result.user.expiresAt)}`);
                console.log(`   ID:       ${result.user.id}`);
            } else {
                console.error(`\u274C Error: ${result.error}`);
                process.exit(1);
            }
            break;
        }

        case "remove":
        case "delete": {
            const [username] = args;
            if (!username) {
                console.error("Error: Username is required");
                console.log("Usage: node admin-cli.js remove <username>");
                process.exit(1);
            }

            console.log(`Removing user "${username}"...`);
            const result = await deleteUser(username);

            if (result.success) {
                console.log(`\u2705 User "${username}" removed successfully!`);
            } else {
                console.error(`\u274C Error: ${result.error}`);
                process.exit(1);
            }
            break;
        }

        case "list": {
            const users = await listUsers();

            if (users.length === 0) {
                console.log("No users found. Use 'add' command to create users.");
                break;
            }

            console.log("\nCurrent Users:");
            console.log("==============\n");

            // Print header
            console.log(
                "Username".padEnd(20) +
                "Expires".padEnd(25) +
                "Status".padEnd(15) +
                "Days Left"
            );
            console.log("-".repeat(70));

            for (const user of users) {
                const statusEmoji = getStatusEmoji(user.status);
                const statusText = user.status.replace("_", " ");
                const daysLeft = user.daysUntilExpiry > 0
                    ? `${user.daysUntilExpiry} days`
                    : "Expired";

                console.log(
                    user.username.padEnd(20) +
                    formatDate(user.expiresAt).padEnd(25) +
                    `${statusEmoji} ${statusText}`.padEnd(15) +
                    daysLeft
                );
            }

            console.log(`\nTotal: ${users.length} user(s)`);
            break;
        }

        case "extend": {
            const [username, daysStr] = args;
            if (!username || !daysStr) {
                console.error("Error: Username and days are required");
                console.log("Usage: node admin-cli.js extend <username> <days>");
                process.exit(1);
            }

            const days = parseInt(daysStr, 10);
            if (isNaN(days) || days <= 0) {
                console.error("Error: Days must be a positive number");
                process.exit(1);
            }

            console.log(`Extending access for "${username}" by ${days} days...`);
            const result = await extendAccess(username, days);

            if (result.success) {
                console.log(`\u2705 Access extended successfully!`);
                console.log(`   New expiration: ${formatDate(result.newExpiresAt)}`);
            } else {
                console.error(`\u274C Error: ${result.error}`);
                process.exit(1);
            }
            break;
        }

        case "help":
        case "--help":
        case "-h":
            printUsage();
            break;

        default:
            console.error(`Unknown command: ${command}`);
            printUsage();
            process.exit(1);
    }
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
