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

        // GET: Fetch all sectors
        if (request.method === "GET") {
            let sectorsStr = await KV.get("calendar_sectors");
            let sectors;
            if (!sectorsStr) {
                sectors = getInitialSectors();
                await KV.put("calendar_sectors", JSON.stringify(sectors));
            } else {
                sectors = JSON.parse(sectorsStr);
            }
            return new Response(JSON.stringify(sectors), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // POST: Update all sectors (Admin only)
        if (request.method === "POST") {
            const authHeader = request.headers.get("Authorization");
            if (!authHeader) return new Response("Unauthorized", { status: 401 });
            
            let usersStr = await KV.get("calendar_users");
            let users = usersStr ? JSON.parse(usersStr) : {};
            const [authUser, authPw] = atob(authHeader).split(":");
            
            if (!users[authUser] || users[authUser].password !== authPw || !users[authUser].isAdmin) {
                return new Response("Forbidden", { status: 403 });
            }

            const payload = await request.json();
            if (!Array.isArray(payload)) {
                return new Response("Invalid sectors list", { status: 400 });
            }

            await KV.put("calendar_sectors", JSON.stringify(payload));
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

function getInitialSectors() {
    return [
        { key: "Loja",                label: "Loja Início",           color: "#2979ff" },
        { key: "Hortifruti",          label: "Hortifruti",            color: "#00c853" },
        { key: "Açougue",             label: "Açougue",               color: "#e53935" },
        { key: "Peixaria e F. Favorito", label: "Peixaria e F. Favorito", color: "#00b0ff" },
        { key: "Frios",               label: "Frios",                 color: "#7c4dff" },
        { key: "Terrazzo",            label: "Terrazzo",              color: "#ff6d00" },
        { key: "Especiarias Agranel", label: "Especiarias Agranel",   color: "#f9a825" },
        { key: "Casa de Festa",       label: "Casa de Festa",         color: "#e91e8c" },
        { key: "Feriado",             label: "Feriado",               color: "#546e7a" },
    ];
}
