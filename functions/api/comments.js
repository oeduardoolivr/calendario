export async function onRequest(context) {
    try {
        const { request, env } = context;
        const KV = env.CALENDAR_DATA;
        const url = new URL(request.url);
        
        if (!KV) {
            return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // GET: Fetch comments for a specific date (Public)
        if (request.method === "GET") {
            const date = url.searchParams.get("date");
            if (!date) return new Response("Missing date", { status: 400 });

            const commentsDataStr = await KV.get("calendar_comments");
            const commentsData = commentsDataStr ? JSON.parse(commentsDataStr) : {};
            const dateComments = commentsData[date] || [];

            return new Response(JSON.stringify(dateComments), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Authentication Check for WRITE/DELETE
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });
        
        const usersStr = await KV.get("calendar_users");
        const users = usersStr ? JSON.parse(usersStr) : {};
        const [authUser, authPw] = atob(authHeader).split(":");
        
        if (!users[authUser] || users[authUser].password !== authPw) {
            return new Response("Forbidden", { status: 403 });
        }

        // POST: Add a new comment (Authenticated Only)
        if (request.method === "POST") {
            const payload = await request.json();
            const { date, text } = payload;

            if (!date || !text) return new Response("Missing date or text", { status: 400 });

            // Fetch user profile for display name
            const userProfile = users[authUser];
            let displayIdentifier = authUser;
            if (userProfile.displayName && userProfile.department) {
                displayIdentifier = `${userProfile.displayName} - ${userProfile.department}`;
            } else if (userProfile.displayName) {
                displayIdentifier = userProfile.displayName;
            }

            let commentsDataStr = await KV.get("calendar_comments");
            let commentsData = commentsDataStr ? JSON.parse(commentsDataStr) : {};
            
            if (!commentsData[date]) commentsData[date] = [];

            const timestamp = new Date().toISOString(); // Synchronized timestamp

            commentsData[date].push({
                user: displayIdentifier,
                timestamp: timestamp,
                text: text.trim()
            });

            if (commentsData[date].length > 50) commentsData[date].shift();
            await KV.put("calendar_comments", JSON.stringify(commentsData));

            // Record in Global Logs
            let logsStr = await KV.get("calendar_logs");
            let logs = logsStr ? JSON.parse(logsStr) : [];
            logs.push({
                type: "comment",
                timestamp: timestamp, // Matches comment timestamp
                date: date,
                user: displayIdentifier,
                text: text.trim()
            });
            if (logs.length > 100) logs.shift();
            await KV.put("calendar_logs", JSON.stringify(logs));

            return new Response("OK", { status: 200 });
        }

        // DELETE: Flag comment as deleted (Admin Only)
        if (request.method === "DELETE") {
            if (!users[authUser].isAdmin) {
                return new Response("Forbidden: Admin only", { status: 403 });
            }

            const payload = await request.json();
            const { date, timestamp } = payload;
            if (!date || !timestamp) return new Response("Missing parameters", { status: 400 });

            // 1. Mark as deleted in comments feed
            let commentsDataStr = await KV.get("calendar_comments");
            let commentsData = commentsDataStr ? JSON.parse(commentsDataStr) : {};
            
            if (commentsData[date]) {
                const commentIdx = commentsData[date].findIndex(c => c.timestamp === timestamp);
                if (commentIdx !== -1) {
                    commentsData[date][commentIdx].isDeleted = true;
                    await KV.put("calendar_comments", JSON.stringify(commentsData));

                    // 2. NEW: Remove from Global Logs
                    let logsStr = await KV.get("calendar_logs");
                    if (logsStr) {
                        let logs = JSON.parse(logsStr);
                        // Filter out the log entry that matches this comment
                        const updatedLogs = logs.filter(l => !(l.type === "comment" && l.date === date && l.timestamp === timestamp));
                        await KV.put("calendar_logs", JSON.stringify(updatedLogs));
                    }

                    return new Response("OK", { status: 200 });
                }
            }
            return new Response("Comment not found", { status: 404 });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
