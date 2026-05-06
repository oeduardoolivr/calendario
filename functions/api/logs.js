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
        
        if (request.method !== "GET") {
            return new Response("Method not allowed", { status: 405 });
        }
        
        let logsStr = await KV.get("calendar_logs");
        let logs = logsStr ? JSON.parse(logsStr) : [];
        
        return new Response(JSON.stringify(logs), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
