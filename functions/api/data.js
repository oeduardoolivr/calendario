export async function onRequest(context) {
    try {
        const { request, env } = context;
        const KV = env.CALENDAR_DATA;
        
        if (!KV) {
            return new Response(JSON.stringify({ error: "KV binding 'CALENDAR_DATA' not found." }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        if (request.method === "GET") {
            let data = await KV.get("calendar_json");
            if (!data) {
                data = JSON.stringify(getInitialData());
                await KV.put("calendar_json", data);
            }
            return new Response(data, { headers: { "Content-Type": "application/json" } });
        }
        
        if (request.method === "POST") {
            // Authentication check against KV users
            const authHeader = request.headers.get("Authorization");
            if (!authHeader) return new Response("Unauthorized", { status: 401 });
            
            let usersStr = await KV.get("calendar_users");
            let users = usersStr ? JSON.parse(usersStr) : {};
            
            const [authUser, authPw] = atob(authHeader).split(":");
            if (!users[authUser] || users[authUser].password !== authPw || !users[authUser].isAdmin) {
                return new Response("Forbidden", { status: 403 });
            }
            
            const payload = await request.json();
            const { date, sector, user, oldSector } = payload;
            
            if (!date) return new Response("Missing date", { status: 400 });

            // Fetch user profile for display name in logs
            const userProfile = users[authUser];
            let displayIdentifier = authUser;
            if (userProfile.displayName && userProfile.department) {
                displayIdentifier = `${userProfile.displayName} - ${userProfile.department}`;
            } else if (userProfile.displayName) {
                displayIdentifier = userProfile.displayName;
            }
            
            let dataStr = await KV.get("calendar_json");
            let data = dataStr ? JSON.parse(dataStr) : {};
            
            if (sector) { data[date] = sector; } else { delete data[date]; }
            await KV.put("calendar_json", JSON.stringify(data));
            
            // Register Detailed Log
            let logsStr = await KV.get("calendar_logs");
            let logs = logsStr ? JSON.parse(logsStr) : [];
            logs.push({
                type: "sector",
                timestamp: new Date().toISOString(),
                date: date,
                sector: sector || "(Vazio)",
                user: displayIdentifier,
                oldSector: oldSector || "(Vazio)"
            });
            if (logs.length > 100) logs.shift();
            await KV.put("calendar_logs", JSON.stringify(logs));
            
            return new Response("OK", { status: 200 });
        }
        
        return new Response("Method not allowed", { status: 405 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

function getInitialData() {
    return {
        "2026-05-01": "Feriado",
        "2026-05-04": "Terrazzo",
        "2026-05-05": "Casa de Festa",
        "2026-05-11": "Loja",
        "2026-05-18": "Hortifruti",
        "2026-05-19": "Peixaria",
        "2026-05-20": "Frios",
        "2026-05-25": "Açougue",
        "2026-05-29": "Especiarias"
    };
}
