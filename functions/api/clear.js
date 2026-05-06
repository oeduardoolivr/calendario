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

        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });
        
        let usersStr = await KV.get("calendar_users");
        let users = usersStr ? JSON.parse(usersStr) : {};
        const [authUser, authPw] = atob(authHeader).split(":");
        
        // Only Robson can access this endpoint
        if (authUser !== "robson" || users[authUser]?.password !== authPw) {
            return new Response("Forbidden: Root access only", { status: 403 });
        }

        if (request.method === "POST") {
            const payload = await request.json();
            const { action, confirmPassword } = payload;

            if (action === "clearAll") {
                if (confirmPassword !== "R545e545!#") {
                    return new Response("Senha de confirmação incorreta", { status: 401 });
                }

                // Clear Calendar Data, Logs and Comments
                await KV.delete("calendar_json");
                await KV.delete("calendar_logs");
                await KV.delete("calendar_comments");

                return new Response("OK", { status: 200 });
            }
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
